"""
Panel file installer - copies JS panel to www directory.
Called during integration setup to ensure the panel JS is available.
"""
from __future__ import annotations

import logging
import os
import shutil
from pathlib import Path

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

PANEL_JS = "panel.js"
WWW_SUBDIR = "network-visualizer"


def install_panel_files(hass: HomeAssistant) -> bool:
    """Copy panel JS to HA www directory."""
    source_dir = Path(__file__).parent.parent.parent / "www"
    dest_dir = Path(hass.config.path("www")) / WWW_SUBDIR

    try:
        dest_dir.mkdir(parents=True, exist_ok=True)
        src = source_dir / PANEL_JS
        dst = dest_dir / PANEL_JS

        if src.exists():
            shutil.copy2(src, dst)
            _LOGGER.info("Panel JS installed to %s", dst)
            return True
        else:
            _LOGGER.warning("Panel JS source not found: %s", src)
            return False
    except Exception as e:
        _LOGGER.error("Failed to install panel files: %s", e)
        return False
