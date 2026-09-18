from pathlib import Path
import pandas as pd


# Project root:
# WeatherGPT/
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Historical data folder
HISTORICAL_DIR = PROJECT_ROOT / "data" / "historical"


CITY_FILES = {
    "bangalore": "Bangalore_1990_2022_BangaloreCity.csv",
    "chennai": "Chennai_1990_2022_Madras.csv",
    "delhi": "Delhi_NCR_1990_2022_Safdarjung.csv",
    "lucknow": "Lucknow_1990_2022.csv",
    "mumbai": "Mumbai_1990_2022_Santacruz.csv",
    "jodhpur": "Rajasthan_1990_2022_Jodhpur.csv",
    "bhubaneswar": "weather_Bhubhneshwar_1990_2022.csv",
    "rourkela": "weather_Rourkela_2021_2022.csv",
}


def get_city_file(city: str) -> Path:
    """
    Return the CSV path for a supported city.
    """

    city_key = city.strip().lower()

    if city_key not in CITY_FILES:
        supported = ", ".join(sorted(CITY_FILES.keys()))
        raise ValueError(
            f"Unsupported city: {city}. "
            f"Supported cities: {supported}"
        )

    file_path = HISTORICAL_DIR / CITY_FILES[city_key]

    if not file_path.exists():
        raise FileNotFoundError(
            f"Historical dataset not found: {file_path}"
        )

    return file_path


def load_city_weather(city: str) -> pd.DataFrame:
    """
    Load historical weather data for a city.
    """

    file_path = get_city_file(city)

    df = pd.read_csv(file_path)

    # Convert date column
    df["time"] = pd.to_datetime(
        df["time"],
        dayfirst=True,
        errors="coerce"
    )

    # Remove rows where date is invalid
    df = df.dropna(subset=["time"])

    return df


def get_latest_weather(city: str) -> dict:
    """
    Get the latest available historical weather record.
    """

    df = load_city_weather(city)

    if df.empty:
        raise ValueError(
            f"No historical weather data available for {city}."
        )

    latest = df.sort_values("time").iloc[-1]

    return {
        "city": city,
        "date": latest["time"].strftime("%Y-%m-%d"),
        "temperature_avg": (
            None if pd.isna(latest.get("tavg"))
            else float(latest["tavg"])
        ),
        "temperature_min": (
            None if pd.isna(latest.get("tmin"))
            else float(latest["tmin"])
        ),
        "temperature_max": (
            None if pd.isna(latest.get("tmax"))
            else float(latest["tmax"])
        ),
        "rainfall": (
            None if pd.isna(latest.get("prcp"))
            else float(latest["prcp"])
        ),
    }


def get_year_data(city: str, year: int) -> pd.DataFrame:
    """
    Return all historical records for a particular year.
    """

    df = load_city_weather(city)

    return df[df["time"].dt.year == year].copy()


def get_temperature_statistics(city: str, year: int) -> dict:
    """
    Calculate basic temperature statistics for a city and year.
    """

    df = get_year_data(city, year)

    if df.empty:
        raise ValueError(
            f"No data available for {city} in {year}."
        )

    return {
        "city": city,
        "year": year,
        "average_temperature": (
            None
            if df["tavg"].dropna().empty
            else round(float(df["tavg"].mean()), 2)
        ),
        "minimum_temperature": (
            None
            if df["tmin"].dropna().empty
            else round(float(df["tmin"].min()), 2)
        ),
        "maximum_temperature": (
            None
            if df["tmax"].dropna().empty
            else round(float(df["tmax"].max()), 2)
        ),
        "total_rainfall": (
            None
            if df["prcp"].dropna().empty
            else round(float(df["prcp"].sum()), 2)
        ),
    }