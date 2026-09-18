# WeatherGPT UI Upgrade

This drop-in UI focuses on two changes:

1. Chat replies are presented as a direct answer first, followed by compact facts.
2. The Leaflet map is clickable. Clicking a place reverse-geocodes it, updates the selected location, refreshes the map marker, and makes that location the fallback city for the next chat query.

## Files

- App.jsx
- App.css

## Install dependencies (inside frontend)

If Leaflet packages are already installed, skip this.

```powershell
npm install leaflet react-leaflet
```

## Replace files

Copy:

- `App.jsx` -> `frontend/src/App.jsx`
- `App.css` -> `frontend/src/App.css`

Keep your existing `main.jsx` and project setup.

## API

The frontend defaults to:

`http://127.0.0.1:8000`

To change it, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Map behavior

- Click anywhere on the map.
- The location name is resolved from the clicked coordinates.
- The marker moves to the selected point.
- "Use This Location" refreshes weather for that place.
- A chat query without a city uses the selected map city.
- A city explicitly written inside the chat query still takes priority because the backend resolves explicit city names.

## Note

The map uses OpenStreetMap tiles and Nominatim reverse geocoding. Keep the reverse-geocoding usage modest and avoid rapid automated requests.
