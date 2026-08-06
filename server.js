const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
const port = process.env.PORT || 3001;

const apiKey = process.env.OPENWEATHER_API_KEY;
const configKeyPath =
  process.env.OPENWEATHER_API_KEY_FILE || "/app/config/openweather.key";
const calendarMax = (() => {
  const parsed = parseInt(process.env.MAXIMUM_ENTRIES || "8", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : 8;
})();

// The calendar feed is fetched server-side, so a hostile or mistyped ICAL_URL
// would let an anonymous visitor aim a request at anything the container can
// reach. Validate the scheme once at startup rather than per request.
const calendarUrl = (() => {
  const raw = process.env.ICAL_URL;
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") {
      console.error(`ICAL_URL must be https, ignoring: ${parsed.protocol}//…`);
      return "";
    }
    return parsed.toString();
  } catch (err) {
    console.error("ICAL_URL is not a valid URL, calendar disabled");
    return "";
  }
})();

// Cached so a request flood cannot hammer the event loop with sync FS reads.
// The TTL still picks up a rotated key file without a restart.
const KEY_CACHE_TTL_MS = 60000;
let keyCache = { value: "", expires: 0 };

const readKeyFromFile = () => {
  const now = Date.now();
  if (now < keyCache.expires) {
    return keyCache.value;
  }
  let value = "";
  try {
    value = fs.readFileSync(configKeyPath, "utf8").trim();
  } catch (err) {
    // A missing file is the normal case when the key comes from the env.
    // Anything else (typically EACCES, since the container runs as `node`
    // and the key file is bind-mounted from the host) is an operator error
    // that would otherwise surface only as "Missing OPENWEATHER_API_KEY".
    if (err.code !== "ENOENT") {
      console.error(
        `Cannot read API key file ${configKeyPath}: ${err.code || err.message}`
      );
    }
    value = "";
  }
  // Short negative TTL so dropping the key file into the mounted volume takes
  // effect within seconds instead of a full minute of 500s.
  keyCache = { value, expires: now + (value ? KEY_CACHE_TTL_MS : 5000) };
  return value;
};

const resolveKey = () => apiKey || readKeyFromFile();

const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 1024 * 1024;

const fetchUpstream = (url, options = {}) =>
  fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), ...options });

// Reads a response body but aborts once it exceeds maxBytes, so an oversized
// or hostile feed cannot exhaust the container's memory.
const readTextCapped = async (resp, maxBytes = MAX_BODY_BYTES) => {
  const declared = Number(resp.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error("Response too large");
  }
  const reader = resp.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error("Response too large");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
};

const readJsonCapped = async (resp) => JSON.parse(await readTextCapped(resp));

// Upstream status codes are never forwarded: mirroring them would turn these
// endpoints into an oracle that reports whether a given key or host is valid.
const UPSTREAM_FAILED = 502;

const FORECAST_DAYS = 6;

const defaultCity = process.env.DEFAULT_CITY || "Luxembourg";
const defaultCountry = process.env.DEFAULT_COUNTRY || "LU";

// One /api/weather hit costs three upstream calls, so an unthrottled loop
// burns the free-tier quota in seconds. Fixed-window limiter, no dependency.
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 60;
const rateBuckets = new Map();

const rateLimit = (req, res, next) => {
  const now = Date.now();
  const ip = req.ip || "unknown";
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.reset) {
    rateBuckets.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
  } else if (bucket.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests" });
  } else {
    bucket.count += 1;
  }
  // Bounded cleanup so a spoofed-IP flood cannot grow the map without limit.
  if (rateBuckets.size > 5000) {
    for (const [key, value] of rateBuckets) {
      if (now > value.reset) rateBuckets.delete(key);
    }
  }
  return next();
};

// Responses change at most every few minutes upstream; caching protects both
// the API quota and the calendar provider from repeated dashboard refreshes.
const cacheStore = new Map();

const cached = async (key, ttlMs, producer) => {
  const now = Date.now();
  const hit = cacheStore.get(key);
  if (hit && now < hit.expires) {
    return hit.value;
  }
  const value = await producer();
  cacheStore.set(key, { value, expires: now + ttlMs });
  if (cacheStore.size > 200) {
    for (const [k, v] of cacheStore) {
      if (now > v.expires) cacheStore.delete(k);
    }
  }
  return value;
};

const WEATHER_TTL_MS = 5 * 60 * 1000;
const AIR_TTL_MS = 10 * 60 * 1000;
const CALENDAR_TTL_MS = 5 * 60 * 1000;

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      "img-src 'self' data:",
      "frame-src https://embed.windy.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "object-src 'none'"
    ].join("; ")
  );
  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", rateLimit);

app.get("/api/weather", async (req, res) => {
  try {
    const activeKey = resolveKey();
    if (!activeKey) {
      return res
        .status(500)
        .json({ error: "Missing OPENWEATHER_API_KEY" });
    }

    const city = (req.query.city || defaultCity).toString().trim();
    const country = (req.query.country || defaultCountry).toString().trim();
    const lang = (req.query.lang || "").toString().trim();

    if (!city || city.length > 64) {
      return res.status(400).json({ error: "Invalid city" });
    }
    if (!/^[A-Za-z]{2}$/.test(country)) {
      return res.status(400).json({ error: "Invalid country" });
    }
    if (lang && !/^[a-z]{2}$/.test(lang)) {
      return res.status(400).json({ error: "Invalid lang" });
    }

    const payload = await cached(
      `weather:${city.toLowerCase()}:${country.toLowerCase()}:${lang}`,
      WEATHER_TTL_MS,
      async () => {
        const appid = encodeURIComponent(activeKey);
        const query = encodeURIComponent(`${city},${country}`);

        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=1&appid=${appid}`;
        const geoResp = await fetchUpstream(geoUrl);
        if (!geoResp.ok) {
          throw Object.assign(new Error("Geocoding failed"), {
            status: UPSTREAM_FAILED
          });
        }
        const geo = await readJsonCapped(geoResp);
        if (!geo.length) {
          throw Object.assign(new Error("Location not found"), { status: 404 });
        }

        const loc = geo[0];
        const lat = loc.lat;
        const lon = loc.lon;

        const langParam = lang ? `&lang=${encodeURIComponent(lang)}` : "";
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${appid}${langParam}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${appid}${langParam}`;

        const [currentResp, forecastResp] = await Promise.all([
          fetchUpstream(currentUrl),
          fetchUpstream(forecastUrl)
        ]);

        if (!currentResp.ok || !forecastResp.ok) {
          throw Object.assign(new Error("Weather fetch failed"), {
            status: UPSTREAM_FAILED
          });
        }

        const current = await readJsonCapped(currentResp);
        const forecast = await readJsonCapped(forecastResp);

        const timezoneOffset = forecast.city?.timezone || 0;
        const byDay = new Map();

        for (const item of forecast.list || []) {
          const localTs = (item.dt + timezoneOffset) * 1000;
          const dayKey = new Date(localTs).toISOString().slice(0, 10);
          const entry = byDay.get(dayKey) || {
            dt: item.dt,
            date: dayKey,
            min: item.main.temp_min,
            max: item.main.temp_max,
            midday: null,
            middayHour: null,
            samples: []
          };

          entry.min = Math.min(entry.min, item.main.temp_min);
          entry.max = Math.max(entry.max, item.main.temp_max);
          entry.samples.push(item);

          // Closest-to-noon, not exactly noon: the API emits slots on UTC
          // multiples of 3h, so an offset like Luxembourg's +1/+2 never
          // produces a local hour of 12 and every day would fall back to the
          // ~01:00 sample — i.e. a night icon on every tile.
          const hour = new Date(localTs).getUTCHours();
          if (
            entry.midday === null ||
            Math.abs(hour - 12) < Math.abs(entry.middayHour - 12)
          ) {
            entry.midday = item;
            entry.middayHour = hour;
          }

          byDay.set(dayKey, entry);
        }

        const daily = Array.from(byDay.values())
          .sort((a, b) => a.dt - b.dt)
          .slice(0, FORECAST_DAYS)
          .map((entry) => {
            const pick = entry.midday || entry.samples[0];
            return {
              dt: entry.dt,
              date: entry.date,
              temp: {
                min: entry.min,
                max: entry.max
              },
              weather: pick?.weather || []
            };
          });

        if (daily.length < FORECAST_DAYS) {
          const nowSec = Math.floor(Date.now() / 1000);
          const base = daily.length
            ? daily[daily.length - 1].dt
            : current.dt || nowSec;
          const startLen = daily.length;
          for (let i = startLen; i < FORECAST_DAYS; i += 1) {
            const dt = base + 86400 * (i - startLen + 1);
            daily.push({
              dt,
              date: new Date((dt + timezoneOffset) * 1000)
                .toISOString()
                .slice(0, 10),
              temp: {},
              weather: [],
              // Without this the client styles an unknown day as clear+sunny.
              placeholder: true
            });
          }
        }

        return {
          location: {
            name: loc.name,
            country: loc.country,
            lat,
            lon
          },
          current: {
            dt: current.dt,
            wind_speed: current.wind?.speed,
            wind_deg: current.wind?.deg
          },
          daily,
          windyKey: process.env.WINDY_API_KEY || "",
          windyZoom: process.env.WINDY_ZOOM || "",
          windyLayer: process.env.WINDY_SHOWLAYER || "wind",
          windyRotate: process.env.WINDY_ROTATELAYERS || "",
          windyLayers: process.env.WINDY_LAYERSTOROTATE || "",
          windyDelay: process.env.WINDY_DELAYROTATE || ""
        };
      }
    );

    res.json(payload);
  } catch (err) {
    console.error(`/api/weather failed: ${err.message}`);
    res
      .status(err.status || 500)
      .json({ error: err.status === 404 ? "Location not found" : "Weather unavailable" });
  }
});

app.get("/api/airquality", async (req, res) => {
  try {
    const activeKey = resolveKey();
    if (!activeKey) {
      return res.status(500).json({ error: "Missing OPENWEATHER_API_KEY" });
    }
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || Math.abs(lat) > 90) {
      return res.status(400).json({ error: "Invalid lat" });
    }
    if (!Number.isFinite(lon) || Math.abs(lon) > 180) {
      return res.status(400).json({ error: "Invalid lon" });
    }

    const payload = await cached(
      `air:${lat.toFixed(2)}:${lon.toFixed(2)}`,
      AIR_TTL_MS,
      async () => {
        const appid = encodeURIComponent(activeKey);
        const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${appid}`;
        const resp = await fetchUpstream(url);
        if (!resp.ok) {
          throw Object.assign(new Error("Air quality fetch failed"), {
            status: UPSTREAM_FAILED
          });
        }
        const data = await readJsonCapped(resp);
        const current = data.list?.[0];
        return {
          aqi: current?.main?.aqi ?? null,
          components: current?.components || {}
        };
      }
    );

    res.json(payload);
  } catch (err) {
    console.error(`/api/airquality failed: ${err.message}`);
    res.status(err.status || 500).json({ error: "Air quality unavailable" });
  }
});

// Resolves a wall-clock time in a named IANA zone to a real instant. Needed
// because DTSTART;TZID=Europe/Luxembourg:...T090000 must not be read in the
// container's timezone (which is UTC), or every timed event shifts by 1-2h.
const zonedTimeToUtc = (parts, tzid) => {
  const asUtc = Date.UTC(...parts);
  if (!tzid) return new Date(asUtc);
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tzid,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const f = {};
    for (const { type, value } of dtf.formatToParts(new Date(asUtc))) {
      f[type] = Number(value);
    }
    const shifted = Date.UTC(
      f.year,
      f.month - 1,
      f.day,
      f.hour % 24,
      f.minute,
      f.second
    );
    return new Date(asUtc - (shifted - asUtc));
  } catch (err) {
    // Unknown TZID: fall back to treating the value as UTC.
    return new Date(asUtc);
  }
};

const parseICalDate = (value, tzid) => {
  if (!value) return null;
  const cleaned = value.replace(/Z$/, "");
  if (/^\d{8}$/.test(cleaned)) {
    const year = Number(cleaned.slice(0, 4));
    const month = Number(cleaned.slice(4, 6)) - 1;
    const day = Number(cleaned.slice(6, 8));
    return new Date(Date.UTC(year, month, day));
  }
  if (/^\d{8}T\d{6}$/.test(cleaned)) {
    const parts = [
      Number(cleaned.slice(0, 4)),
      Number(cleaned.slice(4, 6)) - 1,
      Number(cleaned.slice(6, 8)),
      Number(cleaned.slice(9, 11)),
      Number(cleaned.slice(11, 13)),
      Number(cleaned.slice(13, 15))
    ];
    // A trailing Z is absolute; otherwise the TZID parameter decides, and a
    // floating time with neither is treated as UTC.
    return value.endsWith("Z")
      ? new Date(Date.UTC(...parts))
      : zonedTimeToUtc(parts, tzid);
  }
  return null;
};

// RFC 5545 §3.3.11 escaping: \\ \; \, and \n / \N for a line break.
const unescapeText = (value) =>
  value.replace(/\\([\\;,nN])/g, (_, ch) =>
    ch === "n" || ch === "N" ? "\n" : ch
  );

// Splits "NAME;PARAM=\"a:b\":value" on the first colon outside double quotes.
const splitProperty = (line) => {
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ":" && !inQuotes) {
      return [line.slice(0, i), line.slice(i + 1)];
    }
  }
  return [line, ""];
};

const getParam = (rawKey, name) => {
  const match = rawKey.split(";").find((p) => p.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1).replace(/^"|"$/g, "") : "";
};

// Guards against a feed with tens of thousands of events blocking the loop.
const MAX_ICAL_EVENTS = 5000;

const parseICal = (text) => {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const events = [];
  let current = null;
  // Depth of nested components (VALARM). Their properties must not leak into
  // the event — an ACTION:EMAIL alarm carries its own mandatory SUMMARY, which
  // would otherwise replace the event title.
  let depth = 0;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT" && !current) {
      current = {};
      depth = 0;
      continue;
    }
    if (line === "END:VEVENT" && current && depth === 0) {
      if (current.start && current.summary && current.status !== "CANCELLED") {
        events.push(current);
        if (events.length >= MAX_ICAL_EVENTS) break;
      }
      current = null;
      continue;
    }
    if (!current) continue;
    if (line.startsWith("BEGIN:")) {
      depth += 1;
      continue;
    }
    if (line.startsWith("END:")) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth > 0) continue;

    const [rawKey, rawValue] = splitProperty(line);
    const value = rawValue.trim();
    const key = rawKey.split(";")[0];
    if (key === "SUMMARY") {
      current.summary = unescapeText(value);
    }
    if (key === "STATUS") {
      current.status = value.toUpperCase();
    }
    if (key === "DTSTART") {
      current.start = parseICalDate(value, getParam(rawKey, "TZID"));
      current.allDay = /^\d{8}$/.test(value);
    }
    if (key === "DTEND") {
      current.end = parseICalDate(value, getParam(rawKey, "TZID"));
    }
  }
  return events;
};

app.get("/api/calendar", async (_req, res) => {
  try {
    if (!calendarUrl) {
      return res.json({ events: [] });
    }

    const payload = await cached("calendar", CALENDAR_TTL_MS, async () => {
      // redirect: "manual" — whoever controls the feed host must not be able
      // to bounce this request onto an internal address (SSRF).
      const resp = await fetchUpstream(calendarUrl, { redirect: "manual" });
      if (!resp.ok) {
        throw Object.assign(new Error(`Calendar fetch failed (${resp.status})`), {
          status: UPSTREAM_FAILED
        });
      }
      const text = await readTextCapped(resp);
      const events = parseICal(text);
      // Compare against the end, not the start: filtering on start alone drops
      // today's all-day events at 00:00 UTC and hides events while they run.
      const now = Date.now();
      const endsAt = (event) => {
        if (event.end) return event.end.getTime();
        if (event.allDay) return event.start.getTime() + 86400000;
        return event.start.getTime();
      };
      const upcoming = events
        .filter((event) => endsAt(event) >= now)
        .sort((a, b) => a.start - b.start)
        .slice(0, calendarMax);

      return {
        events: upcoming.map((event) => ({
          summary: event.summary,
          start: event.start ? event.start.toISOString() : null,
          end: event.end ? event.end.toISOString() : null,
          allDay: Boolean(event.allDay)
        }))
      };
    });

    res.json(payload);
  } catch (err) {
    console.error(`/api/calendar failed: ${err.message}`);
    res.status(err.status || 500).json({ error: "Calendar unavailable" });
  }
});

// The client always parses the response as JSON, so unmatched API paths must
// not fall through to Express's default HTML 404.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Catch-all so a malformed request (e.g. bad percent-encoding hitting
// express.static) cannot return a stack trace to the client.
app.use((err, _req, res, _next) => {
  console.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: "Internal error" });
});

// Guarded so the app can be require()'d by a test without binding a port.
if (require.main === module) {
  app.listen(port, () => {
    console.log(`WeatherStation listening on ${port}`);
  });
}

module.exports = app;
