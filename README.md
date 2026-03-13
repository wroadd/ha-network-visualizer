# Zigbee & Z-Wave Network Visualizer

Home Assistant custom integration that visualizes your **Zigbee** (via Zigbee2MQTT) and **Z-Wave** (via Z-Wave JS) networks on an interactive force-directed graph.

![Network Visualizer Screenshot](https://raw.githubusercontent.com/wroadd/ha-network-visualizer/main/docs/screenshot.png)

## Features

- **Interactive D3.js force-directed network graph** — drag, zoom, pan
- **Zigbee topológia** — koordinátor, routerek, végpontok, LQI értékek az éleken
- **Z-Wave topológia** — kontroller és csomópontok, RSSI jelzéssel
- **Eszközlista oldalpanel** — keresés, szűrés hálózat szerint
- **Részlet panel** — IEEE cím, gyártó, modell, biztonsági osztály, utolsó látva
- **Eseménynapló** — valós idejű Z2M és Z-Wave eseménynapló
- **Sztatisztika sáv** — Zigbee/Z-Wave eszközök száma, routerek, koordinátorok
- **Dark mode natív** — Home Assistant témát követ
- Kattintásra kiemelés — kijelölt eszköz kapcsolatai kiemelt állapotban

## Adat-források

| Forrás | Adatok | Protokoll |
|---|---|---|
| Zigbee2MQTT | Eszközlista, LQI, hálózati térkép | MQTT → HA WS API |
| Z-Wave JS (HA integráció) | Node lista, RSSI, státusz | HA WebSocket API |
| HA Entity Registry | Zigbee linkquuality sensor attribútumok | HA WebSocket API |

## Telepítés

### HACS (ajánlott)

1. HACS → Integrations → ⋮ menü → **Custom repositories**
2. Repository URL: `https://github.com/wroadd/ha-network-visualizer`
3. Kategória: **Integration**
4. Add → keress rá: **Network Visualizer** → Download
5. HA újraindítás

### Manuális telepítés

```bash
# HA config könyvtárban:
mkdir -p custom_components/network_visualizer
# Másold ide a custom_components/network_visualizer/ tartalmát

mkdir -p www/network-visualizer
# Másold ide a www/panel.js fájlt → www/network-visualizer/panel.js
```

### Konfiguráció

1. Settings → Devices & Services → Add Integration → "Network Visualizer"
2. Kitöltendő mezők:

| Mező | Leírás | Alapértelmezett |
|---|---|---|
| Panel title | Oldalpanel neve | Network Visualizer |
| Panel icon | MDI ikon | mdi:lan |
| Zigbee2MQTT base topic | Z2M MQTT alap topic | zigbee2mqtt |
| Z-Wave JS UI WebSocket URL | ZUI WebSocket URL (opcionális) | - |

3. A panel megjelenik az oldalsávban.

## Követelmények

- Home Assistant 2024.1+
- Zigbee2MQTT (HA add-on vagy külső) — a Z2M MQTT topicjain publikál
- Z-Wave JS integráció (opcionális) — az "zwave_js" HA integráció szükséges

## Zigbee2MQTT konfiguráció

A vizualizátorhoz a Z2M-nek engedélyezni kell a bridge/devices és networkmap üzeneteket:

```yaml
# configuration.yaml (z2m)
advanced:
  log_level: info
# Networkmap lekérdezés automatikusan megtörténik az integrációból
```

## Struktúra

```
custom_components/
  network_visualizer/
    __init__.py          # HA integration setup, panel regisztráció
    config_flow.py       # UI konfiguráció flow
    manifest.json        # Integration metaadatok
    panel_installer.py   # Panel JS másolása www/ alá
    strings.json         # UI szövegek
    translations/
      en.json

www/
  panel.js               # Fő vizualizátor panel (Web Component)
```

## Fejlesztési megjegyzések

A `www/panel.js` egy self-contained Web Component (`<network-visualizer>`), amely:
- D3.js v7-et tölt be CDN-ről a gráf rendereléshez
- HA WebSocket API-n keresztül kommunikál (`this._hass.connection`)
- Shadow DOM-ban fut (CSS izoláció)
- Zigbee2MQTT adatokat MQTT publish + HA state_changed eventeken keresztül tölt
- Z-Wave adatokat `zwave_js/get_nodes` WS üzenettel kér le

## Licenc

MIT License
