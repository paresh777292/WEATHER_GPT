def calculate_risk(temperature: float, wind_speed: float, rain_probability: float) -> dict:
    score = 10
    reasons = []

    if temperature >= 40:
        score = max(score, 85)
        reasons.append("Very high temperature")
    elif temperature >= 35:
        score = max(score, 60)
        reasons.append("High temperature")

    if wind_speed >= 60:
        score = max(score, 85)
        reasons.append("Strong wind")
    elif wind_speed >= 40:
        score = max(score, 60)
        reasons.append("Elevated wind")

    if rain_probability >= 80:
        score = max(score, 80)
        reasons.append("High rain probability")
    elif rain_probability >= 60:
        score = max(score, 55)
        reasons.append("Moderate rain probability")

    severity = "low" if score < 40 else "moderate" if score < 70 else "high"
    return {"score": score, "severity": severity, "reasons": reasons}
