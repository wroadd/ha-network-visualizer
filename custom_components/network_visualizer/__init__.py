"""Zigbee & Z-Wave Network Visualizer integration for Home Assistant."""
from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import UTC, datetime
from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant, callback
from homeassistant.config_entries import ConfigEntry
from homeassistant.components.frontend import async_register_built_in_panel, async_remove_panel
from homeassistant.components import websocket_api
from homeassistant.helpers.storage import Store
from homeassistant.exceptions import HomeAssistantError

_LOGGER = logging.getLogger(__name__)

DOMAIN = "network_visualizer"
PANEL_NAME = "network-visualizer"
PANEL_TITLE = "Network Visualizer"
PANEL_ICON = "mdi:lan"
PANEL_URL = "network-visualizer"
STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}_topology"

SERVICE_SCAN_ZIGBEE_TOPOLOGY = "scan_zigbee_topology"

WS_GET_TOPOLOGY = f"{DOMAIN}/get_topology"


def _now_iso() -> str:
    """Get current UTC time in ISO format."""
    return datetime.now(UTC).isoformat()


def _ensure_domain_data(hass: HomeAssistant) -> dict[str, Any]:
    """Ensure and return integration runtime data container."""
    hass.data.setdefault(DOMAIN, {})
    data = hass.data[DOMAIN]
    data.setdefault(
        "scan_status",
        {
            "running": False,
            "last_started": None,
            "last_finished": None,
            "last_error": None,
            "last_result": None,
        },
    )
    data.setdefault(
        "topology",
        {
            "zigbeeLinks": [],
            "zigbeeNeighbors": {},
            "zigbeeScanTime": None,
        },
    )
    return data


@websocket_api.websocket_command({vol.Required("type"): WS_GET_TOPOLOGY})
@websocket_api.async_response
async def _ws_get_topology(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return backend topology cache and current scan status."""
    data = _ensure_domain_data(hass)
    connection.send_result(
        msg["id"],
        {
            "topology": data["topology"],
            "scan_status": data["scan_status"],
        },
    )


async def _save_topology(hass: HomeAssistant) -> None:
    """Persist topology cache to storage."""
    data = _ensure_domain_data(hass)
    store: Store = data["store"]
    await store.async_save(data["topology"])


def _extract_topology(raw: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Extract links and neighbors from zigbee2mqtt raw network map."""
    zigbee_links: list[dict[str, Any]] = []
    zigbee_neighbors: dict[str, Any] = {}

    links = raw.get("links")
    if isinstance(links, list):
        for link in links:
            src = link.get("source", {}).get("ieee_address")
            tgt = link.get("target", {}).get("ieee_address")
            if src and tgt:
                zigbee_links.append(
                    {
                        "source": str(src).lower(),
                        "target": str(tgt).lower(),
                        "lqi": link.get("lqi"),
                        "depth": link.get("depth"),
                        "relationship": link.get("relationship"),
                    }
                )

    nodes = raw.get("nodes")
    if isinstance(nodes, list):
        for node in nodes:
            ieee = node.get("ieee_address")
            neighbors = node.get("neighbors")
            if not ieee or not isinstance(neighbors, list):
                continue
            zigbee_neighbors[str(ieee).lower()] = [
                {
                    "ieee": nb.get("ieee_address"),
                    "lqi": nb.get("lqi"),
                    "relationship": nb.get("relationship"),
                    "depth": nb.get("depth"),
                }
                for nb in neighbors
            ]

    return zigbee_links, zigbee_neighbors


async def _run_zigbee_scan(hass: HomeAssistant, z2m_topic: str) -> None:
    """Run Zigbee network map scan in backend and persist result."""
    data = _ensure_domain_data(hass)
    status = data["scan_status"]

    if status["running"]:
        _LOGGER.debug("Zigbee scan already running, skipping new request")
        return

    if "mqtt" not in hass.config.components:
        status["running"] = False
        status["last_error"] = "MQTT integration not loaded"
        status["last_result"] = None
        _LOGGER.warning("Cannot run Zigbee scan: MQTT integration is not loaded")
        return

    status["running"] = True
    status["last_started"] = _now_iso()
    status["last_error"] = None
    status["last_result"] = None

    hass.bus.async_fire(f"{DOMAIN}_scan_started", {"topic": z2m_topic})

    from homeassistant.components import mqtt

    response_topic = f"{z2m_topic}/bridge/response/networkmap"
    request_topic = f"{z2m_topic}/bridge/request/networkmap"
    result_future: asyncio.Future[Any] = hass.loop.create_future()

    @callback
    def _on_message(msg: mqtt.ReceiveMessage) -> None:
        if not result_future.done():
            result_future.set_result(msg.payload)

    _LOGGER.info("Starting Zigbee topology scan via MQTT topic '%s'", z2m_topic)
    unsubscribe = await mqtt.async_subscribe(hass, response_topic, _on_message, 0)
    try:
        await hass.services.async_call(
            "mqtt",
            "publish",
            {
                "topic": request_topic,
                "payload": json.dumps({"type": "raw", "routes": True}),
            },
            blocking=True,
        )

        payload = await asyncio.wait_for(result_future, timeout=300)
        parsed = json.loads(payload) if isinstance(payload, str) else payload

        if parsed.get("status") != "ok" or not parsed.get("data", {}).get("value"):
            raise HomeAssistantError(parsed.get("error") or "Invalid network map response")

        raw = parsed["data"]["value"]
        zigbee_links, zigbee_neighbors = _extract_topology(raw)

        data["topology"] = {
            "zigbeeLinks": zigbee_links,
            "zigbeeNeighbors": zigbee_neighbors,
            "zigbeeScanTime": int(time.time()),
        }
        await _save_topology(hass)

        status["running"] = False
        status["last_finished"] = _now_iso()
        status["last_error"] = None
        status["last_result"] = {
            "links": len(zigbee_links),
            "neighbors": len(zigbee_neighbors),
        }

        hass.bus.async_fire(
            f"{DOMAIN}_scan_completed",
            {
                "topic": z2m_topic,
                "links": len(zigbee_links),
                "neighbors": len(zigbee_neighbors),
            },
        )
        _LOGGER.info(
            "Zigbee topology scan completed: %s links, %s neighbor sets",
            len(zigbee_links),
            len(zigbee_neighbors),
        )
    except (TimeoutError, asyncio.TimeoutError) as err:
        status["running"] = False
        status["last_error"] = "Scan timeout (5 min)"
        status["last_result"] = None
        _LOGGER.warning("Zigbee topology scan timed out: %s", err)
        hass.bus.async_fire(f"{DOMAIN}_scan_failed", {"error": status["last_error"]})
    except Exception as err:  # pylint: disable=broad-except
        status["running"] = False
        status["last_error"] = str(err)
        status["last_result"] = None
        _LOGGER.exception("Zigbee topology scan failed: %s", err)
        hass.bus.async_fire(f"{DOMAIN}_scan_failed", {"error": str(err)})
    finally:
        unsubscribe()


async def _async_start_scan(hass: HomeAssistant, z2m_topic: str) -> None:
    """Start backend scan task if not already running."""
    data = _ensure_domain_data(hass)
    status = data["scan_status"]
    if status["running"]:
        return
    hass.async_create_task(_run_zigbee_scan(hass, z2m_topic))


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Network Visualizer integration."""
    _ensure_domain_data(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Network Visualizer from a config entry."""
    # Install panel JS files to www directory (non-blocking)
    from .panel_installer import install_panel_files
    await hass.async_add_executor_job(install_panel_files, hass)

    data = _ensure_domain_data(hass)
    if "store" not in data:
        data["store"] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        stored = await data["store"].async_load()
        if isinstance(stored, dict):
            data["topology"] = {
                "zigbeeLinks": stored.get("zigbeeLinks", []),
                "zigbeeNeighbors": stored.get("zigbeeNeighbors", {}),
                "zigbeeScanTime": stored.get("zigbeeScanTime"),
            }

    if not data.get("ws_registered"):
        websocket_api.async_register_command(hass, _ws_get_topology)
        data["ws_registered"] = True

    if not data.get("service_registered"):
        async def _handle_scan_service(call) -> None:
            topic = entry.data.get("z2m_mqtt_topic", "zigbee2mqtt")
            force = bool(call.data.get("force", False))
            if force:
                _LOGGER.debug("Forced scan requested via service")
            await _async_start_scan(hass, topic)

        hass.services.async_register(
            DOMAIN,
            SERVICE_SCAN_ZIGBEE_TOPOLOGY,
            _handle_scan_service,
            schema=vol.Schema({vol.Optional("force", default=False): bool}),
        )
        data["service_registered"] = True

    hass.data[DOMAIN][entry.entry_id] = entry.data

    # Register the custom panel
    async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=entry.data.get("panel_title", PANEL_TITLE),
        sidebar_icon=entry.data.get("panel_icon", PANEL_ICON),
        frontend_url_path=PANEL_URL,
        config={
            "_panel_custom": {
                "name": PANEL_NAME,
                "module_url": f"/local/network-visualizer/panel.js?v={int(time.time())}",
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
    async_remove_panel(hass, PANEL_URL)
    hass.data[DOMAIN].pop(entry.entry_id, None)

    if not any(k for k in hass.data[DOMAIN].keys() if k not in {"scan_status", "topology", "store", "ws_registered", "service_registered"}):
        if hass.services.has_service(DOMAIN, SERVICE_SCAN_ZIGBEE_TOPOLOGY):
            hass.services.async_remove(DOMAIN, SERVICE_SCAN_ZIGBEE_TOPOLOGY)

    return True
