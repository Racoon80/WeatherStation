const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
const port = process.env.PORT || 3001;

const apiKey = process.env.OPENWEATHER_API_KEY;
const configKeyPath =
  process.env.OPENWEATHER_API_KEY_FILE || "/app/config/openweather.key";
const calendarUrl = process.env.ICAL_URL;
const calendarMax = parseInt(process.env.MAXIMUM_ENTRIES || "10", 10);

const readKeyFromFile = () => {
  try {
    if (!fs.existsSync(configKeyPath)) {
      return "";
    }
    return fs.readFileSync(configKeyPath, "utf8").trim();
  } catch (err) {
    return "";
  }
};
const defaultCity = process.env.DEFAULT_CITY || "Luxembourg";
const defaultCountry = process.env.DEFAULT_COUNTRY || "LU";

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/weather", async (req, res) => {
  try {
    const requestKey =
      req.get("x-owm-key") || (req.query.apiKey || "").toString();
    const fileKey = readKeyFromFile();
    const activeKey = requestKey || apiKey || fileKey;

    if (!activeKey) {
      return res
        .status(500)
        .json({ error: "Missing OPENWEATHER_API_KEY" });
    }

    const city = (req.query.city || defaultCity).toString();
    const country = (req.query.country || defaultCountry).toString();
    const lang = (req.query.lang || "").toString();
    const query = encodeURIComponent(`${city},${country}`);

    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=1&appid=${activeKey}`;
    const geoResp = await fetch(geoUrl);
    if (!geoResp.ok) {
      return res.status(geoResp.status).json({ error: "Geocoding failed" });
    }
    const geo = await geoResp.json();
    if (!geo.length) {
      return res.status(404).json({ error: "Location not found" });
    }

    const loc = geo[0];
    const lat = loc.lat;
    const lon = loc.lon;

    const langParam = lang ? `&lang=${encodeURIComponent(lang)}` : "";
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${activeKey}${langParam}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${activeKey}${langParam}`;

    const [currentResp, forecastResp] = await Promise.all([
      fetch(currentUrl),
      fetch(forecastUrl)
    ]);

    if (!currentResp.ok) {
      return res
        .status(currentResp.status)
        .json({ error: "Current weather fetch failed" });
    }
    if (!forecastResp.ok) {
      return res
        .status(forecastResp.status)
        .json({ error: "Forecast fetch failed" });
    }

    const current = await currentResp.json();
    const forecast = await forecastResp.json();

    const timezoneOffset = forecast.city?.timezone || 0;
    const byDay = new Map();

    for (const item of forecast.list || []) {
      const localTs = (item.dt + timezoneOffset) * 1000;
      const dayKey = new Date(localTs).toISOString().slice(0, 10);
      const entry = byDay.get(dayKey) || {
        dt: item.dt,
        min: item.main.temp_min,
        max: item.main.temp_max,
        midday: null,
        samples: []
      };

      entry.min = Math.min(entry.min, item.main.temp_min);
      entry.max = Math.max(entry.max, item.main.temp_max);
      entry.samples.push(item);

      const hour = new Date(localTs).getUTCHours();
      if (hour === 12) {
        entry.midday = item;
      }

      byDay.set(dayKey, entry);
    }

    const daily = Array.from(byDay.values())
      .sort((a, b) => a.dt - b.dt)
      .slice(0, 6)
      .map((entry) => {
        const pick = entry.midday || entry.samples[0];
        return {
          dt: entry.dt,
          temp: {
            min: entry.min,
            max: entry.max
          },
          weather: pick?.weather || []
        };
      });

    if (daily.length < 6) {
      const base = daily.length ? daily[daily.length - 1].dt : current.dt;
      const startLen = daily.length;
      for (let i = startLen; i < 6; i += 1) {
        daily.push({
          dt: base + 86400 * (i - startLen + 1),
          temp: {},
          weather: []
        });
      }
    }

    res.json({
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
      windyRotate: process.env.WINDY_ROTATELAYERS || "",
      windyLayers: process.env.WINDY_LAYERSTOROTATE || "",
      windyDelay: process.env.WINDY_DELAYROTATE || ""
    });
  } catch (err) {
    res.status(500).json({ error: "Unexpected server error" });
  }
});

app.get("/api/airquality", async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENWEATHER_API_KEY" });
    }
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "Missing lat/lon" });
    }
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(resp.status).json({ error: "Air quality fetch failed" });
    }
    const data = await resp.json();
    const current = data.list?.[0];
    res.json({
      aqi: current?.main?.aqi ?? null,
      components: current?.components || {}
    });
  } catch (err) {
    res.status(500).json({ error: "Unexpected server error" });
  }
});

const parseICalDate = (value) => {
  if (!value) return null;
  const cleaned = value.replace("Z", "");
  if (/^\d{8}$/.test(cleaned)) {
    const year = Number(cleaned.slice(0, 4));
    const month = Number(cleaned.slice(4, 6)) - 1;
    const day = Number(cleaned.slice(6, 8));
    return new Date(Date.UTC(year, month, day));
  }
  if (/^\d{8}T\d{6}$/.test(cleaned)) {
    const year = Number(cleaned.slice(0, 4));
    const month = Number(cleaned.slice(4, 6)) - 1;
    const day = Number(cleaned.slice(6, 8));
    const hour = Number(cleaned.slice(9, 11));
    const min = Number(cleaned.slice(11, 13));
    const sec = Number(cleaned.slice(13, 15));
    return value.endsWith("Z")
      ? new Date(Date.UTC(year, month, day, hour, min, sec))
      : new Date(year, month, day, hour, min, sec);
  }
  return null;
};

const parseICal = (text) => {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current && current.start && current.summary) {
        events.push(current);
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const [rawKey, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const key = rawKey.split(";")[0];
    if (key === "SUMMARY") {
      current.summary = value;
    }
    if (key === "DTSTART") {
      current.start = parseICalDate(value);
      current.allDay = /^\d{8}$/.test(value);
    }
    if (key === "DTEND") {
      current.end = parseICalDate(value);
    }
  }
  return events;
};

app.get("/api/calendar", async (_req, res) => {
  try {
    if (!calendarUrl) {
      return res.json({ events: [] });
    }
    const resp = await fetch(calendarUrl);
    if (!resp.ok) {
      return res.status(resp.status).json({ error: "Calendar fetch failed" });
    }
    const text = await resp.text();
    const events = parseICal(text);
    const now = new Date();
    const upcoming = events
      .filter((event) => event.start >= now)
      .sort((a, b) => a.start - b.start)
      .slice(0, calendarMax);

    res.json({
      events: upcoming.map((event) => ({
        summary: event.summary,
        start: event.start ? event.start.toISOString() : null,
        end: event.end ? event.end.toISOString() : null,
        allDay: Boolean(event.allDay)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: "Calendar parse failed" });
  }
});

app.listen(port, () => {
  console.log(`WeatherStation listening on ${port}`);
});
