(function() {
    'use strict';

    var debugLog = document.getElementById('debug-log');
    function log(msg) {
        if (debugLog) {
            var div = document.createElement('div');
            div.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
            debugLog.appendChild(div);
            debugLog.scrollTop = debugLog.scrollHeight;
        }
        console.log(msg);
    }

    log('App Init - v1.2.7 - Layout & Simplification');

    var serverUrl = 'http://' + window.location.hostname + ':5000';
    var socket = io(serverUrl, { transports: ['polling', 'websocket'], upgrade: true, reconnection: true });

    var socValue = document.getElementById('soc-value');
    var powerVal = document.getElementById('power-val');
    var voltageVal = document.getElementById('voltage-val');
    var currentVal = document.getElementById('current-val');
    var tempVal = document.getElementById('temp-val');
    var chargingIndicator = document.getElementById('charging-indicator');
    var clockEl = document.getElementById('clock');
    var dateEl = document.getElementById('date');
    var statusTag = document.getElementById('status-tag');
    var gradStop = document.getElementById('gradient-stop');
    var gradTop = document.getElementById('gradient-top');
    var battShells = document.querySelectorAll('.batt-shell');
    var packGrid = document.getElementById('pack-grid');
    var weatherTimeline = document.getElementById('weather-timeline');

    var socChart = null;
    var socHistory = [];

    function getTodayStart() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
    function formatTime(ms) { var d = new Date(ms); var h = d.getHours(); var m = d.getMinutes(); return (h < 10 ? '0'+h : h) + ':' + (m < 10 ? '0'+m : m); }

    if (window.Chart) {
        try {
            var ctx = document.getElementById('soc-chart').getContext('2d');
            socChart = new Chart(ctx, {
                type: 'line',
                data: { datasets: [{ label: 'SOC', data: [], borderColor: '#00f2ff', backgroundColor: 'rgba(0, 242, 255, 0.1)', borderWidth: 2, pointRadius: 0, fill: true, lineTension: 0.2 }] },
                options: { 
                    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
                    scales: { 
                        xAxes: [{ type: 'linear', ticks: { min: getTodayStart(), max: getTodayStart() + 86400000, fontColor: '#00f2ff', fontSize: 8, stepSize: 3600000 * 3, callback: function(value) { return formatTime(value); } }, gridLines: { color: 'rgba(0, 242, 255, 0.1)' } }],
                        yAxes: [{ ticks: { min: 0, max: 100, fontColor: '#00f2ff', fontSize: 10, fontFamily: 'Orbitron' }, gridLines: { color: 'rgba(0, 242, 255, 0.1)' } }]
                    }, 
                    legend: { display: false },
                    tooltips: { callbacks: { title: function(items) { return 'TIME: ' + formatTime(items[0].xLabel); }, label: function(item) { return 'SOC: ' + item.yLabel + '%'; } } }
                }
            });
        } catch(e) { log('Chart Error: ' + e); }
    }

    socket.on('connect', function() { log('Connected!'); statusTag.textContent = 'ONLINE'; });

    socket.on('soc_history', function(data) {
        log('History synced: ' + data.length + ' pts');
        socHistory = data.map(function(pt) { return { x: pt.t, y: pt.val }; });
        if (socChart) { socChart.data.datasets[0].data = socHistory; socChart.update(); }
    });

    socket.on('weather_data', function(data) {
        log('Weather updated: ' + data.length + ' steps');
        updateWeatherUI(data);
    });

    socket.on('solar_data', function(data) {
        updateUI(data);
        updatePackGrid(data);
    });

    function updateUI(data) {
        try {
            if (data.soc !== undefined) {
                var sVal = Math.round(data.soc);
                socValue.textContent = sVal;
                if (gradStop) gradStop.setAttribute('offset', sVal + '%');
                if (gradTop) gradTop.setAttribute('offset', sVal + '%');
            }
            if (data.power !== undefined) {
                var p = Math.round(data.power);
                powerVal.textContent = Math.abs(p);
                // Charging indicator and glow color
                // High power charging (>3500W) - orange glow
                if (p > 3500) {
                    powerVal.classList.add('high-power');
                    chargingIndicator.className = 'high-power-glow';
                    chargingIndicator.textContent = 'FAST CHARGING ' + p + 'W';
                    document.getElementById('battery-svg').classList.add('high-power-charging');
                    document.querySelector('.battery-card').classList.add('high-power-card');
                    setBattAnimation('charging');
                } else if (p > 50) {
                    powerVal.classList.remove('high-power');
                    chargingIndicator.className = '';
                    chargingIndicator.textContent = 'CHARGING ' + p + 'W';
                    document.getElementById('battery-svg').classList.remove('high-power-charging');
                    document.querySelector('.battery-card').classList.remove('high-power-card');
                    setBattAnimation('charging');
                } else if (p < -50) {
                    powerVal.classList.remove('high-power');
                    chargingIndicator.className = '';
                    chargingIndicator.textContent = 'DISCHARGING ' + Math.abs(p) + 'W';
                    document.getElementById('battery-svg').classList.remove('high-power-charging');
                    document.querySelector('.battery-card').classList.remove('high-power-card');
                    setBattAnimation('discharging');
                } else {
                    powerVal.classList.remove('high-power');
                    chargingIndicator.className = 'hidden';
                    document.getElementById('battery-svg').classList.remove('high-power-charging');
                    document.querySelector('.battery-card').classList.remove('high-power-card');
                    setBattAnimation('none');
                }
            }
            if (data.voltage !== undefined) voltageVal.textContent = data.voltage.toFixed(1);
            if (data.current !== undefined) currentVal.textContent = data.current.toFixed(2);
            if (data.temp !== undefined) tempVal.textContent = Math.round(data.temp);
        } catch(e) { log('UI Err: ' + e); }
    }

    function updatePackGrid(data) {
        if (!packGrid || !data.packs) return;
        for (var id in data.packs) {
            var pack = data.packs[id];
            var elId = 'pack-unit-' + id;
            var el = document.getElementById(elId);
            if (!el) {
                el = document.createElement('div'); el.id = elId; el.className = 'pack-unit';
                packGrid.appendChild(el);
            }
            var html = '<div class="pack-unit-header"><span>PACK ' + id + '</span><span>' + Math.round(pack.soc) + '%</span></div>';
            html += '<div class="pack-stat-row"><span class="pack-stat-label">Volt:</span><span class="pack-stat-value">' + (pack.voltage ? pack.voltage.toFixed(1) : '--') + 'V</span></div>';
            html += '<div class="pack-stat-row"><span class="pack-stat-label">Curr:</span><span class="pack-stat-value">' + (pack.current ? pack.current.toFixed(1) : '--') + 'A</span></div>';
            html += '<div class="pack-stat-row"><span class="pack-stat-label">Temp:</span><span class="pack-stat-value">' + (pack.temp ? Math.round(pack.temp) : '--') + '°C</span></div>';
            if (pack.vdiff !== undefined) html += '<div class="pack-stat-row pack-vdiff"><span class="pack-stat-label">Diff:</span><span class="pack-stat-value">' + pack.vdiff.toFixed(3) + 'V</span></div>';
            el.innerHTML = html;
            
            var curr = pack.current || 0;
            el.className = 'pack-unit' + (curr > 0.5 ? ' pack-charging' : (curr < -0.5 ? ' pack-discharging' : ''));
        }
    }

    function updateWeatherUI(data) {
        if (!weatherTimeline) return;
        var html = '';
        var today = new Date().getDate();
        for (var i = 0; i < Math.min(data.length, 16); i++) {
            var item = data[i];
            var d = new Date(item.t);
            var timeStr = (d.getHours() < 10 ? '0' + d.getHours() : d.getHours()) + ':00';
            var dateStr = (d.getDate() < 10 ? '0' + d.getDate() : d.getDate()) + '/' + (d.getMonth()+1 < 10 ? '0' + (d.getMonth()+1) : (d.getMonth()+1));
            
            var isTomorrow = d.getDate() !== today;
            var wrapClass = isTomorrow ? 'weather-step weather-tomorrow' : 'weather-step';
            var iconUrl = 'http://openweathermap.org/img/wn/' + item.icon + '.png';
            
            html += '<div class="' + wrapClass + '">';
            html += '<span class="weather-date-part">' + dateStr + '</span>';
            html += '<span class="weather-time-part">' + timeStr + '</span>';
            html += '<div class="weather-icon-box"><img src="' + iconUrl + '" alt="icon" width="30" height="30"></div>';
            html += '<div class="weather-temp">' + Math.round(item.temp) + '°</div>';
            html += '</div>';
        }
        weatherTimeline.innerHTML = html;
    }

    function setBattAnimation(type) {
        for (var i = 0; i < battShells.length; i++) {
            var shell = battShells[i];
            var baseClass = 'batt-shell';
            if (type === 'charging') shell.setAttribute('class', baseClass + ' charging-anim');
            else if (type === 'discharging') shell.setAttribute('class', baseClass + ' discharging-anim');
            else shell.setAttribute('class', baseClass);
        }
    }

    function updateClock() {
        try {
            var now = new Date();
            var h = now.getHours(); var m = now.getMinutes(); var s = now.getSeconds();
            h = h < 10 ? '0' + h : h; m = m < 10 ? '0' + m : m; s = s < 10 ? '0' + s : s;
            clockEl.textContent = h + ':' + m + ':' + s;
            var days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            var months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            dateEl.textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
        } catch(e) {}
        setTimeout(updateClock, 1000);
    }

    var currentScale = 1.0;
    window.changeScale = function(delta) {
        currentScale += delta;
        if (currentScale < 0.5) currentScale = 0.5;
        if (currentScale > 1.5) currentScale = 1.5;
        var container = document.querySelector('.dashboard-container');
        if (container) { container.style.webkitTransform = 'scale(' + currentScale + ')'; container.style.transform = 'scale(' + currentScale + ')'; }
    };

    updateClock();
})();
