import os
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()

# Supports either variable name, so existing .env does not
# need to be renamed immediately.
API_KEY = (
    os.getenv("WEATHERAPI_KEY")
    or os.getenv("WEATHER_API_KEY")
)

if not API_KEY:
    raise RuntimeError(
        "WeatherAPI key not found in .env. "
        "Add WEATHERAPI_KEY=YOUR_KEY"
    )


# ============================================================
# SETTINGS
# ============================================================

CITY = "Mumbai"

BASE_URL = "https://api.weatherapi.com/v1/forecast.json"


# ============================================================
# TOMORROW DATE
# ============================================================

tomorrow = datetime.now().date() + timedelta(days=1)

print("=" * 60)
print("WeatherGPT - WeatherAPI.com Test")
print("=" * 60)

print(f"\nCity: {CITY}")
print(f"Tomorrow: {tomorrow}")


# ============================================================
# API REQUEST
# ============================================================

params = {
    "key": API_KEY,
    "q": CITY,
    "days": 2,
    "aqi": "no",
    "alerts": "yes",
}


try:
    response = requests.get(
        BASE_URL,
        params=params,
        timeout=20,
    )

except requests.RequestException as error:
    raise RuntimeError(
        f"Unable to connect to WeatherAPI: {error}"
    )


# ============================================================
# RESPONSE CHECK
# ============================================================

print(f"\nHTTP Status: {response.status_code}")

if response.status_code != 200:

    print("\nWeatherAPI Error:")
    print(response.text)

    raise SystemExit(1)


data = response.json()


# ============================================================
# LOCATION
# ============================================================

location = data.get("location", {})

print("\n" + "=" * 60)
print("LOCATION")
print("=" * 60)

print("Name:", location.get("name"))
print("Region:", location.get("region"))
print("Country:", location.get("country"))
print("Timezone:", location.get("tz_id"))


# ============================================================
# CURRENT WEATHER
# ============================================================

current = data.get("current", {})

print("\n" + "=" * 60)
print("CURRENT WEATHER")
print("=" * 60)

print("Temperature:", current.get("temp_c"), "°C")
print("Feels like:", current.get("feelslike_c"), "°C")
print("Humidity:", current.get("humidity"), "%")
print("Wind:", current.get("wind_kph"), "km/h")
print(
    "Condition:",
    current.get("condition", {}).get("text")
)


# ============================================================
# TOMORROW FORECAST
# ============================================================

forecast_days = (
    data.get("forecast", {})
    .get("forecastday", [])
)


tomorrow_data = None

for day in forecast_days:

    if day.get("date") == str(tomorrow):

        tomorrow_data = day
        break


if not tomorrow_data:

    print(
        "\nTomorrow forecast was not found."
    )

    raise SystemExit(1)


day_data = tomorrow_data.get(
    "day",
    {}
)


# ============================================================
# TOMORROW RESULT
# ============================================================

print("\n" + "=" * 60)
print("TOMORROW FORECAST")
print("=" * 60)

print(
    "Date:",
    tomorrow_data.get("date")
)

print(
    "Minimum temperature:",
    day_data.get("mintemp_c"),
    "°C"
)

print(
    "Maximum temperature:",
    day_data.get("maxtemp_c"),
    "°C"
)

print(
    "Average temperature:",
    day_data.get("avgtemp_c"),
    "°C"
)

print(
    "Condition:",
    day_data.get("condition", {}).get("text")
)

print(
    "Rain probability:",
    day_data.get("daily_chance_of_rain"),
    "%"
)

print(
    "Will it rain:",
    "YES"
    if day_data.get("daily_will_it_rain") == 1
    else "NO"
)

print(
    "Total precipitation:",
    day_data.get("totalprecip_mm"),
    "mm"
)

print(
    "Average humidity:",
    day_data.get("avghumidity"),
    "%"
)

print(
    "Maximum wind:",
    day_data.get("maxwind_kph"),
    "km/h"
)


# ============================================================
# SUNRISE / SUNSET
# ============================================================

astro = tomorrow_data.get(
    "astro",
    {}
)

print(
    "Sunrise:",
    astro.get("sunrise")
)

print(
    "Sunset:",
    astro.get("sunset")
)


# ============================================================
# HOURLY RAIN PROBABILITY
# ============================================================

print("\n" + "=" * 60)
print("HOURLY RAIN PROBABILITY")
print("=" * 60)

hours = tomorrow_data.get(
    "hour",
    []
)

rain_hours = []

for hour in hours:

    chance = hour.get(
        "chance_of_rain"
    )

    time = hour.get(
        "time"
    )

    if chance is not None:

        rain_hours.append(
            {
                "time": time,
                "chance": chance,
                "rain_mm": hour.get(
                    "precip_mm"
                ),
                "condition": hour.get(
                    "condition",
                    {}
                ).get("text"),
            }
        )


for item in rain_hours:

    print(
        f"{item['time']} | "
        f"Rain chance: {item['chance']}% | "
        f"Rain: {item['rain_mm']} mm | "
        f"{item['condition']}"
    )


# ============================================================
# SUCCESS
# ============================================================

print("\n" + "=" * 60)
print("WeatherAPI TEST COMPLETED SUCCESSFULLY")
print("=" * 60)