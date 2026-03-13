# Zigbee & Z-Wave Network Visualizer

Home Assistant custom integration that visualizes your **Zigbee** (via Zigbee2MQTT) and **Z-Wave** (via Z-Wave JS) networks on an interactive force-directed graph.

<!-- ![Network Visualizer Screenshot](https://raw.githubusercontent.com/wroadd/ha-network-visualizer/main/docs/screenshot.png) -->

## Features

### Core
- **Interactive D3.js force-directed network graph** — drag, zoom, pan
- **Zigbee topology** — coordinator, routers, end devices, LQI values on edges
- **Z-Wave topology** — controller and nodes with RSSI indicators
- **Device list sidebar** — search, filter by network type
- **Detail panel** — IEEE address, manufacturer, model, security class, last seen
- **Event log** — real-time Z2M and Z-Wave event log
- **Statistics bar** — Zigbee/Z-Wave device count, routers, coordinators
- **Native dark mode** — follows Home Assistant theme
- **Click to highlight** — selected device connections highlighted

### v2.0.0 — New Features

1. **D3.js Local Bundle (Offline Support)** — D3.js v7 is bundled locally in the integration; no CDN dependency required. Falls back to CDN if local file is unavailable.

2. **Network Health Dashboard** — Top-level health indicators showing average LQI, weak link count, offline device count, and overall network health percentage with color-coded status.

3. **Real-time LQI/RSSI Updates** — Subscribes to `state_changed` events and updates device signal quality in real-time without requiring manual refresh.

4. **Room-based Layout (Area Registry)** — Integrates with Home Assistant's area registry to group devices by room. Devices assigned to areas are visually clustered together with convex hull overlays and area labels.

5. **Full Mobile Responsiveness** — Hamburger menu for device list, slide-out panels, touch swipe gestures to open/close sidebars, and adaptive layout for screens under 900px.

6. **Graph Position Saving (localStorage)** — Dragged node positions are persisted to `localStorage`. When you reload, devices stay where you placed them. A "Clear positions" button resets the layout.

7. **Device Dropout Indicators on Graph** — Devices that haven't reported in over 1 hour are marked directly on the graph with a pulsing red ring, red fill, and ✗ icon. Stale devices also appear dimmed in the device list with a red indicator dot.

8. **Historical LQI/RSSI Chart** — A new "History" tab in the detail panel shows a time-series SVG chart of LQI/RSSI values with trend indicators (↑↓→). Data is accumulated in `localStorage` (up to 100 data points per device).

9. **Lovelace Card Version** — Use the visualizer as a dashboard card! Add `network-visualizer-card` to any Lovelace dashboard. Configurable height and auto-registered in the card picker.

10. **Z-Wave Routing Map + Route Load Visualization** — Fetches actual Z-Wave mesh topology via `zwave_js/get_node_neighbors` and node statistics via `zwave_js/get_node_statistics`. Links are colored and sized by route load (TX+RX command volume). Detail panel shows per-node route statistics including TX/RX counts, dropped packets, and last RSSI.

## Data Sources

| Source | Data | Protocol |
|---|---|---|
| Zigbee2MQTT | Device list, LQI, network map | MQTT → HA WS API |
| Z-Wave JS (HA integration) | Node list, RSSI, neighbors, route stats | HA WebSocket API |
| HA Entity Registry | Zigbee linkquality sensor attributes | HA WebSocket API |
| HA Area Registry | Device-to-room mapping | HA WebSocket API |
| HA Device Registry | Device identifiers for area mapping | HA WebSocket API |

## Installation

### HACS (Recommended)

1. HACS → Integrations → ⋮ menu → **Custom repositories**
2. Repository URL: `https://github.com/wroadd/ha-network-visualizer`
3. Category: **Integration**
4. Add → search for: **Network Visualizer** → Download
5. Restart Home Assistant

### Manual Installation

```bash
# In your HA config directory:
mkdir -p custom_components/network_visualizer
# Copy the contents of custom_components/network_visualizer/ here
# The panel JS + D3.js are automatically copied to www/ when the integration starts.
```

### Configuration

1. Settings → Devices & Services → Add Integration → "Network Visualizer"
2. Fill in the fields:

| Field | Description | Default |
|---|---|---|
| Panel title | Sidebar panel name | Network Visualizer |
| Panel icon | MDI icon | mdi:lan |
| Zigbee2MQTT base topic | Z2M MQTT base topic | zigbee2mqtt |
| Z-Wave JS UI WebSocket URL | ZUI WebSocket URL (auto-detected) | — |

3. The panel will appear in the sidebar.

### Lovelace Card Usage

Add a card to any dashboard:

```yaml
type: custom:network-visualizer-card
height: 500
z2m_mqtt_topic: zigbee2mqtt
```

The card auto-registers itself in the Lovelace card picker.

## Requirements

- Home Assistant 2024.1+
- Zigbee2MQTT (HA add-on or external) — publishes on Z2M MQTT topics
- Z-Wave JS integration (optional) — the "zwave_js" HA integration is required

## Zigbee2MQTT Configuration

The visualizer requires Z2M to have bridge/devices and networkmap messages enabled:

```yaml
# configuration.yaml (z2m)
advanced:
  log_level: info
# Networkmap request is triggered automatically from the integration
```

## Structure

```
custom_components/
  network_visualizer/
    __init__.py          # HA integration setup, panel registration
    config_flow.py       # UI configuration flow
    manifest.json        # Integration metadata
    panel_installer.py   # Panel JS + D3.js copy to www/ (automatic)
    panel.js             # Main visualizer panel (Web Component + Lovelace card)
    d3.min.js            # D3.js v7 local bundle (offline support)
    strings.json         # UI strings
    brand/
      icon.png           # Integration icon
    translations/
      en.json            # English
      hu.json            # Hungarian
      de.json            # German
      es.json            # Spanish
      fr.json            # French
www/
  panel.js               # Panel JS (manual install fallback)
```

## Development Notes

The `panel.js` is a self-contained Web Component (`<network-visualizer>`) that:
- Loads D3.js v7 locally (with CDN fallback) for graph rendering
- Communicates via HA WebSocket API (`this._hass.connection`)
- Runs in Shadow DOM (CSS isolation)
- Loads Zigbee2MQTT data through MQTT publish + HA state_changed events
- Fetches Z-Wave data via `config/device_registry/list` (device registry), `zwave_js/get_node_neighbors`, `zwave_js/get_node_statistics` WS messages
- Uses `config/area_registry/list` and `config/device_registry/list` for room-based layout
- Persists node positions and LQI history in `localStorage`
- Also registers `<network-visualizer-card>` for Lovelace dashboard usage

## Supported Languages

The integration UI is available in the following languages:
- 🇬🇧 English
- 🇭🇺 Magyar (Hungarian)
- 🇩🇪 Deutsch (German)
- 🇪🇸 Español (Spanish)
- 🇫🇷 Français (French)

## License

MIT License