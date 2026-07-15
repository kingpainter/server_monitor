# Server Monitor

Home Assistant custom integration for monitoring the home server "megalageret" (OMV-based). Provides a sidebar panel and a compact mobile card showing power/energy, RAM/GPU, disk health, Docker containers, OMV services, and server actions (reboot/shutdown/prune).

## Architecture

- `custom_components/server_monitor/` — the integration itself:
  - `__init__.py` — sets up the config entry, registers the frontend static path and sidebar panel, forwards sensor platform setup.
  - `coordinator.py` — `DataUpdateCoordinator` that polls (every 30s) whether the ~70 entities the frontend depends on (owned by other integrations: OMV, energy meter, Docker container sensors, ...) are present and available. It does **not** fetch server metrics itself.
  - `sensor.py` — exposes `sensor.server_monitor_entity_health`, a diagnostics sensor reporting how many monitored entities are missing/unavailable.
  - `const.py` — includes `MONITORED_ENTITIES`, the list of entity IDs the frontend depends on. **Kept in sync manually with the frontend JS files**, which read the same entities directly via `hass.states` for rendering.
  - `frontend/` — `server-monitor-shared.js` (single source of truth for entity IDs + value/health helpers, loaded via dynamic `import()`), `server-monitor-panel.js` (full sidebar panel) and `server-monitor-card.js` (compact card), served as static files.
- `packages/server_monitor.yaml` — HA template sensors: Docker running/total container counts, monthly kWh, and monthly cost (fixed average price, not live spot price — see comments in the file for why).

## Design notes

- Color palette: sky/indigo (`--accent: #38bdf8`, `--accent2: #818cf8`).
- The integration does **not** own or poll the server's actual metrics (disk, CPU, GPU, network) — those come entirely from the OMV integration and are read directly by the frontend. The coordinator's role is entity-health monitoring, not data collection.

## Known limitations

- The list of entity IDs the panel depends on is hardcoded in both `const.py` (for health checks) and `frontend/server-monitor-shared.js` (for rendering, shared between panel and card). If OMV or another integration renames an entity, both places need updating.
- Chart.js is loaded from a CDN at panel load time; no offline fallback yet.
- The panel/card are served via `js_url` (classic script), not `module_url`, so `server-monitor-shared.js` is loaded via dynamic `import()` at runtime rather than a static `import` statement at the top of the file. This works in all modern browsers but means the shared module loads asynchronously on first render.
