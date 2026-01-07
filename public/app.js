const form = document.getElementById("locationForm");
const locationName = document.getElementById("locationName");
const latEl = document.getElementById("lat");
const lonEl = document.getElementById("lon");
const countryEl = document.getElementById("country");
const windArrow = document.getElementById("windArrow");
const windDir = document.getElementById("windDir");
const windSpeed = document.getElementById("windSpeed");
const forecastEl = document.getElementById("forecast");
const updatedAt = document.getElementById("updatedAt");

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
    const iconUrl = icon
      ? `https://openweathermap.org/img/wn/${icon}@2x.png`
      : "";
    const maxTemp =
      typeof day.temp?.max === "number" ? Math.round(day.temp.max) : null;
    const minTemp =
      typeof day.temp?.min === "number" ? Math.round(day.temp.min) : null;

    tile.classList.add(`weather-${main.toLowerCase() || "clear"}`);

    tile.innerHTML = `
      <strong>${formatDay(day.dt)}</strong>
      ${iconUrl ? `<img src="${iconUrl}" alt="${desc}" />` : ""}
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
  windArrow.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
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
