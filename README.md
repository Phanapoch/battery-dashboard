# 🔋 Solar Battery Dashboard - Tron Legacy Edition

A real-time energy monitoring dashboard designed specifically for legacy devices like **iPad 3 (iOS 9/10)**. It features a futuristic Tron Legacy theme with glowing neon elements and provides a comprehensive view of your solar battery system.

![Dashboard Preview](https://github.com/Phanapoch/battery-dashboard/raw/main/preview.jpg) *(Example Preview)*

## ✨ Features
- **Real-time Data:** Live updates from Home Assistant via WebSockets (falling back to Polling for legacy browsers).
- **Tron Legacy Theme:** High-contrast neon blue/orange design with grid backgrounds and glowing SVG components.
- **Legacy Compatibility:** Optimized for iPad 3 Safari using Flexbox (avoiding CSS Grid) and Chart.js v2.9.4.
- **Detailed Monitoring:**
    - Main Battery SOC with animated SVG fill.
    - 24-hour SOC History Chart.
    - Real-time stats: Power (W), Voltage (V), Current (A), and Temperature (°C).
    - Individual Pack Monitoring (PACK 01-06) with horizontal scroll.
    - Weather Forecast Timeline (48H) with auto-caching.
- **Responsive Layout:** Supports both Landscape (2-column) and Portrait (Stacked) modes.
- **Integrated Clock:** Large digital clock and date display in the footer.

## 🛠️ Tech Stack
- **Frontend:** Vanilla JavaScript, CSS Flexbox, SVG, [Chart.js v2.9.4](https://www.chartjs.org/), [Socket.io v4.7.5](https://socket.io/).
- **Backend:** Python [Flask](https://flask.palletsprojects.com/), [Flask-SocketIO](https://flask-socketio.readthedocs.io/).
- **Data Source:** [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/).

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.8+
- Home Assistant with a Long-Lived Access Token.
- OpenWeatherMap API Key (optional for weather forecast).

### 2. Installation
```bash
git clone git@github.com:Phanapoch/battery-dashboard.git
cd battery-dashboard
pip install -r requirements.txt
```

### 3. Configuration
Create a `.env` file in the root directory:
```env
HA_URL=http://your-home-assistant-ip:8123
HA_TOKEN=your-long-lived-access-token
OWM_API_KEY=your-openweathermap-api-key
```

### 4. Running the Dashboard
```bash
python3 server.py
```
Access the dashboard at `http://your-server-ip:5000`.

## 📱 Legacy Device Tips (iPad 3)
- Use the **"Add to Home Screen"** feature in Safari to run the dashboard in full-screen mode without address bars.
- Use the **+ / -** buttons in the header to scale the UI perfectly for your device's resolution.

## 📄 License
MIT License. Feel free to modify and use!
