import time
import requests
import json
import os
import re
from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit
from threading import Thread, Event
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'tron-battery-dashboard'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Paths
HISTORY_FILE = os.path.join(os.path.dirname(__file__), 'soc_history.json')
WEATHER_FILE = os.path.join(os.path.dirname(__file__), 'weather_cache.json')
ENERGY_FILE = os.path.join(os.path.dirname(__file__), 'pack_energy.json')

# Config from Env
HA_URL = os.getenv('HA_URL')
HA_TOKEN = os.getenv('HA_TOKEN')
OWM_KEY = os.getenv('OWM_API_KEY')
OWM_URL = f"http://api.openweathermap.org/data/2.5/forecast?q=Phasi Charoen,th&units=metric&appid={OWM_KEY}"

HEADERS = { "Authorization": f"Bearer {HA_TOKEN}", "content-type": "application/json" }

ENTITY_MAP = {
    'sensor.ec3024_esm_total_soc': 'soc',
    'sensor.ec3024_esm_total_battery_power': 'power',
    'sensor.ec3024_esm_bus_voltage': 'voltage',
    'sensor.ec3024_esm_total_bus_current': 'current',
    'sensor.ec3024_battery_highest_cell_temp': 'temp'
}

PACK_RE = re.compile(r'sensor\.ec3024_battery_(\d+)_(state_of_charge|pack_voltage|current|highest_cell_temp|cell_voltage_diff)')

# Shared state
data_store = {}
history_store = []
weather_cache = {}
stop_event = Event()

# Energy tracking per pack
pack_energy = {}  # {pack_id: {'in': Wh, 'out': Wh, 'date': 'YYYY-MM-DD', 'last_update': timestamp}}
last_pack_update = {}  # {pack_id: timestamp}

def load_persistence():
    global history_store, weather_cache
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r') as f: history_store = json.load(f)
        except: history_store = []
    if os.path.exists(WEATHER_FILE):
        try:
            with open(WEATHER_FILE, 'r') as f: weather_cache = json.load(f)
        except: weather_cache = {}

def save_history():
    try:
        with open(HISTORY_FILE, 'w') as f: json.dump(history_store, f)
    except: pass

def load_energy():
    global pack_energy
    today = time.strftime('%Y-%m-%d')
    if os.path.exists(ENERGY_FILE):
        try:
            with open(ENERGY_FILE, 'r') as f: pack_energy = json.load(f)
            # Reset if new day
            for pid in pack_energy:
                if pack_energy[pid].get('date') != today:
                    pack_energy[pid] = {'in': 0, 'out': 0, 'date': today}
        except: pack_energy = {}

def save_energy():
    try:
        with open(ENERGY_FILE, 'w') as f: json.dump(pack_energy, f)
    except: pass

def update_pack_energy(packs):
    global pack_energy, last_pack_update
    today = time.strftime('%Y-%m-%d')
    now = time.time()

    for p_id, pack in packs.items():
        # Initialize pack if not exists
        if p_id not in pack_energy:
            pack_energy[p_id] = {'in': 0, 'out': 0, 'date': today}
        # Reset if new day
        if pack_energy[p_id].get('date') != today:
            pack_energy[p_id] = {'in': 0, 'out': 0, 'date': today}

        current = pack.get('current', 0)
        voltage = pack.get('voltage', 0)

        if current != 0 and voltage != 0:
            # Calculate power in watts
            power = current * voltage

            # Time since last update (in hours)
            if p_id in last_pack_update:
                dt = (now - last_pack_update[p_id]) / 3600.0
                energy_wh = power * dt  # Wh = W * hours

                if current > 0:  # Charging
                    pack_energy[p_id]['in'] += energy_wh
                else:  # Discharging
                    pack_energy[p_id]['out'] += abs(energy_wh)

            last_pack_update[p_id] = now

    # Emit energy data to clients
    if pack_energy:
        socketio.emit('pack_energy', pack_energy)

    # Save periodically (every ~1 minute)
    if int(now) % 60 < 3:
        save_energy()

def fetch_weather():
    global weather_cache
    if not OWM_KEY: return []
    
    now = int(time.time())
    if 'timestamp' in weather_cache and (now - weather_cache['timestamp'] < 3600):
        return weather_cache['data']
    
    try:
        resp = requests.get(OWM_URL, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            forecast = []
            for item in data['list']:
                forecast.append({
                    't': item['dt'] * 1000,
                    'temp': item['main']['temp'],
                    'icon': item['weather'][0]['icon'],
                    'desc': item['weather'][0]['description']
                })
            weather_cache = {'timestamp': now, 'data': forecast}
            with open(WEATHER_FILE, 'w') as f: json.dump(weather_cache, f)
            return forecast
    except: pass
    return weather_cache.get('data', [])

def fetch_ha_data():
    last_history_time = 0
    last_weather_time = 0
    while not stop_event.is_set():
        try:
            if int(time.time()) - last_weather_time > 60:
                wf = fetch_weather()
                if wf: socketio.emit('weather_data', wf)
                last_weather_time = int(time.time())

            if not HA_URL or not HA_TOKEN:
                time.sleep(10)
                continue

            response = requests.get(f"{HA_URL}/api/states", headers=HEADERS, timeout=5)
            if response.status_code == 200:
                all_states = response.json()
                current_batch = {'packs': {}}
                for state in all_states:
                    entity_id = state['entity_id']
                    if state['state'] in ['unknown', 'unavailable']: continue
                    try: val = float(state['state'])
                    except: continue

                    if entity_id in ENTITY_MAP:
                        key = ENTITY_MAP[entity_id]
                        current_batch[key] = val
                        data_store[key] = val
                        if key == 'soc':
                            now = int(time.time())
                            if now - last_history_time >= 300:
                                history_store.append({'t': now * 1000, 'val': val})
                                if len(history_store) > 300: history_store.pop(0)
                                last_history_time = now
                                save_history()

                    match = PACK_RE.match(entity_id)
                    if match:
                        p_id, p_type = match.groups()
                        if p_id not in current_batch['packs']: current_batch['packs'][p_id] = {}
                        if p_type == 'state_of_charge': current_batch['packs'][p_id]['soc'] = val
                        elif p_type == 'pack_voltage': current_batch['packs'][p_id]['voltage'] = val
                        elif p_type == 'current': current_batch['packs'][p_id]['current'] = val
                        elif p_type == 'highest_cell_temp': current_batch['packs'][p_id]['temp'] = val
                        elif p_type == 'cell_voltage_diff': current_batch['packs'][p_id]['vdiff'] = val
                
                if current_batch:
                    data_store['packs'] = current_batch['packs']
                    update_pack_energy(current_batch['packs'])
                    socketio.emit('solar_data', current_batch)
        except: pass
        time.sleep(3)

@app.route('/')
def index(): return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_proxy(path): return send_from_directory('.', path)

@socketio.on('connect')
def handle_connect():
    if data_store: emit('solar_data', data_store)
    if history_store: emit('soc_history', history_store)
    if pack_energy: emit('pack_energy', pack_energy)
    wf = fetch_weather()
    if wf: emit('weather_data', wf)

if __name__ == '__main__':
    load_persistence()
    load_energy()
    data_thread = Thread(target=fetch_ha_data)
    data_thread.daemon = True
    data_thread.start()
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
