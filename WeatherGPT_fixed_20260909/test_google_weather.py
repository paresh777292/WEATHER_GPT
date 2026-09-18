import os
from datetime import date

import requests
from dotenv import load_dotenv


# ============================================================
# LOAD ENV
# ============================================================

load_dotenv()

API_KEY = os.getenv("GOOGLE_WEATHER_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GOOGLE_WEATHER_API_KEY not found in .env"
    )


# ============================================================
# MUMBAI
# ============================================================

CITY = "Mumbai"

LATITUDE = 19.0760
LONGITUDE = 72.8777


# ============================================================
# GOOGLE WEATHER API
# ============================================================

URL = "https://weather.googleapis.com/v1/forecast/days:lookup"


params = {
    "key": API_KEY,
    "location.latitude": LATITUDE,
    "location.longitude": LONGITUDE,
    "days": 2,
}


# ============================================================
# REQUEST
# ============================================================

print("=" * 70)
print("WeatherGPT - Google Weather API Test")
print("=" * 70)

print(f"\nCity: {CITY}")
print(f"Today: {date.today()}")


try:
    response = requests.get(
        URL,
        params=params,
        timeout=30,
    )
except requests.RequestException as error:
    raise RuntimeError(
        f"Unable to connect to Google Weather API: {error}"
    )


# ============================================================
# STATUS
# ============================================================

print(f"\nHTTP Status: {response.status_code}")


if response.status_code != 200:
    print("\nGoogle Weather API Error:")
    print(response.text)

    raise SystemExit(1)


data = response.json()


# ============================================================
# RESPONSE
# ============================================================

forecast_days = data.get(
    "forecastDays",
    []
)


if len(forecast_days) < 2:
    print("\nTomorrow forecast not available.")
    raise SystemExit(1)


# ============================================================
# TODAY
# ============================================================

today_data = forecast_days[0]

today_date = today_data.get(
    "displayDate",
    {}
)

today_day = today_data.get(
    "daytimeForecast",
    {}
)

today_night = today_data.get(
    "nighttimeForecast",
    {})


# ============================================================
# TOMORROW
# ============================================================

tomorrow_data = forecast_days[1]

tomorrow_date = tomorrow_data.get(
    "displayDate",
    {}
)

daytime = tomorrow_data.get(
    "daytimeForecast",
    {}
)

nighttime = tomorrow_data.get(
    "nighttimeForecast",
    {})


# ============================================================
# HELPER
# ============================================================

def get_temp(forecast, key):
    return (
        forecast
        .get("temperature", {})
        .get(key)
    )


def get_feels_like(forecast, key):
    return (
        forecast
        .get("feelsLikeTemperature", {})
        .get(key)
    )


def get_condition(forecast):
    return (
        forecast
        .get("weatherCondition", {})
        .get("description", {})
        .get("text")
    )


def get_probability(forecast):
    return (
        forecast
        .get("precipitation", {})
        .get("probability", {})
        .get("percent")
    )


def get_qpf(forecast):
    return (
        forecast
        .get("precipitation", {})
        .get("qpf", {})
        .get("quantity")
    )


# ============================================================
# TOMORROW RESULT
# ============================================================

print("\n" + "=" * 70)
print("TOMORROW FORECAST")
print("=" * 70)

print(
    "Date:",
    tomorrow_date.get("year"),
    tomorrow_date.get("month"),
    tomorrow_date.get("day"),
)

print(
    "Day condition:",
    get_condition(daytime)
)

print(
    "Night condition:",
    get_condition(nighttime)
)

print(
    "Day rain probability:",
    get_probability(daytime),
    "%"
)

print(
    "Night rain probability:",
    get_probability(nighttime),
    "%"
)

print(
    "Day precipitation:",
    get_qpf(daytime),
    "mm"
)

print(
    "Night precipitation:",
    get_qpf(nighttime),
    "mm"
)

print(
    "Minimum temperature:",
    get_temp(daytime, "degrees"),
    "°C"
)

print(
    "Maximum temperature:",
    get_temp(daytime, "degrees"),
    "°C"
)

print(
    "Day feels-like:",
    get_feels_like(daytime, "degrees"),
    "°C"
)

print(
    "Humidity:",
    daytime.get("relativeHumidity"),
    "%"
)


# ============================================================
# WIND
# ============================================================

wind = daytime.get(
    "wind",
    {}
)

wind_direction = wind.get(
    "direction",
    {}
)

wind_speed = wind.get(
    "speed",
    {})

wind_gust = wind.get(
    "gust",
    {})

print(
    "Wind direction:",
    wind_direction.get("cardinal")
)

print(
    "Wind speed:",
    wind_speed.get("value"),
    wind_speed.get("unit")
)

print(
    "Wind gust:",
    wind_gust.get("value"),
    wind_gust.get("unit")
)


# ============================================================
# THUNDERSTORM
# ============================================================

print(
    "Thunderstorm probability:",
    daytime.get("thunderstormProbability"),
    "%"
)


# ============================================================
# SUCCESS
# ============================================================

print("\n" + "=" * 70)
print("GOOGLE WEATHER API TEST SUCCESSFUL")
print("=" * 70)