# WeatherGPT

A working prototype matching the requested WeatherGPT architecture.

## Included
- React + Vite frontend
- FastAPI backend
- Natural-language weather queries
- City geocoding
- Current weather and 7-day forecast
- Risk/alert prototype
- Interactive Leaflet map
- English/Hindi/Marathi response templates
- Browser speech input/output
- Forecast-based analytics prototype
- Docker setup
- Basic backend tests

## Data source
The prototype uses Open-Meteo for geocoding and weather forecast data. For a production/hackathon submission, official meteorological sources such as IMD/authorized warning feeds and appropriate NWP/satellite products should be integrated where permitted.

## Run locally

### Backend
From the project root:

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

### Frontend
Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Optional environment
Copy the environment templates:

- `.env.example` -> `.env` for backend API keys and CORS configuration.
- `frontend/.env.example` -> `frontend/.env` only when the API is served at a non-default URL.

Never commit a real `.env` file or share API keys in a ZIP/repository.

No weather API key is required for this prototype.

## Docker
From project root:

```bash
docker compose up --build
```

Then open http://localhost:5173

## Important production note
The climate endpoint currently visualizes forecast data, not multi-year historical climate data. Replace it with a proper historical dataset/API before claiming historical climate trends in the final project.
