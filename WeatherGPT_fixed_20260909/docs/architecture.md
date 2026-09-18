# WeatherGPT Architecture

Frontend -> FastAPI -> NLU/risk layer -> weather/geocoding services.
For production, add PostgreSQL, official warning feeds, WIS2/MQTT/WebSocket,
NWP (GFS/WRF) ingestion, historical datasets, authentication and cloud monitoring.
