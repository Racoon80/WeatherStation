const form = document.getElementById("settingsForm");
const status = document.getElementById("settingsStatus");
const input = form.querySelector("input[name='apiKey']");
const langSelect = form.querySelector("select[name='lang']");

const savedKey = localStorage.getItem("owmApiKey");
if (savedKey) {
  input.value = savedKey;
}

const savedLang = localStorage.getItem("weatherLang");
if (savedLang && langSelect) {
  langSelect.value = savedLang;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const key = (formData.get("apiKey") || "").toString().trim();

  if (!key) {
    status.textContent = "Please enter a key.";
    return;
  }

  localStorage.setItem("owmApiKey", key);
  if (langSelect) {
    localStorage.setItem("weatherLang", langSelect.value);
  }
  status.textContent = "Saved. Return to the dashboard to load data.";
});
