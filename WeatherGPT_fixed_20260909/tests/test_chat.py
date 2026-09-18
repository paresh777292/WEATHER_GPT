from backend.app.main import chat_reply

def test_chat_reply():
    weather = {
        "location": {"name": "Mumbai"},
        "forecast": {"current": {
            "temperature_2m": 30,
            "weather_code": 1,
            "wind_speed_10m": 10,
            "precipitation": 0,
        }},
    }
    text = chat_reply("weather in Mumbai", weather, "en")
    assert "Mumbai" in text
