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

1. Copy the example env file and fill in your key:

```bash
cp .env.example .env
```

2. Start the container:

```bash
docker compose up --build
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

## Notes
- The 7-day forecast uses OpenWeatherMap One Call 3.0, which may require a paid
  plan depending on your account.
