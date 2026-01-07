const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
const port = process.env.PORT || 3001;

const apiKey = process.env.OPENWEATHER_API_KEY;
const configKeyPath =
  process.env.OPENWEATHER_API_KEY_FILE || "/app/config/openweather.key";

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

app.listen(port, () => {
  console.log(`WeatherStation listening on ${port}`);
});
