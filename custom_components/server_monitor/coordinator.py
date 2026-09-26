"""DataUpdateCoordinator for Server Monitor."""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import TimestampDataUpdateCoordinator, UpdateFailed

from .const import DOMAIN, MONITORED_ENTITIES

_LOGGER = logging.getLogger(__name__)

# Polling interval — increase if server is under load
SCAN_INTERVAL = timedelta(seconds=30)


class ServerMonitorCoordinator(TimestampDataUpdateCoordinator[dict[str, Any]]):
    """Coordinator that polls the health of entities the frontend depends on.

    The Server Monitor panel/card do not read from this integration's own
    entities — they read ~70 entity IDs owned by other integrations (OMV,
    energy meter, Docker container sensors, ...) directly via hass.states.
    If one of those is renamed or disappears upstream, the UI silently shows
    "—" with no warning.

    This coordinator polls MONITORED_ENTITIES (see const.py) every
    SCAN_INTERVAL and reports which ones are missing or unavailable, so a
    diagnostics sensor (sensor.py) can surface the problem as an entity
    state instead of a silent dash in the panel.

    Uses TimestampDataUpdateCoordinator (rather than plain
    DataUpdateCoordinator) so the last successful check time is tracked by
    HA itself via self.last_update_success_time, instead of hand-rolling a
    "last_check" timestamp in the returned data.
    """

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=SCAN_INTERVAL,
        )

    async def _async_update_data(self) -> dict[str, Any]:
        """Check health of MONITORED_ENTITIES.

        This never raises UpdateFailed for missing/unavailable monitored
        entities — that is the exact condition this coordinator exists to
        detect and report, not a coordinator failure. UpdateFailed is
        reserved for genuine unexpected errors during the check itself.
        """
        try:
            return await self._async_fetch_data()
        except Exception as err:  # noqa: BLE001
            raise UpdateFailed(f"Error checking server monitor entity health: {err}") from err

    async def _async_fetch_data(self) -> dict[str, Any]:
        """Check which monitored entities are missing or unavailable.

        Return shape:
        {
            "checked": 70,
            "missing": ["sensor.foo", ...],       # entity_id not registered at all
            "unavailable": ["sensor.bar", ...],   # entity_id is unavailable/unknown
            "problem_count": 2,
        }

        The last-check timestamp is not part of this dict — it's read from
        self.last_update_success_time (provided by TimestampDataUpdateCoordinator)
        in sensor.py instead.
        """
        missing: list[str] = []
        unavailable: list[str] = []

        for entity_id in MONITORED_ENTITIES:
            state = self.hass.states.get(entity_id)
            if state is None:
                missing.append(entity_id)
            elif state.state in ("unavailable", "unknown"):
                unavailable.append(entity_id)

        if missing or unavailable:
            _LOGGER.warning(
                "Server Monitor entity health issues: %d missing %s, %d unavailable %s",
                len(missing), missing[:5] if missing else [],
                len(unavailable), unavailable[:5] if unavailable else [],
            )

        return {
            "checked": len(MONITORED_ENTITIES),
            "missing": missing,
            "unavailable": unavailable,
            "problem_count": len(missing) + len(unavailable),
        }
