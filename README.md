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
- A free OpenWeatherMap API key. Only free-tier endpoints are used
  (`geo/1.0/direct`, `data/2.5/weather`, `data/2.5/forecast`,
  `data/2.5/air_pollution`) — One Call 3.0 is **not** required.

## Run with Docker

1. Edit `/mnt/user/appdata/COMPOSE/WeatherStation/docker-compose.yml` and set
   `OPENWEATHER_API_KEY`, `WINDY_API_KEY`, and (optionally) `WINDY_ZOOM`.

2. Start the container:

```bash
docker compose -f /mnt/user/appdata/COMPOSE/WeatherStation/docker-compose.yml up -d
```

The compose file pulls the published image, so `--build` does nothing. To run
your own build instead, uncomment `build: .` in the compose file and add
`--build`.

## Docker Compose file

```yaml
services:
  weatherstation:
    image: ghcr.io/racoon80/weatherstation:latest
    restart: always
    init: true
    ports:
      - "3001:3001"
    environment:
      - OPENWEATHER_API_KEY=your_api_key_here
      - DEFAULT_CITY=Luxembourg
      - DEFAULT_COUNTRY=LU
      - WINDY_API_KEY=your_windy_key_here
      - WINDY_ZOOM=6
      - WINDY_SHOWLAYER=rain
      - ICAL_URL=your_ical_url_here
      - MAXIMUM_ENTRIES=8
    volumes:
      - /mnt/user/appdata/WeatherStation:/app/config:ro
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    mem_limit: 256m
    pids_limit: 128
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "node -e \"fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""
        ]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

## Configuration

Environment variables:
- `OPENWEATHER_API_KEY` (required, unless the key file below is used)
- `OPENWEATHER_API_KEY_FILE` (default: `/app/config/openweather.key`)
- `DEFAULT_CITY` (default: `Luxembourg`)
- `DEFAULT_COUNTRY` (default: `LU`, must be a 2-letter code)
- `PORT` (default: `3001`; changing it also requires updating the published
  port and the healthcheck URL in the compose file)
- `WINDY_API_KEY` (optional, enables Windy embed — note this key is sent to
  the browser, as an embed requires; restrict it to your domain in the Windy
  console)
- `WINDY_ZOOM` (default: `6`)
- `WINDY_SHOWLAYER` (default: `wind` — the Windy overlay, e.g. `rain`, `temp`)
- `WINDY_ROTATELAYERS` (optional, Windy layer rotation)
- `WINDY_LAYERSTOROTATE` (optional, comma-separated layer list)
- `WINDY_DELAYROTATE` (optional, rotation delay)
- `ICAL_URL` (required for calendar events; **must be https** — an http URL is
  rejected at startup and the calendar stays empty)
- `MAXIMUM_ENTRIES` (default: `8`, capped at `50`)

If you don't want to set the key in `docker-compose.yml`, create a file at
`/mnt/user/appdata/WeatherStation/openweather.key` (because `/app/config` is
mapped to that host path) and put the key on a single line.

The container runs as the unprivileged `node` user (uid 1000), so the key file
must be readable by it — `chmod 644` it, or `chown 1000:1000`. A root-owned
`chmod 600` file yields a permission error, which is logged to the container
log as `Cannot read API key file … EACCES`.

## Notes
- The forecast uses the free 5-day/3-hour endpoint and summarizes it into a
  daily view. If fewer than 6 days are available, placeholders fill the rest.
- API responses are cached in-process (weather 5 min, air quality 10 min,
  calendar 5 min) and `/api/*` is rate limited to 60 requests per minute per
  IP, so a refreshing dashboard cannot burn the free-tier quota.
- The dashboard has no authentication. If it is reachable from outside your
  LAN, put it behind a reverse proxy with forward auth.

## Modules used

- Windy embed (via MMM-WindyV3): https://github.com/jhogendorn/MMM-WindyV3/
- Calendar (MagicMirror default): https://github.com/MagicMirrorOrg/MagicMirror/tree/master/modules/default/calendar
- Air quality: https://github.com/PierreGode/MMM-airquality

---

## ☕ Support

If this project is useful to you, you can buy me a coffee:

<a href="https://www.buymeacoffee.com/dv7g" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-orange.png" alt="Buy me a coffee" height="41" width="174"></a>
