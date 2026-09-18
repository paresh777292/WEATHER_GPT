from backend.app.main import detect_risk

def test_heatwave_risk():
    result = detect_risk(
        {"temperature_2m": 42, "wind_speed_10m": 10, "rain": 0, "weather_code": 0},
        {"precipitation_probability_max": [10], "rain_sum": [0]},
    )
    assert result["severity"] == "high"
    assert result["score"] >= 80
