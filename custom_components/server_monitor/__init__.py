"""Server Monitor integration."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.panel_custom import async_register_panel
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .coordinator import ServerMonitorCoordinator
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
PLATFORMS: list[Platform] = [Platform.SENSOR]


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = ServerMonitorCoordinator(hass)
    await coordinator.async_config_entry_first_refresh()
    entry.runtime_data = {"coordinator": coordinator}

    await hass.http.async_register_static_paths([
        StaticPathConfig(
            url_path="/local/server_monitor",
            path=str(_FRONTEND_DIR),
            cache_headers=False,
        )
    ])

    await _async_register_panel(hass, entry)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    _async_remove_panel_quietly(hass)
    return unload_ok


async def _async_register_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    options = entry.options
    enabled = options.get(CONF_PANEL_ENABLED, DEFAULT_PANEL_ENABLED)

    # Always remove any existing registration first. warn_if_unknown=False
    # keeps this quiet on a normal first-ever setup (nothing to remove yet).
    _async_remove_panel_quietly(hass)

    if not enabled:
        return

    try:
        await _async_do_register_panel(hass, options)
    except ValueError:
        # "Overwriting panel" — something (a stale unload, a reload race,
        # a leftover entry from before a HA restart) left the panel
        # registered under this URL despite the removal above. Force it
        # out of the frontend's panel registry and retry once rather than
        # crashing the whole config entry setup.
        _LOGGER.warning(
            "Panel '%s' was already registered when setting up Server Monitor — "
            "forcing removal and retrying registration once",
            PANEL_URL,
        )
        _async_remove_panel_quietly(hass)
        await _async_do_register_panel(hass, options)


def _async_remove_panel_quietly(hass: HomeAssistant) -> None:
    try:
        frontend.async_remove_panel(hass, PANEL_URL, warn_if_unknown=False)
    except Exception:  # noqa: BLE001
        _LOGGER.debug("Panel '%s' was not registered — nothing to remove", PANEL_URL)


async def _async_do_register_panel(hass: HomeAssistant, options) -> None:
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
