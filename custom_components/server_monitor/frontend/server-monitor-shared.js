/**
 * Server Monitor — Shared config & helpers
 *
 * Single source of truth for the entity IDs the panel/card read directly
 * via hass.states. Loaded via dynamic import() from both server-monitor-panel.js
 * and server-monitor-card.js so the two files don't drift out of sync.
 *
 * NOTE: this list is duplicated (by necessity) in the backend's
 * custom_components/server_monitor/const.py MONITORED_ENTITIES, which the
 * entity-health coordinator polls. Keep both in sync when entities change.
 */

export const HEALTH_SENSOR = 'sensor.server_monitor_entity_health';

export const STATUS_ENTITIES = {
  uptime:        'sensor.omv_megalageret_local_uptime',
  reboot:        'binary_sensor.omv_megalageret_local_reboot_required',
  update:        'update.omv_megalageret_local_system_update',
  packages:      'sensor.omv_megalageret_local_available_package_updates',
  dockerStopped: 'sensor.omv_megalageret_local_docker_containers_not_running',
};

export const ENERGY_ENTITIES = {
  power:       'sensor.server_energimaler_power',
  voltage:     'sensor.server_energimaler_voltage',
  current:     'sensor.server_energimaler_current',
  price:       'sensor.energy_hub_elhub_price_total',
  co2:         'sensor.energi_data_service_co2',
  kwh:         'sensor.server_monthly_kwh',
  cost:        'sensor.server_monthly_cost',
  powerSwitch: 'switch.megalageret_remote_socket_1',
};

export const SYSTEM_ENTITIES = {
  ram:      'sensor.omv_megalageret_local_memory_usage',
  ramUsed:  'sensor.omv_megalageret_local_memory_used',
  ramTotal: 'sensor.omv_megalageret_local_memory_total',
  gpuLoad:  'sensor.omv_megalageret_local_gpu_load',
  gpuFreq:  'sensor.omv_megalageret_local_gpu_frequency',
  rx0:      'sensor.omv_megalageret_local_enp1s0f0_rx',
  tx0:      'sensor.omv_megalageret_local_enp1s0f0_tx',
  rx1:      'sensor.omv_megalageret_local_enp1s0f1_rx',
  tx1:      'sensor.omv_megalageret_local_enp1s0f1_tx',
};

export const DOCKER_AGG_ENTITIES = {
  running: 'sensor.megalageret_docker_running_2',
  total:   'sensor.megalageret_docker_total_2',
};

export const ACTION_ENTITIES = {
  reboot:          'button.omv_megalageret_local_reboot',
  shutdown:        'button.omv_megalageret_local_shutdown',
  apply:           'button.omv_megalageret_local_apply_configuration',
  pruneContainers: 'button.omv_megalageret_local_docker_container_prune',
  pruneImages:     'button.omv_megalageret_local_docker_image_prune',
};

export const DRIVES = [
  { id: 'nvme', label: 'NVMe (system)',
    usedPct: 'sensor.0x2646_kingston_snv2s1000g_nvme0n1_nvme0n1_used',
    usedSize: 'sensor.0x2646_kingston_snv2s1000g_nvme0n1_nvme0n1_used_size',
    freeSize: 'sensor.0x2646_kingston_snv2s1000g_nvme0n1_nvme0n1_free_size',
    temp: 'sensor.0x2646_kingston_snv2s1000g_nvme0n1_nvme0n1_temperature',
    smart: 'sensor.0x2646_kingston_snv2s1000g_nvme0n1_smart_status' },
  { id: 'sda', label: 'Samsung 860 Pro',
    usedPct: 'sensor.ata_samsung_ssd_860_pro_256gb_sda_sda_used',
    usedSize: 'sensor.ata_samsung_ssd_860_pro_256gb_sda_sda_used_size',
    freeSize: 'sensor.ata_samsung_ssd_860_pro_256gb_sda_sda_free_size',
    temp: 'sensor.ata_samsung_ssd_860_pro_256gb_sda_sda_temperature',
    smart: 'sensor.ata_samsung_ssd_860_pro_256gb_sda_smart_status' },
  { id: 'sdd', label: 'Samsung 850 Evo',
    usedPct: 'sensor.ata_samsung_ssd_850_evo_250gb_sdd_sdd_used',
    usedSize: 'sensor.ata_samsung_ssd_850_evo_250gb_sdd_sdd_used_size',
    freeSize: 'sensor.ata_samsung_ssd_850_evo_250gb_sdd_sdd_free_size',
    temp: 'sensor.ata_samsung_ssd_850_evo_250gb_sdd_sdd_temperature',
    smart: 'sensor.ata_samsung_ssd_850_evo_250gb_sdd_smart_status' },
  { id: 'sdb', label: 'ST4000NM0035 (data)',
    usedPct: 'sensor.ata_st4000nm0035_1v4107_data_sdb_data_used',
    usedSize: 'sensor.ata_st4000nm0035_1v4107_data_sdb_data_used_size',
    freeSize: 'sensor.ata_st4000nm0035_1v4107_data_sdb_data_free_size',
    temp: 'sensor.ata_st4000nm0035_1v4107_data_sdb_sdb_temperature',
    smart: 'sensor.ata_st4000nm0035_1v4107_data_sdb_smart_status' },
  { id: 'sdc', label: 'WD20EARX (data2)',
    usedPct: 'sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_data2_used',
    usedSize: 'sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_data2_used_size',
    freeSize: 'sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_data2_free_size',
    temp: 'sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_sdc_temperature',
    smart: 'sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_smart_status' },
];

export const CONTAINERS = [
  { eid: 'sensor.container_plex_plex_state', name: 'Plex', stack: 'media' },
  { eid: 'sensor.container_jellyfin_jellyfin_state', name: 'Jellyfin', stack: 'media' },
  { eid: 'sensor.container_tautulli_tautulli_state', name: 'Tautulli', stack: 'media' },
  { eid: 'sensor.container_seerr_seerr_state', name: 'Seerr', stack: 'media' },
  { eid: 'sensor.container_qbittorrent_qbittorrent_state', name: 'qBittorrent', stack: 'download' },
  { eid: 'sensor.container_radarr_radarr_state', name: 'Radarr', stack: 'download' },
  { eid: 'sensor.container_sonarr_sonarr_state', name: 'Sonarr', stack: 'download' },
  { eid: 'sensor.container_bazarr_bazarr_state', name: 'Bazarr', stack: 'download' },
  { eid: 'sensor.container_prowlarr_prowlarr_state', name: 'Prowlarr', stack: 'download' },
  { eid: 'sensor.container_flaresolverr_flaresolverr_state', name: 'FlareSolverr', stack: 'download' },
  { eid: 'sensor.container_huntarr_huntarr_state', name: 'Huntarr', stack: 'download' },
  { eid: 'sensor.container_unpackerr_unpackerr_state', name: 'Unpackerr', stack: 'download' },
  { eid: 'sensor.container_mc_creative_server_mc_creative_server_state', name: 'Creative', stack: 'minecraft' },
  { eid: 'sensor.container_mc_far_og_seb_survival_mc_far_og_seb_survival_state', name: 'Far & Seb', stack: 'minecraft' },
  { eid: 'sensor.container_mc_survival_server_old_old_mc_survival_server_old_old_state', name: 'Survival old', stack: 'minecraft' },
  { eid: 'sensor.container_minecraft_vanilla_1_minecraft_vanilla_1_state', name: 'Vanilla 1', stack: 'minecraft' },
  { eid: 'sensor.container_handbrake_handbrake_state', name: 'Handbrake', stack: 'other' },
  { eid: 'sensor.container_glance_glance_state', name: 'Glance', stack: 'other' },
];

export const SERVICES = [
  { eid: 'binary_sensor.omv_megalageret_local_docker_service', name: 'Docker' },
  { eid: 'binary_sensor.omv_megalageret_local_ssh_service', name: 'SSH' },
  { eid: 'binary_sensor.omv_megalageret_local_smb_cifs_service', name: 'SMB' },
  { eid: 'binary_sensor.omv_megalageret_local_nfs_service', name: 'NFS' },
  { eid: 'binary_sensor.omv_megalageret_local_rsync_server_service', name: 'RSync' },
  { eid: 'binary_sensor.omv_megalageret_local_iperf3_service', name: 'iPerf3' },
  { eid: 'binary_sensor.omv_megalageret_local_cterm_service', name: 'CTerm' },
];

// ─── Value helpers ───────────────────────────────────────────────────────

export function stateOf(hass, eid, fallback = '—') {
  return hass?.states?.[eid]?.state ?? fallback;
}
export function numOf(hass, eid, fallback = 0) {
  const v = parseFloat(stateOf(hass, eid, fallback));
  return isNaN(v) ? fallback : v;
}
export function isOn(hass, eid) {
  const s = stateOf(hass, eid, 'off');
  return s === 'on' || s === 'true';
}
export function attrOf(hass, eid, attr, fallback = '—') {
  return hass?.states?.[eid]?.attributes?.[attr] ?? fallback;
}

// ─── Entity-health helpers ───────────────────────────────────────────────
// Reads sensor.server_monitor_entity_health (populated by the backend
// coordinator) rather than re-deriving missing/unavailable in the frontend,
// so there is exactly one place that decides what counts as a problem.

/**
 * Returns the number of entityIds that appear in the health sensor's
 * missing/unavailable lists, or null if the health sensor itself isn't
 * available (e.g. integration not loaded / still starting up).
 */
export function sectionProblemCount(hass, entityIds) {
  const health = hass?.states?.[HEALTH_SENSOR];
  if (!health || health.state === 'unavailable' || health.state === 'unknown') return null;
  const missing = health.attributes?.missing_entities || [];
  const unavailable = health.attributes?.unavailable_entities || [];
  const bad = new Set([...missing, ...unavailable]);
  let count = 0;
  for (const eid of entityIds) if (bad.has(eid)) count++;
  return count;
}

export function driveEntityIds(drive) {
  return [drive.usedPct, drive.usedSize, drive.freeSize, drive.temp, drive.smart];
}
