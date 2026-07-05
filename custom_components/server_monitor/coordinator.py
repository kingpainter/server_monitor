"""DataUpdateCoordinator for Server Monitor."""
from __future__ import annotations

import logging
from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# Polling interval — increase if server is under load
SCAN_INTERVAL = timedelta(seconds=30)


class ServerMonitorCoordinator(DataUpdateCoordinator[dict]):
    """Coordinator that will fetch server metrics when sensor platforms are added.

    Currently the integration relies on HA template sensors (packages/server_monitor.yaml)
    and a frontend panel that reads entities directly via WebSocket.  No polling is done
    yet — the coordinator acts as a stable foundation so sensor platforms can be wired
    in later without restructuring the integration.

    To add a real data source:
    1. Implement _async_fetch_data() below.
    2. Add sensor.py with entities that read from coordinator.data.
    3. Register the platform in async_setup_entry() in __init__.py.
    """

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=SCAN_INTERVAL,
        )

    async def _async_update_data(self) -> dict:
        """Fetch data from the server.

        Replace the stub below with real I/O (SSH, REST, MQTT …) when ready.
        Raise UpdateFailed on transient errors so HA can mark entities unavailable
        and retry automatically on the next interval.
        """
        try:
            return await self._async_fetch_data()
        except Exception as err:  # noqa: BLE001
            raise UpdateFailed(f"Error fetching server monitor data: {err}") from err

    async def _async_fetch_data(self) -> dict:
        """Stub — replace with real data fetching logic.

        Expected return shape (extend freely):
        {
            "cpu_percent": 12.4,
            "ram_percent": 67.1,
            "disks": {"sda": {"temp": 38, "smart_ok": True}, ...},
            "gpu": {"temp": 55, "load_percent": 20},
            "network": {"eth0": {"rx_mbps": 1.2, "tx_mbps": 0.4}, ...},
        }
        """
        return {}
