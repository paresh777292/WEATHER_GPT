
/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useState } from "react";

import {
  getWeatherByCity,
  getAlerts,
  sendChat,
  getClimate,
} from "./services/api";


import WeatherCard from "./components/WeatherCard/WeatherCard";
import Forecast from "./components/Forecast/Forecast";
import WeatherMap from "./components/WeatherMap/WeatherMap";
import ChatInterface from "./components/ChatInterface/ChatInterface";
import LanguageSelector from "./components/LanguageSelector/LanguageSelector";
import Alerts from "./components/Alerts/Alerts";

export default function App() {
  // ============================================================
  // STATE
  // ============================================================

  const [city, setCity] = useState("Mumbai");
  const [language, setLanguage] = useState("en");
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [climate, setClimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD CITY WEATHER
  // ============================================================

  const loadCity = useCallback(async (target) => {
    const selectedCity = (target || "").trim();

    if (!selectedCity) {
      setError("Please enter a city name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [weatherData, alertData, climateData] =
        await Promise.all([
          getWeatherByCity(selectedCity),
          getAlerts(selectedCity),
          getClimate(selectedCity),
        ]);

      setWeather(weatherData);
      setAlerts(alertData);
      setClimate(climateData);

      setCity(
        weatherData?.location?.name || selectedCity
      );
    } catch (err) {
      setError(
        err?.message || "Unable to load weather."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // INITIAL CITY LOAD
  // ============================================================

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCity("Mumbai");
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadCity]);

  // ============================================================
  // CHAT HANDLER
  // ============================================================

  async function handleChat(message) {
    const query = (message || "").trim();

    if (!query) {
      return "Please enter a weather question.";
    }

    try {
      const result = await sendChat(
        query,
        language
      );

      // --------------------------------------------------------
      // Update dashboard with chatbot weather result
      // --------------------------------------------------------

      if (result?.weather) {
        setWeather(result.weather);

        const returnedCity =
          result?.weather?.location?.name;

        if (returnedCity) {
          setCity(returnedCity);

          // ----------------------------------------------------
          // Refresh alerts and climate
          // ----------------------------------------------------

          try {
            const [newAlerts, newClimate] =
              await Promise.all([
                getAlerts(returnedCity),
                getClimate(returnedCity),
              ]);

            setAlerts(newAlerts);
            setClimate(newClimate);
          } catch {
            // Chat response remains valid even if
            // dashboard secondary requests fail.
          }
        }
      }

      // --------------------------------------------------------
      // Return chatbot response
      // --------------------------------------------------------

      return (
        result?.reply ||
        "Weather information is currently unavailable."
      );
    } catch (err) {
      throw new Error(
        err?.message ||
          "Unable to get weather response.",
        {
          cause: err,
        }
      );
    }
  }

  // ============================================================
  // MAP COORDINATES
  // ============================================================

  const coords = weather?.location
    ? [
        weather.location.latitude,
        weather.location.longitude,
      ]
    : null;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="app">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="topbar">

        <div>
          <h1>WeatherGPT</h1>

          <p>
            Conversational weather intelligence
          </p>
        </div>

        <LanguageSelector
          value={language}
          onChange={setLanguage}
        />

      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="container">

        {/* ==================================================
            CITY SEARCH
        ================================================== */}

        <section className="search-row">

          <input
            value={city}
            onChange={(e) =>
              setCity(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                loadCity(city);
              }
            }}
            placeholder="Enter city"
            disabled={loading}
          />

          <button
            onClick={() => loadCity(city)}
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : "Get Weather"}
          </button>

        </section>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* ==================================================
            CURRENT WEATHER + ALERTS
        ================================================== */}

        <section className="grid">

          <WeatherCard
            data={weather}
          />

          <Alerts
            data={alerts}
          />

        </section>

        {/* ==================================================
            7-DAY FORECAST
        ================================================== */}

        <Forecast
          data={weather?.forecast?.daily}
        />

        {/* ==================================================
            CHAT + MAP
        ================================================== */}

        <section className="two-col">

          <ChatInterface
            onSend={handleChat}
            language={language}
          />

          <WeatherMap
            coordinates={coords}
            label={
              weather?.location?.name
            }
          />

        </section>

        {/* ==================================================
            CLIMATE ANALYTICS
        ================================================== */}

        <section className="panel">

          <h2>
            Climate Analytics
          </h2>

          {climate?.data?.length ? (

            <div className="climate-grid">

              {climate.data.map((row) => (

                <div
                  className="climate-card"
                  key={row.date}
                >

                  <strong>
                    {row.date}
                  </strong>

                  <span>
                    {row.temperature_min}°C
                    {" – "}
                    {row.temperature_max}°C
                  </span>

                  <span>
                    Rain: {row.rainfall} mm
                  </span>

                  <span>
                    Rain probability:{" "}
                    {row.rain_probability}%
                  </span>

                </div>

              ))}

            </div>

          ) : (

            <p>
              No climate data available.
            </p>

          )}

          {climate?.note && (
            <small>
              {climate.note}
            </small>
          )}

        </section>

      </main>
    </div>
  );
}