import { useEffect, useMemo, useState } from "react";
import axios from "axios";

function pickDailyForecast(list) {
  // OpenWeather 5-day forecast is every 3 hours.
  // We'll pick ~12:00 forecasts (best "midday" representative).
  const byDay = {};

  for (const item of list || []) {
    const dt = new Date(item.dt * 1000);
    const dayKey = dt.toISOString().slice(0, 10); // YYYY-MM-DD
    const hour = dt.getHours();

    // pick the forecast closest to 12:00
    if (!byDay[dayKey] || Math.abs(hour - 12) < Math.abs(byDay[dayKey].hour - 12)) {
      byDay[dayKey] = { hour, item };
    }
  }

  const days = Object.entries(byDay)
    .map(([date, v]) => ({ date, ...v.item }))
    .sort((a, b) => a.dt - b.dt);

  // remove "today" (first one) and take next 3 days
  return days.slice(1, 4);
}

function dayLabel(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { weekday: "short" });
}

export default function WeatherPanel({ city = "Kathmandu" }) {
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [err, setErr] = useState("");

  const key = process.env.REACT_APP_OPENWEATHER_KEY;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setErr("");

        if (!key) {
          setErr("Missing API key. Add REACT_APP_OPENWEATHER_KEY in .env and restart.");
          return;
        }

        //current weather
        const curRes = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`
        );

        // forecast (5-day / 3-hour)
        const fcRes = await axios.get(
          `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${key}&units=metric`
        );

        if (cancelled) return;

        setCurrent(curRes.data);
        setForecast(pickDailyForecast(fcRes.data?.list));
      } catch (e) {
        if (cancelled) return;
        setErr("Weather unavailable (check API key, city name, or network).");
        console.log("Weather fetch failed:", e);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [city, key]);

  const iconUrl = useMemo(() => {
    const icon = current?.weather?.[0]?.icon;
    return icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : "";
  }, [current]);

  return (
    <div className="panel glass weather-panel">
      <div className="weather-top">
        <div>
          <div className="weather-title">Weather</div>
          <div className="weather-sub">
            {current ? `${current.name} • Now` : "Loading..."}
          </div>
        </div>

        {iconUrl ? (
          <img className="weather-icon" src={iconUrl} alt="weather" />
        ) : (
          <div className="weather-icon-fallback">⏳</div>
        )}
      </div>

      {err ? (
        <div className="weather-error">{err}</div>
      ) : current ? (
        <>
          <div className="weather-main-row">
            <div className="weather-temp">{Math.round(current.main.temp)}°C</div>
            <div className="weather-desc">{current.weather?.[0]?.main}</div>
          </div>

          <div className="weather-stats">
            <div className="w-stat">
              <div className="w-stat-label">Humidity</div>
              <div className="w-stat-value">{current.main.humidity}%</div>
            </div>
            <div className="w-stat">
              <div className="w-stat-label">Wind</div>
              <div className="w-stat-value">{Math.round(current.wind.speed)} m/s</div>
            </div>
          </div>

          <div className="weather-forecast">
            {forecast.map((d) => {
              const icon = d.weather?.[0]?.icon;
              const url = icon ? `https://openweathermap.org/img/wn/${icon}.png` : "";
              return (
                <div className="wf-card" key={d.dt}>
                  <div className="wf-day">{dayLabel(d.dt)}</div>
                  {url ? <img className="wf-icon" src={url} alt="forecast" /> : <div>☁️</div>}
                  <div className="wf-temp">{Math.round(d.main.temp)}°C</div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="weather-loading">Loading...</div>
      )}
    </div>
  );
}
