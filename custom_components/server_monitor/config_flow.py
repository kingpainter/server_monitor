"""Config flow for Server Monitor."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, OptionsFlow
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult

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
)


class ServerMonitorConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(title="Server Monitor", data={})
        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return ServerMonitorOptionsFlow(config_entry)


class ServerMonitorOptionsFlow(OptionsFlow):
    def __init__(self, config_entry):
        self._config_entry = config_entry

    async def async_step_init(self, user_input=None):
        options = self._config_entry.options
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Optional(CONF_SIDEBAR_TITLE, default=options.get(CONF_SIDEBAR_TITLE, DEFAULT_SIDEBAR_TITLE)): str,
                vol.Optional(CONF_SIDEBAR_ICON,  default=options.get(CONF_SIDEBAR_ICON,  DEFAULT_SIDEBAR_ICON)):  str,
                vol.Optional(CONF_PANEL_ENABLED, default=options.get(CONF_PANEL_ENABLED, DEFAULT_PANEL_ENABLED)): bool,
                vol.Optional(CONF_REQUIRE_ADMIN, default=options.get(CONF_REQUIRE_ADMIN, DEFAULT_REQUIRE_ADMIN)): bool,
            }),
        )
