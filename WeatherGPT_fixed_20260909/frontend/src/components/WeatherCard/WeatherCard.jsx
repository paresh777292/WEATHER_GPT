import React from "react";

export default function WeatherCard({ data }) {
  if (!data) return <section className="panel"><h2>Current Weather</h2><p>Loading...</p></section>;

  const c = data.forecast.current;
  return (
    <section className="panel">
      <h2>{data.location.name}, {data.location.country}</h2>
      <div className="current-temp">{Math.round(c.temperature_2m)}°C</div>
      <p>{c.weather_code !== undefined ? "Weather code: " + c.weather_code : ""}</p>
      <div className="stats">
        <span>Feels like: {Math.round(c.apparent_temperature)}°C</span>
        <span>Humidity: {c.relative_humidity_2m}%</span>
        <span>Wind: {c.wind_speed_10m} km/h</span>
        <span>Rain: {c.precipitation} mm</span>
        <span>Pressure: {c.pressure_msl} hPa</span>
      </div>
      <div className={`risk risk-${data.risk?.severity || "low"}`}>
        Risk: {data.risk?.severity || "low"} ({data.risk?.score ?? 0}/100)
      </div>
    </section>
  );
}
