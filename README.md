# WeatherStation

Dockerized weather station dashboard with wind visualization, air quality,
calendar events, and a 6-day forecast.

## Features
- OpenWeatherMap geocoding + current/forecast data
- Current position (lat/lon + country)
- Windy map embed with configurable layer/zoom
- Air quality (AQI) from OpenWeatherMap
- Calendar events from iCal feed
- 6-day forecast summary

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

```yaml
services:
  weatherstation:
    image: ghcr.io/racoon80/weatherstation:latest
    restart: always
    ports:
      - "3001:3001"
    environment:
      # Set your OpenWeatherMap API key here.
      - OPENWEATHER_API_KEY=your_api_key_here
      - DEFAULT_CITY=Luxembourg
      - DEFAULT_COUNTRY=LU
      - WINDY_API_KEY=your_windy_key_here
      - WINDY_ZOOM=6
      - WINDY_SHOWLAYER=rain
      - ICAL_URL=your_ical_url_here
      - MAXIMUM_ENTRIES=8
    volumes:
      - /mnt/user/appdata/WeatherStation:/app/config
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "node -e \"fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""
        ]
      interval: 30s
      timeout: 5s
      retries: 3

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
  daily view. If fewer than 6 days are available, placeholders fill the rest.
