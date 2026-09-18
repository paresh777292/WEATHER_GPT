const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://weather-gpt-9j3w.onrender.com/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.detail || `Request failed: ${response.status}`);
  }
  return data;
}

export function getWeatherByCity(city) {
  return request(`/weather/city/${encodeURIComponent(city)}`);
}

export function getAlerts(city) {
  return request(`/alerts/${encodeURIComponent(city)}`);
}

export function getClimate(city) {
  return request(`/climate/${encodeURIComponent(city)}`);
}

export function sendChat(message, language = "en") {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({ message, language }),
  });
}
