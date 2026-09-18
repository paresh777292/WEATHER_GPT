import re
from typing import Dict, Optional

def process_query(text: str) -> Dict[str, Optional[str]]:
    """Simple deterministic NLU layer used by the prototype."""
    lowered = text.lower()

    if any(word in lowered for word in ["rain", "बारिश", "पाऊस", "rainfall"]):
        intent = "rain_query"
    elif any(word in lowered for word in ["forecast", "tomorrow", "कल", "उद्या"]):
        intent = "forecast_query"
    elif any(word in lowered for word in ["temperature", "temp", "तापमान"]):
        intent = "temperature_query"
    else:
        intent = "weather_query"

    match = re.search(
        r"\b(?:in|at|near|for)\s+([A-Za-z][A-Za-z .'-]{1,60})",
        text,
        flags=re.IGNORECASE,
    )
    location = match.group(1).strip(" .,?!") if match else None

    return {"intent": intent, "location": location, "language": "en"}
