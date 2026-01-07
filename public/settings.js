const form = document.getElementById("settingsForm");
const status = document.getElementById("settingsStatus");
const input = form.querySelector("input[name='apiKey']");

const savedKey = localStorage.getItem("owmApiKey");
if (savedKey) {
  input.value = savedKey;
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
  status.textContent = "Saved. Return to the dashboard to load data.";
});
