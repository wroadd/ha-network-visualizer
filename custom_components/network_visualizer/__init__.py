"""Zigbee & Z-Wave Network Visualizer integration for Home Assistant."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry

_LOGGER = logging.getLogger(__name__)

DOMAIN = "network_visualizer"
PANEL_NAME = "network-visualizer"
PANEL_TITLE = "Network Visualizer"
PANEL_ICON = "mdi:lan"
PANEL_URL = "network-visualizer"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Network Visualizer integration."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Network Visualizer from a config entry."""
    # Install panel JS files to www directory
    from .panel_installer import install_panel_files
    install_panel_files(hass)
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = entry.data

    # Register the custom panel
    hass.components.frontend.async_register_built_in_panel(
        component_name="custom",
        sidebar_title=entry.data.get("panel_title", PANEL_TITLE),
        sidebar_icon=entry.data.get("panel_icon", PANEL_ICON),
        frontend_url_path=PANEL_URL,
        config={
            "_panel_custom": {
                "name": PANEL_NAME,
                "module_url": "/local/network-visualizer/panel.js",
                "config": {
                    "z2m_mqtt_topic": entry.data.get("z2m_mqtt_topic", "zigbee2mqtt"),
                    "zwavejs_ws_url": entry.data.get("zwavejs_ws_url", ""),
                },
            }
        },
        require_admin=False,
    )

    _LOGGER.info("Network Visualizer panel registered at /%s", PANEL_URL)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    hass.components.frontend.async_remove_panel(PANEL_URL)
    hass.data[DOMAIN].pop(entry.entry_id, None)
    return True
