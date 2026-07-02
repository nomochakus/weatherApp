const weatherCodes = {
  0: { icon: "☀️", desc: "Clear sky" },
  1: { icon: "🌤️", desc: "Mainly clear" },
  2: { icon: "⛅", desc: "Partly cloudy" },
  3: { icon: "☁️", desc: "Overcast" },
  45: { icon: "🌫️", desc: "Foggy" },
  48: { icon: "🌫️", desc: "Depositing rime fog" },
  51: { icon: "🌦️", desc: "Light drizzle" },
  53: { icon: "🌦️", desc: "Moderate drizzle" },
  55: { icon: "🌧️", desc: "Dense drizzle" },
  61: { icon: "🌧️", desc: "Slight rain" },
  63: { icon: "🌧️", desc: "Moderate rain" },
  65: { icon: "🌧️", desc: "Heavy rain" },
  71: { icon: "🌨️", desc: "Slight snow" },
  73: { icon: "🌨️", desc: "Moderate snow" },
  75: { icon: "❄️", desc: "Heavy snow" },
  77: { icon: "🌨️", desc: "Snow grains" },
  80: { icon: "🌦️", desc: "Slight rain showers" },
  81: { icon: "🌧️", desc: "Moderate rain showers" },
  82: { icon: "⛈️", desc: "Violent rain showers" },
  85: { icon: "🌨️", desc: "Slight snow showers" },
  86: { icon: "❄️", desc: "Heavy snow showers" },
  95: { icon: "⛈️", desc: "Thunderstorm" },
  96: { icon: "⛈️", desc: "Thunderstorm with hail" },
  99: { icon: "⛈️", desc: "Thunderstorm with heavy hail" },
};

function getWeatherIcon(code) {
  return weatherCodes[code] || { icon: "❓", desc: "Unknown" };
}

function getDayName(dateStr) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  return days[date.getDay()];
}

async function getCoordinates(city) {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
  );
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("City not found");
  }
  return data.results[0];
}

async function getWeather(lat, lon) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`,
  );
  return await response.json();
}

function drawChart(hourlyData) {
  const canvas = document.getElementById("tempChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const hours = hourlyData.time.slice(0, 24).map((t) => new Date(t).getHours());
  const temps = hourlyData.temperature_2m.slice(0, 24);

  const padding = 40;
  const chartWidth = rect.width - padding * 2;
  const chartHeight = rect.height - padding * 2;

  const minTemp = Math.min(...temps) - 2;
  const maxTemp = Math.max(...temps) + 2;
  const tempRange = maxTemp - minTemp;

  ctx.clearRect(0, 0, rect.width, rect.height);

  // Draw grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + chartWidth, y);
    ctx.stroke();

    const temp = maxTemp - (tempRange / 4) * i;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(Math.round(temp) + "°", padding - 10, y + 4);
  }

  // Draw line
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();

  const points = temps.map((temp, i) => ({
    x: padding + (i / (temps.length - 1)) * chartWidth,
    y: padding + chartHeight - ((temp - minTemp) / tempRange) * chartHeight,
  }));

  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cp1x = (points[i - 1].x + points[i].x) / 2;
    const cp1y = points[i - 1].y;
    const cp2x = (points[i - 1].x + points[i].x) / 2;
    const cp2y = points[i].y;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i].x, points[i].y);
  }
  ctx.stroke();

  // Fill area under line
  ctx.lineTo(points[points.length - 1].x, padding + chartHeight);
  ctx.lineTo(points[0].x, padding + chartHeight);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(
    0,
    padding,
    0,
    padding + chartHeight,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.3)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw points
  points.forEach((point, i) => {
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(temps[i] + "°", point.x, point.y - 10);

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(hours[i] + ":00", point.x, rect.height - 10);
    }
  });
}

async function searchWeather() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) return;

  document.getElementById("loading").classList.add("active");
  document.getElementById("errorMsg").classList.remove("active");
  document.getElementById("weatherContent").classList.add("hidden");

  try {
    const location = await getCoordinates(city);
    const weather = await getWeather(location.latitude, location.longitude);
    displayWeather(location, weather);
  } catch (err) {
    document.getElementById("errorMsg").textContent =
      err.message === "City not found"
        ? "❌ City not found. Please check the spelling and try again."
        : "❌ Error fetching weather data. Please try again.";
    document.getElementById("errorMsg").classList.add("active");
  } finally {
    document.getElementById("loading").classList.remove("active");
  }
}

function displayWeather(location, weather) {
  const current = weather.current;
  const daily = weather.daily;
  const hourly = weather.hourly;
  const weatherInfo = getWeatherIcon(current.weather_code);

  document.getElementById("cityName").textContent =
    `${location.name}, ${location.country_code?.toUpperCase() || ""}`;
  document.getElementById("currentTemp").textContent =
    `${Math.round(current.temperature_2m)}°`;
  document.getElementById("weatherIcon").textContent = weatherInfo.icon;
  document.getElementById("condition").textContent = weatherInfo.desc;
  document.getElementById("feelsLike").textContent =
    `${Math.round(current.apparent_temperature)}°`;
  document.getElementById("humidity").textContent =
    `${current.relative_humidity_2m}%`;
  document.getElementById("wind").textContent =
    `${current.wind_speed_10m} km/h`;
  document.getElementById("uvIndex").textContent = daily.uv_index_max[0];

  // Forecast
  const forecastList = document.getElementById("forecastList");
  forecastList.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const info = getWeatherIcon(daily.weather_code[i]);
    const item = document.createElement("div");
    item.className = "forecast-item";
    item.innerHTML = `
                    <span class="day">${getDayName(daily.time[i])}</span>
                    <span class="icon">${info.icon}</span>
                    <div class="temps">
                        <span class="high">${Math.round(daily.temperature_2m_max[i])}°</span>
                        <span class="low">${Math.round(daily.temperature_2m_min[i])}°</span>
                    </div>
                `;
    forecastList.appendChild(item);
  }

  // Highlights
  const highlightsList = document.getElementById("highlightsList");
  highlightsList.innerHTML = `
                <div class="forecast-item">
                    <span>🌅 Sunrise</span>
                    <span>${new Date(daily.sunrise[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div class="forecast-item">
                    <span>🌇 Sunset</span>
                    <span>${new Date(daily.sunset[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div class="forecast-item">
                    <span>🔥 Max UV</span>
                    <span>${daily.uv_index_max[0]}</span>
                </div>
                <div class="forecast-item">
                    <span>📈 High / Low</span>
                    <span>${Math.round(daily.temperature_2m_max[0])}° / ${Math.round(daily.temperature_2m_min[0])}°</span>
                </div>
            `;

  document.getElementById("weatherContent").classList.remove("hidden");

  setTimeout(() => drawChart(hourly), 100);
}

function getLocation() {
  if (!navigator.geolocation) {
    document.getElementById("errorMsg").textContent =
      "❌ Geolocation is not supported by your browser.";
    document.getElementById("errorMsg").classList.add("active");
    return;
  }

  document.getElementById("loading").classList.add("active");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Reverse geocoding to get city name
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/get?id=`,
        );
        // Use coordinates directly for weather
        const weather = await getWeather(lat, lon);

        // Try to get location name from reverse geocoding
        const reverseRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
        );
        const reverseData = await reverseRes.json();

        const locationName = {
          name: reverseData.city || reverseData.locality || "Your Location",
          country_code: reverseData.countryCode,
          latitude: lat,
          longitude: lon,
        };

        displayWeather(locationName, weather);
        document.getElementById("cityInput").value = locationName.name;
      } catch (err) {
        document.getElementById("errorMsg").textContent =
          "❌ Could not fetch weather for your location.";
        document.getElementById("errorMsg").classList.add("active");
      } finally {
        document.getElementById("loading").classList.remove("active");
      }
    },
    () => {
      document.getElementById("errorMsg").textContent =
        "❌ Unable to retrieve your location.";
      document.getElementById("errorMsg").classList.add("active");
      document.getElementById("loading").classList.remove("active");
    },
  );
}

// Enter key support
document.getElementById("cityInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchWeather();
});

// Handle resize for chart
window.addEventListener("resize", () => {
  const canvas = document.getElementById("tempChart");
  if (
    canvas &&
    !document.getElementById("weatherContent").classList.contains("hidden")
  ) {
    // Re-draw if we have data
  }
});
