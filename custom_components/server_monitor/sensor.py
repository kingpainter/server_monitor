"""Sensor platform for Server Monitor — entity health diagnostics."""
from __future__ import annotations

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, SENSOR_HEALTH_UNIQUE_ID
from .coordinator import ServerMonitorCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Server Monitor sensors from a config entry."""
    coordinator: ServerMonitorCoordinator = entry.runtime_data["coordinator"]
    async_add_entities([ServerMonitorHealthSensor(coordinator, entry)])


class ServerMonitorHealthSensor(CoordinatorEntity[ServerMonitorCoordinator], SensorEntity):
    """Reports how many entities the frontend depends on are missing/unavailable.

    State is the number of problem entities (0 = all monitored entities are
    present and have a valid state). Full lists of missing/unavailable entity
    IDs are exposed as extra state attributes for debugging.
    """

    _attr_has_entity_name = True
    _attr_translation_key = "entity_health"
    _attr_icon = "mdi:check-network-outline"
    _attr_native_unit_of_measurement = "problems"

    def __init__(self, coordinator: ServerMonitorCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = SENSOR_HEALTH_UNIQUE_ID
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="Server Monitor",
            manufacturer="Flemming",
            model="megalageret",
        )

    @property
    def native_value(self) -> int:
        return self.coordinator.data.get("problem_count", 0)

    @property
    def icon(self) -> str:
        problems = self.coordinator.data.get("problem_count", 0)
        return "mdi:alert-network-outline" if problems else "mdi:check-network-outline"

    @property
    def extra_state_attributes(self) -> dict:
        data = self.coordinator.data
        last_check = self.coordinator.last_update_success_time
        return {
            "checked": data.get("checked", 0),
            "missing_entities": data.get("missing", []),
            "unavailable_entities": data.get("unavailable", []),
            "last_check": last_check.isoformat() if last_check else None,
        }
