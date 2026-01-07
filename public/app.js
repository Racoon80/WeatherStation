const form = document.getElementById("locationForm");
const locationName = document.getElementById("locationName");
const latEl = document.getElementById("lat");
const lonEl = document.getElementById("lon");
const countryEl = document.getElementById("country");
const windDir = document.getElementById("windDir");
const windSpeed = document.getElementById("windSpeed");
const forecastEl = document.getElementById("forecast");
const updatedAt = document.getElementById("updatedAt");
const windyEmbed = document.getElementById("windyEmbed");

const compassPoints = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW"
];

const formatCoord = (value) => `${value.toFixed(3)}°`;

const formatDay = (unix) => {
  const date = new Date(unix * 1000);
  return date.toLocaleDateString(undefined, { weekday: "short" });
};

const directionLabel = (deg) => {
  const index = Math.round(deg / 22.5) % 16;
  return compassPoints[index];
};

const renderForecast = (days) => {
  forecastEl.innerHTML = "";
  if (!days.length) {
    forecastEl.textContent = "No forecast data available.";
    return;
  }

  days.forEach((day) => {
    const tile = document.createElement("div");
    tile.className = "forecast-tile";

    const main = day.weather?.[0]?.main || "";
    const icon = day.weather?.[0]?.icon;
    const desc = day.weather?.[0]?.description || "";
    const isNight = icon ? icon.endsWith("n") : false;
    const maxTemp =
      typeof day.temp?.max === "number" ? Math.round(day.temp.max) : null;
    const minTemp =
      typeof day.temp?.min === "number" ? Math.round(day.temp.min) : null;

    tile.classList.add(`weather-${main.toLowerCase() || "clear"}`);

    const iconMarkup = (() => {
      const cloud = `
        <use xlink:href="#grayCloud" class="small-cloud" fill="url(#gradGray)"></use>
        <use xlink:href="#whiteCloud" x="7"></use>
      `;
      const darkCloud = `
        <use xlink:href="#grayCloud" class="small-cloud" fill="url(#gradGray)"></use>
        <use xlink:href="#grayCloud" x="25" y="10" class="reverse-small-cloud" fill="url(#gradDarkGray)"></use>
        <use xlink:href="#whiteCloud" x="7"></use>
      `;
      if (main.toLowerCase().includes("thunder")) {
        return `
          ${isNight ? `<use xlink:href="#moon" x="-20" y="-15"></use>` : `<use xlink:href="#sun" x="-12" y="-18"></use>`}
          ${cloud}
          <use xlink:href="#thunderBolt" x="52" y="55"></use>
          <use xlink:href="#rainDrop" class="drop1" x="25" y="65"></use>
          <use xlink:href="#rainDrop" class="drop3" x="45" y="65"></use>
        `;
      }
      if (main.toLowerCase().includes("drizzle")) {
        return `
          ${isNight ? `<use xlink:href="#moon" x="-20" y="-15"></use>` : `<use xlink:href="#sun" x="-12" y="-18"></use>`}
          ${cloud}
          <use xlink:href="#rainDrizzle" class="rain-drizzle" x="25" y="65"></use>
          <use xlink:href="#rainDrizzle" class="rain-drizzle" x="40" y="65"></use>
        `;
      }
      if (main.toLowerCase().includes("rain")) {
        return `
          ${isNight ? `<use xlink:href="#moon" x="-20" y="-15"></use>` : `<use xlink:href="#sun" x="-12" y="-18"></use>`}
          ${cloud}
          <use xlink:href="#rainDrop" class="drop1" x="25" y="65"></use>
          <use xlink:href="#rainDrop" class="drop3" x="45" y="65"></use>
        `;
      }
      if (main.toLowerCase().includes("snow")) {
        return `
          ${isNight ? `<use xlink:href="#moon" x="-20" y="-15"></use>` : `<use xlink:href="#sun" x="-12" y="-18"></use>`}
          ${cloud}
          <use xlink:href="#snowFlake" class="snowflake2" x="30" y="65"></use>
          <use xlink:href="#snowFlake" class="snowflake4" x="45" y="65"></use>
          <use xlink:href="#snowFlake" class="snowflake5" x="58" y="65"></use>
        `;
      }
      if (
        main.toLowerCase().includes("mist") ||
        main.toLowerCase().includes("fog") ||
        main.toLowerCase().includes("haze")
      ) {
        return `
          ${cloud}
          <use xlink:href="#mist" class="mist-lines" x="5" y="35"></use>
        `;
      }
      if (main.toLowerCase().includes("cloud")) {
        return darkCloud;
      }
      if (isNight) {
        return `
          <use xlink:href="#moon" x="-15"></use>
          <use xlink:href="#star" x="42" y="30" class="stars"></use>
          <use xlink:href="#star" x="61" y="32" class="stars"></use>
          <use xlink:href="#star" x="55" y="50" class="stars"></use>
        `;
      }
      return `<use xlink:href="#sun"></use>`;
    })();

    tile.innerHTML = `
      <strong>${formatDay(day.dt)}</strong>
      <svg class="forecast-icon" viewBox="0 0 100 100" aria-label="${desc}">
        ${iconMarkup}
      </svg>
      <div class="temp-range">
        <div>${maxTemp !== null ? `${maxTemp}°` : "--"}</div>
        <span>${minTemp !== null ? `${minTemp}°` : "--"}</span>
      </div>
      <small>${desc || "No data"}</small>
    `;

    forecastEl.appendChild(tile);
  });
};

const updateUI = (data) => {
  locationName.textContent = data.location.name;
  latEl.textContent = formatCoord(data.location.lat);
  lonEl.textContent = formatCoord(data.location.lon);
  countryEl.textContent = data.location.country;

  const deg = data.current.wind_deg ?? 0;
  windDir.textContent = `${directionLabel(deg)} (${deg}°)`;
  windSpeed.textContent = `${Math.round(data.current.wind_speed)} m/s`;

  updatedAt.textContent = `Updated ${new Date(
    data.current.dt * 1000
  ).toLocaleString()}`;

  renderForecast(data.daily);

  const cityInput = form.querySelector("input[name='city']");
  const countryInput = form.querySelector("input[name='country']");
  cityInput.value = data.location.name;
  countryInput.value = data.location.country;

  if (windyEmbed) {
    windyEmbed.innerHTML = "";
    if (data.windyKey) {
      const zoom = data.windyZoom || "6";
      const rotateLayers = data.windyRotate || "";
      const layersToRotate = data.windyLayers || "";
      const src =
        "https://embed.windy.com/embed2" +
        `?lat=${data.location.lat}` +
        `&lon=${data.location.lon}` +
        `&detailLat=${data.location.lat}` +
        `&detailLon=${data.location.lon}` +
        "&width=100%25&height=100%25" +
        `&zoom=${encodeURIComponent(zoom)}&level=surface&overlay=wind&product=ecmwf` +
        `&rotateLayers=${encodeURIComponent(rotateLayers)}` +
        `&layersToRotate=${encodeURIComponent(layersToRotate)}` +
        "&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates" +
        `&key=${data.windyKey}`;
      const frame = document.createElement("iframe");
      frame.src = src;
      frame.loading = "lazy";
      frame.referrerPolicy = "no-referrer-when-downgrade";
      windyEmbed.appendChild(frame);
    } else {
      windyEmbed.innerHTML =
        "<p class=\"windy-fallback\">Windy map unavailable. Add a `WINDY_API_KEY`.</p>";
    }
  }
};

const loadWeather = async (city, country) => {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (country) params.set("country", country);
  const lang = localStorage.getItem("weatherLang") || "en";
  if (lang) params.set("lang", lang);

  const headers = {};
  const storedKey = localStorage.getItem("owmApiKey");
  if (storedKey) {
    headers["x-owm-key"] = storedKey;
  }

  const response = await fetch(`/api/weather?${params.toString()}`, {
    headers
  });
  if (!response.ok) {
    throw new Error("Failed to load weather");
  }

  return response.json();
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  try {
    const data = await loadWeather(
      formData.get("city"),
      formData.get("country")
    );
    updateUI(data);
  } catch (error) {
    forecastEl.textContent = "Unable to load data. Check the location.";
  }
});

(async () => {
  try {
    const data = await loadWeather();
    updateUI(data);
  } catch (error) {
    forecastEl.textContent = "Unable to load data. Check the API key.";
  }
})();
