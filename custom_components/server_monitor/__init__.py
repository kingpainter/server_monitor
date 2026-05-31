"""Server Monitor integration."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.components.panel_custom import async_register_panel
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    CONF_PANEL_ENABLED,
    CONF_REQUIRE_ADMIN,
    CONF_SIDEBAR_ICON,
    CONF_SIDEBAR_TITLE,
    DEFAULT_PANEL_ENABLED,
    DEFAULT_REQUIRE_ADMIN,
    DEFAULT_SIDEBAR_ICON,
    DEFAULT_SIDEBAR_TITLE,
    DOMAIN,
    PANEL_JS_URL,
    PANEL_URL,
)

_LOGGER = logging.getLogger(__name__)
_FRONTEND_DIR = Path(__file__).parent / "frontend"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    entry.runtime_data = {}

    await hass.http.async_register_static_paths([
        StaticPathConfig(
            url_path="/local/server_monitor",
            path=str(_FRONTEND_DIR),
            cache_headers=False,
        )
    ])

    await _async_register_panel(hass, entry)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    try:
        hass.components.frontend.async_remove_panel(PANEL_URL)
    except Exception:  # noqa: BLE001
        pass
    return True


async def _async_register_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    options = entry.options
    enabled = options.get(CONF_PANEL_ENABLED, DEFAULT_PANEL_ENABLED)

    try:
        hass.components.frontend.async_remove_panel(PANEL_URL)
    except Exception:  # noqa: BLE001
        pass

    if not enabled:
        return

    await async_register_panel(
        hass,
        webcomponent_name="server-monitor-panel",
        sidebar_title=options.get(CONF_SIDEBAR_TITLE, DEFAULT_SIDEBAR_TITLE),
        sidebar_icon=options.get(CONF_SIDEBAR_ICON, DEFAULT_SIDEBAR_ICON),
        frontend_url_path=PANEL_URL,
        require_admin=options.get(CONF_REQUIRE_ADMIN, DEFAULT_REQUIRE_ADMIN),
        config={},
        js_url=PANEL_JS_URL,
        trust_external=False,
    )


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
