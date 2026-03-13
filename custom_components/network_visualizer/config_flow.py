"""Config flow for Network Visualizer integration."""
from __future__ import annotations

from typing import Any
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult

from . import DOMAIN

STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Optional("panel_title", default="Network Visualizer"): str,
        vol.Optional("panel_icon", default="mdi:lan"): str,
        vol.Optional("z2m_mqtt_topic", default="zigbee2mqtt"): str,
        vol.Optional("zwavejs_ws_url", default=""): str,
    }
)


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

        return self.async_show_form(
            step_id="user",
            data_schema=STEP_USER_DATA_SCHEMA,
            description_placeholders={
                "z2m_topic_hint": "zigbee2mqtt",
                "zwavejs_hint": "ws://localhost:3000",
            },
        )
