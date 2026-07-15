# Changelog

## 1.1.0 — 2026-07-15

### Added
- `sensor.server_monitor_entity_health` — new diagnostics sensor. State is the number of monitored entities that are currently missing or unavailable (0 = all OK). Extra attributes list the specific missing/unavailable entity IDs and the last check timestamp.
- `coordinator.py` now actively polls (every 30s) whether the ~70 entity IDs the frontend panel/card depend on are present and available, instead of being an unused stub.
- `sensor.py` — new sensor platform, forwarded from `__init__.py`.

### Fixed
- Replaced deprecated `hass.components.frontend.async_remove_panel(...)` calls with the direct `from homeassistant.components import frontend` import, ahead of this pattern being removed from HA Core.
- `async_unload_entry` now correctly unloads the sensor platform via `async_unload_platforms` and returns its result instead of unconditionally returning `True`.

## 1.0.0 — prior

- Initial integration: config flow, sidebar panel registration, static frontend path serving `server-monitor-panel.js` and `server-monitor-card.js`.
- `packages/server_monitor.yaml`: Docker running/total template sensors, monthly kWh/cost sensors (fixed 2.50 DKK/kWh average price).
