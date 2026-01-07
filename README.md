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
   `OPENWEATHER_API_KEY`, `WINDY_API_KEY`, and (optionally) `WINDY_ZOOM`.

2. Start the container:

```bash
docker compose -f /mnt/user/appdata/COMPOSE/WeatherStation/docker-compose.yml up --build
```

## Docker Compose file

The compose file lives outside the repo at:

`/mnt/user/appdata/COMPOSE/WeatherStation/docker-compose.yml`

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
- `WINDY_API_KEY` (optional, enables Windy embed)
- `WINDY_ZOOM` (default: `6`)
- `WINDY_SHOWLAYER` (default: `wind`)
- `ICAL_URL` (required for calendar events)
- `MAXIMUM_ENTRIES` (default: `8`)

If you don't want to set the key in `docker-compose.yml`, create a file at
`/mnt/user/appdata/WeatherStation/openweather.key` (because `/app/config` is
mapped to that host path) and put the key on a single line.

## Modules used

- Windy embed (via MMM-WindyV3): https://github.com/jhogendorn/MMM-WindyV3/
- Calendar (MagicMirror default): https://github.com/MagicMirrorOrg/MagicMirror/tree/master/modules/default/calendar
- Air quality: https://github.com/PierreGode/MMM-airquality

## Notes
- The forecast uses the free 5-day/3-hour endpoint and summarizes it into a
  daily view. If fewer than 7 days are available, placeholders fill the rest.
