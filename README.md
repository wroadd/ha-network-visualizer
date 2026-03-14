# Zigbee & Z-Wave Network Visualizer

Home Assistant custom integration that visualizes your **Zigbee** (via Zigbee2MQTT) and **Z-Wave** (via Z-Wave JS) networks with multiple interactive graph types.

<!-- ![Network Visualizer Screenshot](https://raw.githubusercontent.com/wroadd/ha-network-visualizer/main/docs/screenshot.png) -->

## Features

### Core (v3.0.0)
- **Four graph visualization types** — Force, Radial Tree, Organic, and Grid Matrix
- **Separate Zigbee / Z-Wave tabs** — dedicated tab for each protocol
- **Graph type selector** — switch between Force / Radial / Organic / Grid in the header
- **Zigbee topology** — coordinator, routers, end devices, LQI-colored links
- **Z-Wave topology** — controller and nodes
- **Search** — find and highlight devices by name
- **Tooltip** — hover for device details (manufacturer, model, area, LQI, IEEE)
- **Statistics bar** — device count by type, average LQI
- **Legend** — color-coded device types and LQI scale
- **Zoom controls** — zoom in/out, reset
- **Dark theme** — built-in dark UI
- **Click to highlight** — selected device and its connections highlighted
- **Persistent settings** — active tab and graph type saved in localStorage

### Graph Types

#### Force Graph (MeshGraphViewer inspired)
- D3.js force simulation with draggable nodes
- LQI color gradient on links (red → green)
- Area-based convex hull grouping
- Arrow markers for link direction
- Node position persistence in localStorage

#### Radial Tree (Alarm.com inspired)
- BFS tree layout from coordinator outward
- Concentric hop depth rings with labels
- Radial curved links colored by LQI
- LQI badges on nodes
- Coordinator at center

#### Organic Graph (Homey inspired)
- Dark neon background (#080c14)
- Neon color scheme per area (ff3366, ffaa00, b388ff, 00e676, 40c4ff)
- SVG glow filter on nodes
- Curved arc links
- Pulsing animation on coordinator/controller
- Softer force parameters for organic feel

#### Grid / Routing Table (Homey Z-Wave Developer Tools inspired)
- Dark background (#1b1b20) CSS Grid layout — no HTML tables
- **NodeID Badge**: 24×24px rounded square with pastel/vivid color from `BADGE_PALETTE`, dark text
- **Route column**: "Last working route" label followed by a badge chain connected by dashes (`-`), each badge showing the hop's NodeID in matching palette color
- **Protocol-aware columns**:
  - *Zigbee*: NodeID · Device · Route · LQI · Neighbors · Area
  - *Z-Wave*: NodeID · Device · Route · Tx Queued · Tx Sent · Tx Error · Rx · Flags
- **Coordinator / Controller** (Node 1): no stats, no route, no kebab menu
- **Kebab menu** (⋮) at row end for per-device actions
- Sticky uppercase header row
- Row hover highlight (`#25252b`)
- Responsive Inter/Roboto/system-ui font stack

### Changelog

#### v3.0.0 — Complete Rewrite
- **4 graph types**: Force (MeshGraphViewer), Radial (Alarm.com), Organic (Homey), Grid (Routing Matrix)
- **Separate Zigbee / Z-Wave tabs** (removed "All" tab)
- **Graph type selector** in header bar
- **Removed**: Floor plan view, settings modal, Lovelace card, D3 local bundle, event log, device list sidebar
- **Simplified architecture**: 4 renderer classes + main Web Component
- **localStorage persistence**: node positions, active tab, graph type

#### v2.1.0 — Settings & Floor Plan
- Settings modal (⚙) in header
- Floor plan upload with draggable room localization
- View mode toggle (Graph / Floor Plan)

#### v2.0.0 — Major Feature Update
- D3.js local bundle (offline support)
- Network health dashboard
- Real-time LQI/RSSI updates
- Room-based area layout with convex hulls
- Mobile responsiveness
- Graph position saving
- Device dropout indicators
- Historical LQI/RSSI chart
- Lovelace card version
- Z-Wave routing map + route load visualization

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
# The panel JS is automatically copied to www/ when the integration starts.
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
    manifest.json        # Integration metadata (v3.0.0)
    panel_installer.py   # Panel JS copy to www/ (automatic)
    panel.js             # Main visualizer panel (Web Component)
    strings.json         # UI strings
    brand/
      icon.png           # Integration icon
    translations/
      en.json            # English
www/
  panel.js               # Panel JS (served by HA frontend)
```

## Development Notes

The `panel.js` is a self-contained Web Component (`<network-visualizer>`) that:
- Loads D3.js v7 from CDN for graph rendering
- Communicates via HA WebSocket API (`this._hass.callWS()`)
- Runs in Shadow DOM (CSS isolation)
- Contains 4 renderer classes: `ForceGraphRenderer`, `RadialTreeRenderer`, `OrganicGraphRenderer`, `GridMatrixRenderer`
- Loads Zigbee devices from HA device registry (`mqtt`/`zigbee2mqtt_*` identifiers)
- Loads Z-Wave devices from HA device registry (`zwave_js` identifiers)
- Uses `config/area_registry/list` for room-based grouping
- Persists node positions and UI settings in `localStorage`

## Supported Languages

The integration UI is available in the following languages:
- 🇬🇧 English
- 🇭🇺 Magyar (Hungarian)
- 🇩🇪 Deutsch (German)
- 🇪🇸 Español (Spanish)
- 🇫🇷 Français (French)

## License

MIT License