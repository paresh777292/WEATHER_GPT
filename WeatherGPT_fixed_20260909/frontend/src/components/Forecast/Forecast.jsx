import React from "react";

export default function Forecast({ data }) {
  if (!data?.time) return <section className="panel"><h2>7-Day Forecast</h2><p>Loading...</p></section>;

  return (
    <section className="panel">
      <h2>7-Day Forecast</h2>
      <div className="forecast-grid">
        {data.time.map((date, i) => (
          <div className="forecast-card" key={date}>
            <strong>{date}</strong>
            <span>{Math.round(data.temperature_2m_min[i])}°C – {Math.round(data.temperature_2m_max[i])}°C</span>
            <span>Rain: {data.rain_sum[i]} mm</span>
            <span>Rain probability: {data.precipitation_probability_max[i]}%</span>
            <span>Wind max: {data.wind_speed_10m_max[i]} km/h</span>
          </div>
        ))}
      </div>
    </section>
  );
}
