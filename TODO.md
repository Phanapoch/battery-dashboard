# 🔋 Solar Battery Dashboard - Tron Legacy Edition 🧚‍♀️✨

Project Location: `/home/ice/battery-dashboard`
Target Device: iPad 3 (Legacy Browser Support)
Theme: Sci-Fi / Tron Legacy (Neon Blue/Grid/Glow)

## 🛠️ Tech Stack Planning
- **Frontend:** Vanilla JS + CSS Grid/Flexbox (Lightweight & Compatible with iPad 3 Safari)
- **Visuals:** SVG + CSS Animations (Neon Glow) + Google Fonts (Orbitron/Roboto Mono)
- **Data Source:** Real-time push via WebSocket
- **Backend:** Python Flask + Flask-SocketIO (Proxy for Home Assistant API)

---

## 📝 TODO LIST (Step-by-Step for Lisa)

### Phase 1: Foundation & Static UI 🦴
- [x] 1.1 **Project Init:** Create `index.html`, `style.css`, `app.js` in `/home/ice/battery-dashboard`
- [x] 1.2 **Tron Layout:** Design the background grid (Neon Blue) and main layout containers (Header, Battery Card, Stats Panel)
- [x] 1.3 **Battery Component:** Code an SVG battery representation with neon glow effects and dynamic fill level (0-100%)
- [x] 1.4 **Legacy Browser Check:** Ensure CSS/HTML renders correctly for iPad 3 (2048 x 1536 resolution)

### Phase 2: Real-time Data Service (Backend) ⚡
- [x] 2.1 **WebSocket Server:** Create `server.py` using Flask-SocketIO to serve the frontend and handle real-time data pushing
- [x] 2.2 **Home Assistant Integration:** Implement background tasks to fetch data from HA API:
- [x] 2.3 **Data Optimization:** Ensure the JSON payload is minimal for legacy hardware performance

### Phase 3: Live Connection (Frontend) 📡
- [x] 3.1 **Socket Integration:** Implement Socket.io client in `app.js` (Use a version compatible with older browsers)
- [x] 3.2 **UI Binding:** Update the SVG battery level and text elements dynamically when receiving WebSocket events
- [x] 3.3 **Tron Pulse Effects:** Trigger CSS animations/pulses on UI elements during data updates or charging state

### Phase 4: Optimization & Legacy Support 🍎
- [x] 4.1 **Polyfills & Transpiling:** Check for modern JS syntax and replace with legacy-friendly code (No optional chaining, template literals check, etc.)
- [x] 4.2 **Resource Management:** Limit heavy filters (blur/dropshadow) to maintain 30+ FPS on iPad 3 hardware.

---
### Phase 5: Enhanced Visuals (v1.0.2) 🧚‍♀️✨
- [x] 5.1 **SOC History Graph:** Replace Solar Yield with 24h SOC Line Chart (using Chart.js)
- [x] 5.2 **Dynamic Animation:** Implement direction-based glow on battery shell:
    - **Blue Pulse (Charging):** When battery power is positive.
    - **Orange/Red Pulse (Discharging):** When battery power is negative.
- [x] 5.3 **Real-time Status Text:** Update "CHARGING..." text with actual Wattage.

---
*Note for Lisa: Please update this file by ticking [x] when a task is completed. Good luck!*
