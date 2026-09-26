"""Constants for Server Monitor integration."""

DOMAIN = "server_monitor"
VERSION = "1.3.3"

CONF_SIDEBAR_TITLE = "sidebar_title"
CONF_SIDEBAR_ICON = "sidebar_icon"
CONF_PANEL_ENABLED = "panel_enabled"
CONF_REQUIRE_ADMIN = "require_admin"

DEFAULT_SIDEBAR_TITLE = "Server Monitor"
DEFAULT_SIDEBAR_ICON = "mdi:server"
DEFAULT_PANEL_ENABLED = True
DEFAULT_REQUIRE_ADMIN = False

PANEL_URL = "server-monitor"
PANEL_JS_URL = "/local/server_monitor/server-monitor-panel.js"
CARD_JS_URL  = "/local/server_monitor/server-monitor-card.js"

# ─── Entity health diagnostics ──────────────────────────────────────────────
# The frontend panel/card read these entities directly by ID. They live in
# other integrations (OMV, energy meter, Docker container sensors, ...) and
# are NOT owned by this integration. If one of them disappears or is renamed
# upstream, the panel silently shows "—" with no warning. The coordinator
# polls this list every SCAN_INTERVAL and exposes a health sensor so problems
# surface as an entity state instead of a silent dash in the UI.
#
# NOTE: this list is duplicated (by necessity) in the frontend JS files,
# which read the same entities directly via hass.states for rendering.
# Keep both in sync when entities are added/removed/renamed.
SENSOR_HEALTH_UNIQUE_ID = "server_monitor_entity_health"

MONITORED_ENTITIES: tuple[str, ...] = (
    # OMV — status bar
    "sensor.omv_megalageret_local_uptime",
    "binary_sensor.omv_megalageret_local_reboot_required",
    "update.omv_megalageret_local_system_update",
    "sensor.omv_megalageret_local_available_package_updates",
    "sensor.omv_megalageret_local_docker_containers_not_running",
    # OMV — system (RAM/GPU/NIC)
    "sensor.omv_megalageret_local_memory_usage",
    "sensor.omv_megalageret_local_memory_used",
    "sensor.omv_megalageret_local_memory_total",
    "sensor.omv_megalageret_local_gpu_load",
    "sensor.omv_megalageret_local_gpu_frequency",
    "sensor.omv_megalageret_local_enp1s0f0_rx",
    "sensor.omv_megalageret_local_enp1s0f0_tx",
    "sensor.omv_megalageret_local_enp1s0f1_rx",
    "sensor.omv_megalageret_local_enp1s0f1_tx",
    # Energy
    "sensor.server_energimaler_power",
    "sensor.server_energimaler_voltage",
    "sensor.server_energimaler_current",
    "sensor.energy_hub_elhub_price_total",
    "sensor.energi_data_service_co2",
    "sensor.server_monthly_kwh",
    "sensor.server_monthly_cost",
    "switch.megalageret_remote_socket_1",
    # Disks — NVMe
    "sensor.0x2646_kingston_snv2s1000g_nvme0n1_nvme0n1_used",
    "sensor.0x2646_kingston_snv2s1000g_nvme0n1_nvme0n1_used_size",
    "sensor.0x2646_kingston_snv2s1000g_nvme0n1_nvme0n1_free_size",
    "sensor.0x2646_kingston_snv2s1000g_nvme0n1_nvme0n1_temperature",
    "sensor.0x2646_kingston_snv2s1000g_nvme0n1_smart_status",
    # Disks — sda
    "sensor.ata_samsung_ssd_860_pro_256gb_sda_sda_used",
    "sensor.ata_samsung_ssd_860_pro_256gb_sda_sda_used_size",
    "sensor.ata_samsung_ssd_860_pro_256gb_sda_sda_free_size",
    "sensor.ata_samsung_ssd_860_pro_256gb_sda_sda_temperature",
    "sensor.ata_samsung_ssd_860_pro_256gb_sda_smart_status",
    # Disks — sdd
    "sensor.ata_samsung_ssd_850_evo_250gb_sdd_sdd_used",
    "sensor.ata_samsung_ssd_850_evo_250gb_sdd_sdd_used_size",
    "sensor.ata_samsung_ssd_850_evo_250gb_sdd_sdd_free_size",
    "sensor.ata_samsung_ssd_850_evo_250gb_sdd_sdd_temperature",
    "sensor.ata_samsung_ssd_850_evo_250gb_sdd_smart_status",
    # Disks — sdb
    "sensor.ata_st4000nm0035_1v4107_data_sdb_data_used",
    "sensor.ata_st4000nm0035_1v4107_data_sdb_data_used_size",
    "sensor.ata_st4000nm0035_1v4107_data_sdb_data_free_size",
    "sensor.ata_st4000nm0035_1v4107_data_sdb_sdb_temperature",
    "sensor.ata_st4000nm0035_1v4107_data_sdb_smart_status",
    # Disks — sdc
    "sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_data2_used",
    "sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_data2_used_size",
    "sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_data2_free_size",
    "sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_sdc_temperature",
    "sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_smart_status",
    # Docker — aggregate
    "sensor.megalageret_docker_running_2",
    "sensor.megalageret_docker_total_2",
    # Docker — named containers
    "sensor.container_bazarr_bazarr_state",
    "sensor.container_flaresolverr_flaresolverr_state",
    "sensor.container_glance_glance_state",
    "sensor.container_handbrake_handbrake_state",
    "sensor.container_huntarr_huntarr_state",
    "sensor.container_jellyfin_jellyfin_state",
    "sensor.container_mc_creative_server_mc_creative_server_state",
    "sensor.container_mc_far_og_seb_survival_mc_far_og_seb_survival_state",
    "sensor.container_mc_survival_server_old_old_mc_survival_server_old_old_state",
    "sensor.container_minecraft_vanilla_1_minecraft_vanilla_1_state",
    "sensor.container_plex_plex_state",
    "sensor.container_prowlarr_prowlarr_state",
    "sensor.container_qbittorrent_qbittorrent_state",
    "sensor.container_radarr_radarr_state",
    "sensor.container_seerr_seerr_state",
    "sensor.container_sonarr_sonarr_state",
    "sensor.container_tautulli_tautulli_state",
    "sensor.container_unpackerr_unpackerr_state",
    # OMV — services
    "binary_sensor.omv_megalageret_local_docker_service",
    "binary_sensor.omv_megalageret_local_ssh_service",
    "binary_sensor.omv_megalageret_local_smb_cifs_service",
    "binary_sensor.omv_megalageret_local_nfs_service",
    "binary_sensor.omv_megalageret_local_rsync_server_service",
    "binary_sensor.omv_megalageret_local_iperf3_service",
    "binary_sensor.omv_megalageret_local_cterm_service",
    # OMV — action buttons
    "button.omv_megalageret_local_reboot",
    "button.omv_megalageret_local_shutdown",
    "button.omv_megalageret_local_apply_configuration",
    "button.omv_megalageret_local_docker_container_prune",
    "button.omv_megalageret_local_docker_image_prune",
)
