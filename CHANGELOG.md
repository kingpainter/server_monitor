# Changelog

## 1.3.2 — 2026-07-16

### Changed
- **`coordinator.py`**: switched from `DataUpdateCoordinator` to `TimestampDataUpdateCoordinator`. The last-successful-check timestamp is now tracked natively via `self.last_update_success_time` instead of being hand-rolled into the returned data dict as `"last_check": dt_util.utcnow().isoformat()`. `sensor.py`'s `last_check` attribute now reads from the coordinator directly.
- **Panel/card helper functions**: `_val`, `_num`, `_isOn`, `_attr` in `server-monitor-panel.js` and `server-monitor-card.js` now delegate to the equivalent `stateOf`/`numOf`/`isOn`/`attrOf` helpers already exported by `server-monitor-shared.js`, instead of maintaining separate copies of the same logic in three places.

## 1.3.1 — 2026-07-16

### Fixed
- **Confirm-dialog listener leak (panel + card)**: `_confirm()` armed a fresh `{once:true}` click listener on `confirm-ok` every time it was called, but never removed it if the user cancelled instead. Cancelling one destructive action (e.g. reboot) left its listener still attached; confirming a *different* action afterwards (e.g. shutdown) fired both callbacks together. Old listeners are now explicitly removed before new ones are armed.
- **`config_flow.py`**: `async_get_options_flow` passed `config_entry` positionally into `ServerMonitorOptionsFlow()`. HA deprecated this pattern and it stops working as of HA 2025.12 — the options flow now takes no constructor argument and relies on the base class's automatic `self.config_entry`.
- **`Server Monthly Cost` icon**: was `mdi:currency-krw` (Korean Won) on a DKK sensor. Changed to `mdi:cash`.

### Changed
- **`Megalageret Docker Total`**: was a hardcoded literal `"18"`; now derived by counting the same container-state list used by `Megalageret Docker Running`, so the two numbers can't drift out of sync if a container is added or removed.
- **Disk section in the panel** no longer hardcodes `['nvme','sda','sdd','sdb','sdc']` — reads drive IDs from `server-monitor-shared.js`'s `DRIVES` list instead, removing a fourth duplicate copy of the drive list.
- `manifest.json`: added `"integration_type": "service"` for hassfest compliance on newer HA versions.

## 1.3.0 — 2026-07-15

### Added
- **Loading state**: panel and card now show a spinner + "Indlæser…" immediately on first render, instead of a blank element, while `server-monitor-shared.js` loads asynchronously. Tracked via a `_built` flag rather than checking `shadowRoot.innerHTML` emptiness (which broke once the skeleton itself started writing to `innerHTML`).
- **Chart.js fallback**: `_loadChartJs()` now has an 8s timeout and an `onerror` handler. If the CDN script fails to load or times out (offline, blocked CDN, etc.), the three chart areas (power, RX, TX) show a clear "Graf utilgængelig — Chart.js kunne ikke hentes" message instead of silently staying blank forever. The rest of the panel (live values, gauges, disk/docker/services) is unaffected since it never depended on Chart.js.

## 1.2.1 — 2026-07-15

### Fixed
- `Error setting up entry Server Monitor for server_monitor` / `ValueError: Overwriting panel server-monitor` — the panel-removal-before-registration logic wasn't robust against a panel already being registered under the same URL (e.g. after a reload race or a stale unload). `_async_register_panel` now catches that specific `ValueError`, force-removes the conflicting registration, and retries registration once instead of crashing the whole config entry setup. `frontend.async_remove_panel` calls now also pass `warn_if_unknown=False` to avoid noisy log warnings on a normal first-ever setup.

## 1.2.0 — 2026-07-15

### Added
- `frontend/server-monitor-shared.js` — single source of truth for entity IDs (drives, Docker containers, OMV services, energy/system/status/action entities) plus shared value helpers (`stateOf`, `numOf`, `isOn`, `attrOf`). Loaded via dynamic `import()` from both `server-monitor-panel.js` and `server-monitor-card.js`, so the two frontend files no longer maintain separate copies of the same ~50 entity IDs.
- Per-section "missing/unavailable" badges in the sidebar panel (Energi, System, Disk, Docker, Services) — reads `sensor.server_monitor_entity_health` (added in 1.1.0) and shows e.g. "⚠ 2 mangler" next to the section title instead of silently rendering "—".
- The mobile card's alert banner now also surfaces entity-health problems reported by `sensor.server_monitor_entity_health`.

### Changed
- `server-monitor-card.js` config defaults are now sourced from the shared module instead of being hardcoded a second time.

### Known limitation carried forward
- The entity ID list still exists in two places by necessity: `const.py` (`MONITORED_ENTITIES`, used by the backend health-check coordinator) and `frontend/server-monitor-shared.js` (used for rendering). Keep both in sync when entities change.

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
