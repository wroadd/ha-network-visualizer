#!/usr/bin/env bash
# Network Visualizer - Manuális telepítő script
# Futtatás: bash install.sh /path/to/homeassistant/config

set -e

HA_CONFIG="${1:-/config}"

echo "=== Network Visualizer telepítő ==="
echo "HA config könyvtár: $HA_CONFIG"

# custom_components (panel.js is now bundled inside the component)
DEST_CC="$HA_CONFIG/custom_components/network_visualizer"
echo "→ custom_components másolása: $DEST_CC"
mkdir -p "$DEST_CC"
cp -r "$(dirname "$0")/custom_components/network_visualizer/." "$DEST_CC/"

echo ""
echo "ℹ  A panel JS automatikusan másolódik a www/ alá az integráció indulásakor."

echo ""
echo "✓ Telepítés kész!"
echo ""
echo "Következő lépések:"
echo "  1. Indítsd újra a Home Assistantot"
echo "  2. Settings → Devices & Services → Add Integration → Network Visualizer"
echo "  3. Az oldalsávban megjelenik a 'Network Visualizer' menüpont"
