import React from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

export default function WeatherMap({ coordinates, label }) {
  if (!coordinates) return <section className="panel"><h2>Interactive Map</h2><p>Map will appear after weather loads.</p></section>;

  return (
    <section className="panel map-panel">
      <h2>Interactive Map</h2>
      <MapContainer center={coordinates} zoom={10} style={{ height: 360, width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={coordinates}>
          <Popup>{label || "Selected location"}</Popup>
        </Marker>
      </MapContainer>
    </section>
  );
}
