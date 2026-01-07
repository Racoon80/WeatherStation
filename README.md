# WeatherStation

Dockerized weather station that pulls data from OpenWeatherMap and renders a
single-page dashboard with the current position, wind direction, and a 7-day
forecast.

## Features
- OpenWeatherMap geocoding + One Call 3.0 API
- Current position (lat/lon + country)
- Wind direction compass and speed
- 7-day forecast summary

## Requirements
- OpenWeatherMap API key with access to the One Call 3.0 endpoint

## Run with Docker

1. Edit `/mnt/user/appdata/COMPOSE/WeatherStation/docker-compose.yml` and set
   `OPENWEATHER_API_KEY`.

2. Start the container:

```bash
docker compose -f /mnt/user/appdata/COMPOSE/WeatherStation/docker-compose.yml up --build
```

3. Open `http://localhost:3001`

## Run locally

```bash
npm install
OPENWEATHER_API_KEY=your_key_here npm start
```

## Configuration

Environment variables:
- `OPENWEATHER_API_KEY` (required)
- `DEFAULT_CITY` (default: Luxembourg)
- `DEFAULT_COUNTRY` (default: LU)
- `OPENWEATHER_API_KEY_FILE` (default: `/app/config/openweather.key`)

If you don't want to set the key in `docker-compose.yml`, create a file at
`/mnt/user/appdata/WeatherStation/openweather.key` (because `/app/config` is
mapped to that host path) and put the key on a single line.

## Settings page

You can store an OpenWeatherMap API key in the browser at `/settings.html`. The
dashboard will send that key with each request, overriding the server default.

## Notes
- The 7-day forecast uses OpenWeatherMap One Call 2.5 to avoid paid-tier
  requirements.
