import os
import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENWEATHER_API_KEY")

if not API_KEY:
    raise RuntimeError("OPENWEATHER_API_KEY not found in .env")

LATITUDE = 19.07283
LONGITUDE = 72.88261

URL = "https://api.openweathermap.org/data/3.0/onecall"

params = {
    "lat": LATITUDE,
    "lon": LONGITUDE,
    "exclude": "minutely,alerts",
    "units": "metric",
    "appid": API_KEY,
}

response = httpx.get(
    URL,
    params=params,
    timeout=20,
)

print("Status:", response.status_code)

if response.status_code != 200:
    print(response.text)
    raise SystemExit(1)

data = response.json()

print("\n========== OPENWEATHER TEST ==========\n")

current = data.get("current", {})
print("Current temperature:", current.get("temp"))
print("Current humidity:", current.get("humidity"))

hourly = data.get("hourly", [])

if hourly:
    print("First hourly rain probability:", hourly[0].get("pop"))

daily = data.get("daily", [])

if daily:
    tomorrow = daily[1]

    print("\n========== TOMORROW ==========\n")
    print("Temperature min:", tomorrow.get("temp", {}).get("min"))
    print("Temperature max:", tomorrow.get("temp", {}).get("max"))
    print("Rain probability:", tomorrow.get("pop"))
    print("Rain amount:", tomorrow.get("rain"))
    print("Weather:", tomorrow.get("weather"))