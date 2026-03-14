"""
Panel file installer - copies JS panel to www directory.
Called during integration setup to ensure the panel JS is available.
"""
from __future__ import annotations

import logging
import shutil
from pathlib import Path

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

PANEL_JS = "panel.js"
WWW_SUBDIR = "network-visualizer"


def install_panel_files(hass: HomeAssistant) -> bool:
    """Copy panel JS to HA www directory."""
    # Panel JS is bundled inside the component directory (works with HACS)
    source_dir = Path(__file__).parent
    dest_dir = Path(hass.config.path("www")) / WWW_SUBDIR

    try:
        dest_dir.mkdir(parents=True, exist_ok=True)
        ok = True
        for filename in (PANEL_JS,):
            src = source_dir / filename
            dst = dest_dir / filename
            if src.exists():
                shutil.copy2(src, dst)
                _LOGGER.info("Installed %s to %s", filename, dst)
            else:
                _LOGGER.warning("Source not found: %s", src)
                ok = False
        return ok
    except Exception as e:
        _LOGGER.error("Failed to install panel files: %s", e)
        return False
