from backend.app.services.historical_weather import (
    get_latest_weather,
    get_temperature_statistics,
)


def main():
    city = "Mumbai"

    print("=" * 60)
    print("WeatherGPT Historical Weather Test")
    print("=" * 60)

    print(f"\nTesting city: {city}")

    try:
        latest = get_latest_weather(city)

        print("\nLatest historical record:")
        print(latest)

        stats = get_temperature_statistics(city, 2020)

        print("\n2020 Statistics:")
        print(stats)

        print("\nSUCCESS: Historical weather service is working.")

    except Exception as error:
        print("\nERROR:")
        print(error)


if __name__ == "__main__":
    main()