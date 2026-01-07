const path = require("path");
const express = require("express");

const app = express();
const port = process.env.PORT || 3001;

const apiKey = process.env.OPENWEATHER_API_KEY;
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
    const activeKey = requestKey || apiKey;

    if (!activeKey) {
      return res.status(500).json({ error: "Missing OPENWEATHER_API_KEY" });
    }

    const city = (req.query.city || defaultCity).toString();
    const country = (req.query.country || defaultCountry).toString();
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

    const oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&units=metric&appid=${activeKey}`;
    const weatherResp = await fetch(oneCallUrl);
    if (!weatherResp.ok) {
      return res.status(weatherResp.status).json({ error: "Weather fetch failed" });
    }

    const weather = await weatherResp.json();

    res.json({
      location: {
        name: loc.name,
        country: loc.country,
        lat,
        lon
      },
      current: weather.current,
      daily: weather.daily ? weather.daily.slice(0, 7) : []
    });
  } catch (err) {
    res.status(500).json({ error: "Unexpected server error" });
  }
});

app.listen(port, () => {
  console.log(`WeatherStation listening on ${port}`);
});
