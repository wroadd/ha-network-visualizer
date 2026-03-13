"""Config flow for Network Visualizer integration."""
from __future__ import annotations

from typing import Any
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult

from . import DOMAIN


def _get_zwave_ws_url(hass: HomeAssistant) -> str:
    """Try to detect Z-Wave JS WebSocket URL from existing config entries."""
    for entry in hass.config_entries.async_entries("zwave_js"):
        url = entry.data.get("url", "")
        if url:
            return url
    return ""


class NetworkVisualizerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Network Visualizer."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(
                title="Network Visualizer",
                data=user_input,
            )

        # Auto-detect Z-Wave JS WebSocket URL if installed
        zwave_url = _get_zwave_ws_url(self.hass)

        schema = vol.Schema(
            {
                vol.Optional("panel_title", default="Network Visualizer"): str,
                vol.Optional("panel_icon", default="mdi:lan"): str,
                vol.Optional("z2m_mqtt_topic", default="zigbee2mqtt"): str,
                vol.Optional("zwavejs_ws_url", default=zwave_url): str,
            }
        )

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
        )