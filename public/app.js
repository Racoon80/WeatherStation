const form = document.getElementById("locationForm");
const locationName = document.getElementById("locationName");
const airQualityEl = document.getElementById("airQuality");
const windDir = document.getElementById("windDir");
const windSpeed = document.getElementById("windSpeed");
const forecastEl = document.getElementById("forecast");
const updatedAt = document.getElementById("updatedAt");
const windyEmbed = document.getElementById("windyEmbed");
const calendarEvents = document.getElementById("calendarEvents");
const currentIcon = document.getElementById("currentIcon");
const todayMax = document.getElementById("todayMax");
const todayMin = document.getElementById("todayMin");
const clockEl = document.getElementById("clock");

// Set from GET /api/config; every string below is looked up through it.
const STRINGS = {
  EN: {
    locale: "en-GB",
    htmlLang: "en",
    wind: "Wind",
    speed: "Speed",
    airQuality: "Air quality",
    calendar: "Calendar",
    loading: "Loading…",
    noEvents: "No upcoming events.",
    noForecast: "No forecast data available.",
    calendarError: "Calendar unavailable.",
    weatherErrorKey: "Unable to load weather. Check the API key.",
    weatherErrorCity: "Unable to load weather. Check the location.",
    allDay: "All day",
    updated: "Updated",
    go: "Go",
    city: "City",
    country: "Country code",
    noData: "No data",
    aqi: ["Good", "Fair", "Moderate", "Poor", "Very poor"],
    aqiUnknown: "Unknown"
  },
  DE: {
    locale: "de-DE",
    htmlLang: "de",
    wind: "Wind",
    speed: "Geschwindigkeit",
    airQuality: "Luftqualität",
    calendar: "Kalender",
    loading: "Wird geladen…",
    noEvents: "Keine anstehenden Termine.",
    noForecast: "Keine Vorhersagedaten verfügbar.",
    calendarError: "Kalender nicht verfügbar.",
    weatherErrorKey: "Laden fehlgeschlagen. API-Schlüssel prüfen.",
    weatherErrorCity: "Laden fehlgeschlagen. Ort prüfen.",
    allDay: "Ganztägig",
    updated: "Aktualisiert",
    go: "Los",
    city: "Stadt",
    country: "Ländercode",
    noData: "Keine Daten",
    aqi: ["Gut", "Mäßig", "Mittel", "Schlecht", "Sehr schlecht"],
    aqiUnknown: "Unbekannt"
  },
  FR: {
    locale: "fr-FR",
    htmlLang: "fr",
    wind: "Vent",
    speed: "Vitesse",
    airQuality: "Qualité de l'air",
    calendar: "Calendrier",
    loading: "Chargement…",
    noEvents: "Aucun évènement à venir.",
    noForecast: "Aucune prévision disponible.",
    calendarError: "Calendrier indisponible.",
    weatherErrorKey: "Échec du chargement. Vérifiez la clé API.",
    weatherErrorCity: "Échec du chargement. Vérifiez le lieu.",
    allDay: "Journée entière",
    updated: "Mis à jour",
    go: "OK",
    city: "Ville",
    country: "Code pays",
    noData: "Aucune donnée",
    aqi: ["Bonne", "Correcte", "Moyenne", "Mauvaise", "Très mauvaise"],
    aqiUnknown: "Inconnue"
  },
  LU: {
    // Intl has no reliable lb-LU on every browser, so LU weekday and month
    // names are supplied below rather than left to toLocaleDateString.
    locale: "de-DE",
    htmlLang: "lb",
    weekdays: ["Son", "Méi", "Dën", "Mët", "Don", "Fre", "Sam"],
    months: [
      "Jan", "Feb", "Mäe", "Abr", "Mee", "Jun",
      "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"
    ],
    wind: "Wand",
    speed: "Geschwindegkeet",
    airQuality: "Loftqualitéit",
    calendar: "Kalenner",
    loading: "Lueden…",
    noEvents: "Keng Termine geplangt.",
    noForecast: "Keng Prognosdaten do.",
    calendarError: "Kalenner net verfügbar.",
    weatherErrorKey: "Lueden feelgeschloen. API-Schlëssel préiwen.",
    weatherErrorCity: "Lueden feelgeschloen. Uert préiwen.",
    allDay: "Ganzen Dag",
    updated: "Aktualiséiert",
    go: "Lass",
    city: "Stad",
    country: "Landescode",
    noData: "Keng Daten",
    aqi: ["Gutt", "Uerdentlech", "Mëttel", "Schlecht", "Ganz schlecht"],
    aqiUnknown: "Onbekannt"
  }
};

// OpenWeatherMap returns English for LU (it has no Luxembourgish), so the
// descriptions are mapped here. Anything unlisted falls back to the condition
// group, then to the raw English — never to a blank.
const LU_CONDITIONS = {
  "clear sky": "kloeren Himmel",
  "few clouds": "e puer Wolleken",
  "scattered clouds": "verspreet Wolleken",
  "broken clouds": "opgelackert bewëllt",
  "overcast clouds": "bedeckt",
  "light rain": "liichte Reen",
  "moderate rain": "moderate Reen",
  "heavy intensity rain": "staarke Reen",
  "very heavy rain": "ganz staarke Reen",
  "extreme rain": "extreme Reen",
  "freezing rain": "gefréierende Reen",
  "light intensity shower rain": "liicht Reeschauer",
  "shower rain": "Reeschauer",
  "heavy intensity shower rain": "staark Reeschauer",
  "light intensity drizzle": "liichten Nisel",
  drizzle: "Nisel",
  "heavy intensity drizzle": "staarken Nisel",
  "light snow": "liichte Schnéi",
  snow: "Schnéi",
  "heavy snow": "vill Schnéi",
  sleet: "Schnéireen",
  "light rain and snow": "liichte Reen a Schnéi",
  "rain and snow": "Reen a Schnéi",
  thunderstorm: "Donnerwieder",
  "thunderstorm with light rain": "Donnerwieder mat liichte Reen",
  "thunderstorm with rain": "Donnerwieder mat Reen",
  "thunderstorm with heavy rain": "Donnerwieder mat staarke Reen",
  mist: "Niwwel",
  fog: "Niwwel",
  haze: "Donscht",
  smoke: "Damp",
  dust: "Stëbs",
  sand: "Sand",
  squall: "Bö",
  tornado: "Tornado"
};

const LU_GROUPS = {
  clear: "kloer",
  clouds: "bewëllt",
  rain: "Reen",
  drizzle: "Nisel",
  snow: "Schnéi",
  thunderstorm: "Donnerwieder",
  mist: "Niwwel",
  fog: "Niwwel",
  haze: "Donscht"
};

let T = STRINGS.EN;

const describe = (main, description) => {
  if (T !== STRINGS.LU) return description;
  const key = (description || "").toLowerCase();
  return (
    LU_CONDITIONS[key] || LU_GROUPS[(main || "").toLowerCase()] || description
  );
};

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

// Prefers the server's precomputed local date (YYYY-MM-DD) over the raw
// timestamp: `dt` is the first sample of the location's day, which can land on
// the previous weekday once the browser renders it in its own timezone.
const formatDay = (day) => {
  const date = day.date
    ? new Date(`${day.date}T12:00:00Z`)
    : new Date(day.dt * 1000);
  if (T.weekdays) {
    return T.weekdays[day.date ? date.getUTCDay() : date.getDay()];
  }
  return date.toLocaleDateString(T.locale, {
    weekday: "short",
    timeZone: day.date ? "UTC" : undefined
  });
};

const formatEventDate = (date) => {
  if (T.months) {
    return `${T.months[date.getMonth()]} ${date.getDate()}`;
  }
  return date.toLocaleDateString(T.locale, { month: "short", day: "numeric" });
};

const formatTime = (date) =>
  date.toLocaleTimeString(T.locale, { hour: "2-digit", minute: "2-digit" });

// Static labels live in the markup with a data-i18n key so the HTML stays
// readable and there is exactly one place that knows the strings.
const applyStaticLabels = () => {
  // Not derived from `locale`: LU borrows de-DE for number and time
  // formatting, but the document is Luxembourgish, not German.
  document.documentElement.lang = T.htmlLang || "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = T[el.dataset.i18n];
    if (value) el.textContent = value;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const value = T[el.dataset.i18nPlaceholder];
    if (value) {
      el.placeholder = value;
      el.setAttribute("aria-label", value);
    }
  });
};

const directionLabel = (deg) => {
  const index = Math.round(deg / 22.5) % 16;
  return compassPoints[index];
};

// Built from string literals only — no upstream value is ever interpolated
// into the markup, which is what keeps the innerHTML assignments below safe.
// Shared by the forecast tiles and the hero icon.
const iconMarkupFor = (main, isNight) => {
  const kind = main.toLowerCase();
  const luminary = isNight
    ? `<use xlink:href="#moon" x="-20" y="-15"></use>`
    : `<use xlink:href="#sun" x="-12" y="-18"></use>`;
  const cloud = `
    <use xlink:href="#grayCloud" class="small-cloud" fill="url(#gradGray)"></use>
    <use xlink:href="#whiteCloud" x="7"></use>
  `;
  const darkCloud = `
    <use xlink:href="#grayCloud" class="small-cloud" fill="url(#gradGray)"></use>
    <use xlink:href="#grayCloud" x="25" y="10" class="reverse-small-cloud" fill="url(#gradDarkGray)"></use>
    <use xlink:href="#whiteCloud" x="7"></use>
  `;

  if (kind.includes("thunder")) {
    return `
      ${luminary}
      ${cloud}
      <use xlink:href="#thunderBolt" x="52" y="55"></use>
      <use xlink:href="#rainDrop" class="drop1" x="25" y="65"></use>
      <use xlink:href="#rainDrop" class="drop3" x="45" y="65"></use>
    `;
  }
  if (kind.includes("drizzle")) {
    return `
      ${luminary}
      ${cloud}
      <use xlink:href="#rainDrizzle" class="rain-drizzle" x="25" y="65"></use>
      <use xlink:href="#rainDrizzle" class="rain-drizzle" x="40" y="65"></use>
    `;
  }
  if (kind.includes("rain")) {
    return `
      ${luminary}
      ${cloud}
      <use xlink:href="#rainDrop" class="drop1" x="25" y="65"></use>
      <use xlink:href="#rainDrop" class="drop3" x="45" y="65"></use>
    `;
  }
  if (kind.includes("snow")) {
    return `
      ${luminary}
      ${cloud}
      <use xlink:href="#snowFlake" class="snowflake2" x="30" y="65"></use>
      <use xlink:href="#snowFlake" class="snowflake4" x="45" y="65"></use>
      <use xlink:href="#snowFlake" class="snowflake5" x="58" y="65"></use>
    `;
  }
  if (kind.includes("mist") || kind.includes("fog") || kind.includes("haze")) {
    return `
      ${cloud}
      <use xlink:href="#mist" class="mist-lines" x="5" y="35"></use>
    `;
  }
  if (kind.includes("cloud")) {
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
};

const renderForecast = (days) => {
  forecastEl.innerHTML = "";
  if (!days.length) {
    forecastEl.textContent = T.noForecast;
    return;
  }

  days.forEach((day) => {
    const tile = document.createElement("div");
    tile.className = "forecast-tile";

    const main = day.weather?.[0]?.main || "";
    const icon = day.weather?.[0]?.icon;
    const desc = describe(main, day.weather?.[0]?.description || "");
    const isNight = icon ? icon.endsWith("n") : false;
    const maxTemp =
      typeof day.temp?.max === "number" ? Math.round(day.temp.max) : null;
    const minTemp =
      typeof day.temp?.min === "number" ? Math.round(day.temp.min) : null;

    // Padding days beyond the forecast horizon are dimmed rather than shown
    // as a confident prediction.
    if (day.placeholder) {
      tile.classList.add("forecast-tile--empty");
    }

    const iconMarkup = iconMarkupFor(main, isNight);

    // day/desc come from the upstream API and are set as text afterwards
    // rather than interpolated into this markup.
    tile.innerHTML = `
      <strong></strong>
      <svg class="forecast-icon" viewBox="0 0 100 100">
        ${iconMarkup}
      </svg>
      <div class="temp-range">
        <div>${maxTemp !== null ? `${maxTemp}°` : "--"}</div>
        <span>${minTemp !== null ? `${minTemp}°` : "--"}</span>
      </div>
      <small></small>
    `;
    tile.querySelector("strong").textContent = formatDay(day);
    tile.querySelector("svg").setAttribute("aria-label", desc);
    tile.querySelector("small").textContent = desc || T.noData;

    forecastEl.appendChild(tile);
  });
};

// The hero shows today's high and low with a matching icon. The current
// endpoint only carries wind, so today's entry from the daily summary is the
// source — the same data the first forecast tile uses.
const renderHero = (today) => {
  const max = typeof today?.temp?.max === "number" ? Math.round(today.temp.max) : null;
  const min = typeof today?.temp?.min === "number" ? Math.round(today.temp.min) : null;
  todayMax.textContent = max !== null ? `${max}°` : "--";
  todayMin.textContent = min !== null ? `${min}°` : "";

  const main = today?.weather?.[0]?.main || "";
  const icon = today?.weather?.[0]?.icon;
  currentIcon.innerHTML = iconMarkupFor(main, icon ? icon.endsWith("n") : false);
  currentIcon.setAttribute(
    "aria-label",
    describe(main, today?.weather?.[0]?.description || "") || T.noData
  );
};

const updateUI = (data) => {
  // Country folded into the title: as a separate fact it was a 15px string of
  // coordinates, which nobody can read from across a room.
  locationName.textContent = data.location.country
    ? `${data.location.name}, ${data.location.country}`
    : data.location.name;

  renderHero(data.daily?.[0]);

  const deg = data.current.wind_deg;
  windDir.textContent = Number.isFinite(deg)
    ? `${directionLabel(deg)} (${deg}°)`
    : "--";
  windSpeed.textContent = Number.isFinite(data.current.wind_speed)
    ? `${Math.round(data.current.wind_speed)} m/s`
    : "--";

  updatedAt.textContent = `${T.updated} ${formatTime(
    new Date(data.current.dt * 1000)
  )}`;

  renderForecast(data.daily);

  const cityInput = form.querySelector("input[name='city']");
  const countryInput = form.querySelector("input[name='country']");
  cityInput.value = data.location.name;
  countryInput.value = data.location.country;

  if (windyEmbed) {
    if (data.windyKey) {
      const zoom = data.windyZoom || "6";
      const layer = data.windyLayer || "wind";
      const rotateLayers = data.windyRotate || "";
      const layersToRotate = data.windyLayers || "";
      const delayRotate = data.windyDelay || "";
      const lat = Number(data.location.lat);
      const lon = Number(data.location.lon);
      const src =
        "https://embed.windy.com/embed2" +
        `?lat=${lat}` +
        `&lon=${lon}` +
        `&detailLat=${lat}` +
        `&detailLon=${lon}` +
        "&width=100%25&height=100%25" +
        `&zoom=${encodeURIComponent(zoom)}&level=surface` +
        `&overlay=${encodeURIComponent(layer)}&product=ecmwf` +
        `&rotateLayers=${encodeURIComponent(rotateLayers)}` +
        `&layersToRotate=${encodeURIComponent(layersToRotate)}` +
        `&delayRotate=${encodeURIComponent(delayRotate)}` +
        "&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates" +
        `&key=${encodeURIComponent(data.windyKey)}`;
      // Rebuilding the iframe reloads the map and discards the user's pan and
      // zoom, so only do it when the URL actually changed.
      const existing = windyEmbed.querySelector("iframe");
      if (!existing || existing.src !== src) {
        windyEmbed.innerHTML = "";
        const frame = document.createElement("iframe");
        frame.src = src;
        frame.loading = "lazy";
        // no-referrer: do not hand the dashboard's own URL to windy.com.
        frame.referrerPolicy = "no-referrer";
        frame.sandbox = "allow-scripts allow-same-origin";
        windyEmbed.appendChild(frame);
      }
    }
    // No key: leave the static fallback markup from index.html in place.
  }
};

const loadAirQuality = async (lat, lon) => {
  const response = await fetch(
    `/api/airquality?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(
      lon
    )}`
  );
  if (!response.ok) {
    throw new Error("Failed to load air quality");
  }
  return response.json();
};

const renderAirQuality = (data) => {
  if (!airQualityEl) return;
  if (!data || data.aqi === null) {
    airQualityEl.textContent = "--";
    return;
  }
  const label = T.aqi[data.aqi - 1] || T.aqiUnknown;
  airQualityEl.textContent = `${label} (AQI ${data.aqi})`;
};

const loadWeather = async (city, country) => {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (country) params.set("country", country);

  const response = await fetch(`/api/weather?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load weather");
  }

  return response.json();
};

const renderCalendar = (events) => {
  if (!calendarEvents) return;
  if (!events.length) {
    calendarEvents.textContent = T.noEvents;
    return;
  }
  const list = document.createElement("ul");
  list.className = "calendar-list";
  events.forEach((event) => {
    const item = document.createElement("li");
    const start = event.start ? new Date(event.start) : null;
    const dateLabel = start ? formatEventDate(start) : "--";
    const timeLabel =
      start && !event.allDay ? formatTime(start) : T.allDay;
    // textContent, not innerHTML: event.summary is attacker-controllable via
    // the iCal feed (shared calendars, accepted invites).
    const dateNode = document.createElement("span");
    dateNode.textContent = dateLabel;
    const summaryNode = document.createElement("strong");
    summaryNode.textContent = event.summary || "";
    const timeNode = document.createElement("em");
    timeNode.textContent = timeLabel;
    item.append(dateNode, summaryNode, timeNode);
    list.appendChild(item);
  });
  calendarEvents.innerHTML = "";
  calendarEvents.appendChild(list);
};

const loadCalendar = async () => {
  if (!calendarEvents) return;
  try {
    const response = await fetch("/api/calendar");
    if (!response.ok) {
      throw new Error("Failed to load calendar");
    }
    const data = await response.json();
    renderCalendar(data.events || []);
  } catch (error) {
    calendarEvents.textContent = T.calendarError;
  }
};

// Single entry point for both the initial load, the form submit and the
// refresh timer. Previously the submit path skipped air quality entirely, so
// searching a new city left the previous city's AQI on screen.
let currentCity = "";
let currentCountry = "";
let inFlight = false;

const refresh = async (city, country) => {
  if (inFlight) return;
  inFlight = true;
  try {
    let data;
    try {
      data = await loadWeather(city, country);
    } catch (error) {
      forecastEl.textContent = city
        ? T.weatherErrorCity
        : T.weatherErrorKey;
      return;
    }

    currentCity = data.location.name;
    currentCountry = data.location.country;
    updateUI(data);

    // Each panel fails on its own: an air-quality outage used to wipe the
    // forecast that had already rendered successfully.
    await Promise.allSettled([
      loadAirQuality(data.location.lat, data.location.lon)
        .then(renderAirQuality)
        .catch(() => {
          if (airQualityEl) airQualityEl.textContent = "--";
        }),
      loadCalendar()
    ]);
  } finally {
    inFlight = false;
  }
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  refresh(formData.get("city"), formData.get("country"));
});

// A wall display should show the time. Ticks every 10s rather than every
// second: the readout has no seconds, so a faster timer only wastes wakeups.
const tickClock = () => {
  clockEl.textContent = formatTime(new Date());
};
setInterval(tickClock, 10000);

// This is an always-on wall display: without a timer it would show the load
// time snapshot forever while "Updated …" keeps aging.
const REFRESH_MS = 10 * 60 * 1000;
const tick = () => {
  if (document.hidden) return;
  refresh(currentCity, currentCountry);
};
setInterval(tick, REFRESH_MS);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tick();
});

// Language is resolved before the first render so nothing flashes in English
// on a display configured for another language. A failed config call leaves
// the EN default in place rather than blocking the dashboard.
(async () => {
  try {
    const response = await fetch("/api/config");
    if (response.ok) {
      const config = await response.json();
      if (STRINGS[config.language]) T = STRINGS[config.language];
    }
  } catch (error) {
    /* keep the default */
  }
  applyStaticLabels();
  tickClock();
  refresh();
})();
