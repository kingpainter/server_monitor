/**
 * Server Monitor — Sidebar Panel
 *
 * Sections:
 *  1. Status bar   — uptime, reboot, updates, packages, docker stopped
 *  2. Energi       — live power, voltage, current, price, CO₂, monthly kWh/DKK, 60-min ring chart
 *  3. System       — RAM gauge, GPU load/freq, dual-NIC charts
 *  4. Disk         — 5 drives overview (%, temp, SMART) + partition details
 *  5. Docker       — running/stopped counts + named containers by stack
 *  6. Services     — OMV binary sensor services
 *  7. Actions      — reboot, shutdown, apply config, docker prune, power switch
 *
 * Design: sky/indigo palette. Accents: --accent #38bdf8, --accent2 #818cf8
 */

class ServerMonitorPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass         = null;
    this._activeTab    = 'energi';
    this._chartLoaded  = false;
    this._powerChart   = null;
    this._rxChart      = null;
    this._txChart      = null;
    this._powerHistory = [];
    this._rxHistory    = [];
    this._txHistory    = [];
    this._powerTab     = 'power';
  }

  static get observedAttributes() { return ['hass', 'narrow', 'panel']; }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.innerHTML) { this._build(); } else { this._update(); }
  }

  _val(eid, fallback = '—') { return this._hass?.states[eid]?.state ?? fallback; }
  _num(eid, fallback = 0) { const v = parseFloat(this._val(eid, fallback)); return isNaN(v) ? fallback : v; }
  _isOn(eid) { const s = this._val(eid, 'off'); return s === 'on' || s === 'true'; }
  _attr(eid, attr, fallback = '—') { return this._hass?.states[eid]?.attributes?.[attr] ?? fallback; }
  _setText(id, text) { const el = this.shadowRoot.getElementById(id); if (el && text !== undefined) el.textContent = text; }
  _setClass(id, cls) { const el = this.shadowRoot.getElementById(id); if (el) el.className = cls; }
  _setStyle(id, prop, val) { const el = this.shadowRoot.getElementById(id); if (el) el.style[prop] = val; }

  _build() {
    this.shadowRoot.innerHTML = `<style>${this._css()}</style>${this._html()}`;
    this._bindTabs();
    this._bindPowerTabs();
    this._bindActions();
    this._loadChartJs().then(() => { this._initCharts(); this._update(); });
    this._update();
  }

  _update() {
    if (!this._hass) return;
    this._updateStatusBar();
    this._updateEnergi();
    this._updateSystem();
    this._updateDisk();
    this._updateDocker();
    this._updateServices();
    this._updatePowerSwitch();
  }

  _updateStatusBar() {
    const uptime  = this._val('sensor.omv_megalageret_local_uptime');
    const online  = uptime !== '—' && uptime !== 'unavailable' && uptime !== 'unknown';
    const reboot  = this._isOn('binary_sensor.omv_megalageret_local_reboot_required');
    const update  = this._isOn('update.omv_megalageret_local_system_update');
    const pkgs    = this._num('sensor.omv_megalageret_local_available_package_updates', 0);
    const stopped = this._num('sensor.omv_megalageret_local_docker_containers_not_running', 0);

    this._setText('sb-uptime', online ? uptime : 'Offline');
    this._setClass('sb-uptime-dot', 'dot ' + (online ? 'green' : 'red'));
    this._setText('sb-reboot', reboot ? 'Påkrævet' : 'OK');
    this._setClass('sb-reboot-dot', 'dot ' + (reboot ? 'amber' : 'green'));

    let updateText = 'Opdateret';
    if (update && pkgs > 0) updateText = `System + ${pkgs} pakker`;
    else if (update)        updateText = 'System update';
    else if (pkgs > 0)      updateText = `${pkgs} pakker`;
    this._setText('sb-update', updateText);
    this._setClass('sb-update-dot', 'dot ' + (update || pkgs > 0 ? 'amber' : 'green'));
    this._setText('sb-stopped', stopped > 0 ? `${stopped} stoppet` : 'Alle kører');
    this._setClass('sb-stopped-dot', 'dot ' + (stopped > 0 ? 'amber' : 'green'));

    const alerts = [];
    if (reboot)      alerts.push('Reboot påkrævet');
    if (update)      alerts.push('Systemopdatering tilgængelig');
    if (pkgs > 0)    alerts.push(`${pkgs} pakkeopdateringer`);
    if (stopped > 0) alerts.push(`${stopped} container(e) stoppet`);
    const banner = this.shadowRoot.getElementById('alert-banner');
    if (banner) {
      banner.style.display = alerts.length ? 'flex' : 'none';
      const txt = banner.querySelector('.alert-text');
      if (txt) txt.textContent = alerts.join(' · ');
    }
  }

  _updateEnergi() {
    const power   = this._num('sensor.server_energimaler_power', 0);
    const voltage = this._num('sensor.server_energimaler_voltage', 0);
    const current = this._num('sensor.server_energimaler_current', 0);
    const price   = this._num('sensor.energy_hub_elhub_price_total', 0);
    const co2     = this._num('sensor.energi_data_service_co2', 0);
    const kwh     = this._num('sensor.server_monthly_kwh', 0);
    const cost    = this._num('sensor.server_monthly_cost', 0);

    this._setText('e-power',   power + ' W');
    this._setText('e-voltage', voltage + ' V');
    this._setText('e-current', current.toFixed(2) + ' A');
    this._setText('e-price',   price.toFixed(2) + ' kr/kWh');
    this._setText('e-co2',     co2 + ' g/kWh');
    this._setText('e-kwh',     kwh.toFixed(1) + ' kWh');
    this._setText('e-cost',    cost.toFixed(2) + ' kr');

    const pct = Math.min(power / 3, 100);
    const barColor = power > 200 ? '#ef4444' : power > 150 ? '#f59e0b' : '#10b981';
    this._setStyle('bar-power', 'width', pct + '%');
    this._setStyle('bar-power', 'background', barColor);

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysSoFar   = now.getDate() + now.getHours() / 24;
    const fwdKwh  = daysSoFar > 0 ? (kwh  / daysSoFar * daysInMonth).toFixed(1) : '—';
    const fwdCost = daysSoFar > 0 ? (cost / daysSoFar * daysInMonth).toFixed(0) : '—';
    this._setText('e-kwh-fwd',  `~${fwdKwh} kWh ved månedsskifte`);
    this._setText('e-cost-fwd', `~${fwdCost} kr ved månedsskifte`);

    this._powerHistory.push(power);
    if (this._powerHistory.length > 60) this._powerHistory.shift();
    if (this._chartLoaded) this._updatePowerChart();
  }

  _updateSystem() {
    const ram     = this._num('sensor.omv_megalageret_local_memory_usage', 0);
    const ramUsed = this._val('sensor.omv_megalageret_local_memory_used');
    const ramTot  = this._val('sensor.omv_megalageret_local_memory_total');
    const gpuLoad = this._num('sensor.omv_megalageret_local_gpu_load', 0);
    const gpuFreq = this._val('sensor.omv_megalageret_local_gpu_frequency');
    const rx0     = this._num('sensor.omv_megalageret_local_enp1s0f0_rx', 0);
    const tx0     = this._num('sensor.omv_megalageret_local_enp1s0f0_tx', 0);
    const rx1     = this._num('sensor.omv_megalageret_local_enp1s0f1_rx', 0);
    const tx1     = this._num('sensor.omv_megalageret_local_enp1s0f1_tx', 0);

    this._setText('sys-ram-pct', ram + '%');
    this._setText('sys-ram-used', ramUsed);
    this._setText('sys-ram-total', ramTot);
    this._setStyle('bar-ram', 'width', ram + '%');
    this._setStyle('bar-ram', 'background', ram >= 85 ? '#ef4444' : ram >= 70 ? '#f59e0b' : '#10b981');
    this._setText('sys-gpu-load', gpuLoad + '%');
    this._setText('sys-gpu-freq', gpuFreq);
    this._setStyle('bar-gpu', 'width', gpuLoad + '%');
    this._setStyle('bar-gpu', 'background', gpuLoad >= 85 ? '#ef4444' : gpuLoad >= 60 ? '#f59e0b' : '#818cf8');
    this._setText('sys-rx0', rx0);
    this._setText('sys-tx0', tx0);
    this._setText('sys-rx1', rx1);
    this._setText('sys-tx1', tx1);

    this._rxHistory.push(rx0);
    this._txHistory.push(tx0);
    if (this._rxHistory.length > 30) this._rxHistory.shift();
    if (this._txHistory.length > 30) this._txHistory.shift();
    if (this._chartLoaded) this._updateNetCharts();
  }

  _updatePowerSwitch() {
    const btn = this.shadowRoot.getElementById('act-power-switch');
    if (!btn) return;
    const s = this._hass?.states['switch.megalageret_remote_socket_1']?.state;
    if (s === 'on') {
      btn.textContent = '⚡ Strøm til serveren';
      btn.className   = 'act-btn power-switch';
      btn.disabled    = true;
    } else if (s === 'unavailable' || !s) {
      btn.textContent = '⚡ Utilgængelig';
      btn.className   = 'act-btn power-switch';
      btn.disabled    = true;
    } else {
      btn.textContent = '⚡ Tænd server';
      btn.className   = 'act-btn power-switch';
      btn.disabled    = false;
    }
  }

  _updateDisk() {
    const drives = [
      { id:'nvme', usedPct:'sensor.0x2646_kingston_snv2s1000g_nvme0n1_nvme0n1_used', usedSize:'sensor.0x2646_kingston_snv2s1000g_nvme0n1_nvme0n1_used_size', freeSize:'sensor.0x2646_kingston_snv2s1000g_nvme0n1_nvme0n1_free_size', temp:'sensor.0x2646_kingston_snv2s1000g_nvme0n1_nvme0n1_temperature', smart:'sensor.0x2646_kingston_snv2s1000g_nvme0n1_smart_status' },
      { id:'sda',  usedPct:'sensor.ata_samsung_ssd_860_pro_256gb_sda_sda_used', usedSize:'sensor.ata_samsung_ssd_860_pro_256gb_sda_sda_used_size', freeSize:'sensor.ata_samsung_ssd_860_pro_256gb_sda_sda_free_size', temp:'sensor.ata_samsung_ssd_860_pro_256gb_sda_sda_temperature', smart:'sensor.ata_samsung_ssd_860_pro_256gb_sda_smart_status' },
      { id:'sdd',  usedPct:'sensor.ata_samsung_ssd_850_evo_250gb_sdd_sdd_used', usedSize:'sensor.ata_samsung_ssd_850_evo_250gb_sdd_sdd_used_size', freeSize:'sensor.ata_samsung_ssd_850_evo_250gb_sdd_sdd_free_size', temp:'sensor.ata_samsung_ssd_850_evo_250gb_sdd_sdd_temperature', smart:'sensor.ata_samsung_ssd_850_evo_250gb_sdd_smart_status' },
      { id:'sdb',  usedPct:'sensor.ata_st4000nm0035_1v4107_data_sdb_data_used', usedSize:'sensor.ata_st4000nm0035_1v4107_data_sdb_data_used_size', freeSize:'sensor.ata_st4000nm0035_1v4107_data_sdb_data_free_size', temp:'sensor.ata_st4000nm0035_1v4107_data_sdb_sdb_temperature', smart:'sensor.ata_st4000nm0035_1v4107_data_sdb_smart_status' },
      { id:'sdc',  usedPct:'sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_data2_used', usedSize:'sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_data2_used_size', freeSize:'sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_data2_free_size', temp:'sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_sdc_temperature', smart:'sensor.ata_wdc_wd20earx_00pasb0_data2_sdc_smart_status' },
    ];
    drives.forEach(d => {
      const pct   = this._num(d.usedPct, 0);
      const smart = this._val(d.smart);
      const smartOk = ['Passed','passed','OK','ok'].includes(smart);
      this._setText(`disk-${d.id}-pct`,   pct + '%');
      this._setText(`disk-${d.id}-used`,  this._val(d.usedSize));
      this._setText(`disk-${d.id}-free`,  this._val(d.freeSize));
      this._setText(`disk-${d.id}-temp`,  this._val(d.temp) !== '—' ? this._val(d.temp) + ' °C' : '—');
      this._setText(`disk-${d.id}-smart`, smartOk ? '✓ OK' : smart);
      this._setClass(`disk-${d.id}-smart`, 'disk-smart ' + (smartOk ? 'green' : 'red'));
      const bar = this.shadowRoot.getElementById(`bar-disk-${d.id}`);
      if (bar) { bar.style.width = pct + '%'; bar.style.background = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#10b981'; }
    });
  }

  _updateDocker() {
    const running = this._num('sensor.megalageret_docker_running_2', 0);
    const total   = this._num('sensor.megalageret_docker_total_2', 0);
    const stopped = this._num('sensor.omv_megalageret_local_docker_containers_not_running', 0);
    this._setText('dk-running', running + '');
    this._setText('dk-stopped', stopped + '');
    this._setText('dk-total',   total + '');

    const containers = [
      ['sensor.container_plex_plex_state','Plex','media'],
      ['sensor.container_jellyfin_jellyfin_state','Jellyfin','media'],
      ['sensor.container_tautulli_tautulli_state','Tautulli','media'],
      ['sensor.container_seerr_seerr_state','Seerr','media'],
      ['sensor.container_qbittorrent_qbittorrent_state','qBittorrent','download'],
      ['sensor.container_radarr_radarr_state','Radarr','download'],
      ['sensor.container_sonarr_sonarr_state','Sonarr','download'],
      ['sensor.container_bazarr_bazarr_state','Bazarr','download'],
      ['sensor.container_prowlarr_prowlarr_state','Prowlarr','download'],
      ['sensor.container_flaresolverr_flaresolverr_state','FlareSolverr','download'],
      ['sensor.container_huntarr_huntarr_state','Huntarr','download'],
      ['sensor.container_unpackerr_unpackerr_state','Unpackerr','download'],
      ['sensor.container_mc_creative_server_mc_creative_server_state','Creative','minecraft'],
      ['sensor.container_mc_far_og_seb_survival_mc_far_og_seb_survival_state','Far & Seb','minecraft'],
      ['sensor.container_mc_survival_server_old_old_mc_survival_server_old_old_state','Survival old','minecraft'],
      ['sensor.container_minecraft_vanilla_1_minecraft_vanilla_1_state','Vanilla 1','minecraft'],
      ['sensor.container_handbrake_handbrake_state','Handbrake','other'],
      ['sensor.container_glance_glance_state','Glance','other'],
    ];
    ['media','download','minecraft','other'].forEach(stack => {
      const grid = this.shadowRoot.getElementById(`svc-grid-${stack}`);
      if (!grid) return;
      grid.innerHTML = '';
      containers.filter(c => c[2] === stack).forEach(([eid, name]) => {
        const div = document.createElement('div');
        div.className = 'svc-chip ' + (this._val(eid, 'unknown') === 'running' ? 'running' : 'stopped');
        div.innerHTML = `<span class="svc-dot"></span><span class="svc-name">${name}</span>`;
        grid.appendChild(div);
      });
    });
  }

  _updateServices() {
    const services = [
      ['binary_sensor.omv_megalageret_local_docker_service','Docker'],
      ['binary_sensor.omv_megalageret_local_ssh_service','SSH'],
      ['binary_sensor.omv_megalageret_local_smb_cifs_service','SMB'],
      ['binary_sensor.omv_megalageret_local_nfs_service','NFS'],
      ['binary_sensor.omv_megalageret_local_rsync_server_service','RSync'],
      ['binary_sensor.omv_megalageret_local_iperf3_service','iPerf3'],
      ['binary_sensor.omv_megalageret_local_cterm_service','CTerm'],
    ];
    const grid = this.shadowRoot.getElementById('services-grid');
    if (!grid) return;
    grid.innerHTML = '';
    services.forEach(([eid, name]) => {
      const div = document.createElement('div');
      div.className = 'svc-chip ' + (this._isOn(eid) ? 'running' : 'stopped');
      div.innerHTML = `<span class="svc-dot"></span><span class="svc-name">${name}</span>`;
      grid.appendChild(div);
    });
  }

  _loadChartJs() {
    return new Promise(resolve => {
      if (window.Chart) { this._chartLoaded = true; resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      s.onload = () => { this._chartLoaded = true; resolve(); };
      document.head.appendChild(s);
    });
  }

  _initCharts() {
    const root = this.shadowRoot;
    if (!window.Chart) return;
    const gridColor = 'rgba(148,163,184,0.08)', tickColor = '#64748b';
    const baseOpts = { responsive:true, maintainAspectRatio:false, animation:false, plugins:{legend:{display:false}} };
    const pcv = root.getElementById('power-canvas');
    if (pcv) {
      this._powerChart = new Chart(pcv.getContext('2d'), {
        type:'line', data:{ labels:Array.from({length:60},(_,i)=>i%10===0?`-${60-i}m`:''), datasets:[{data:Array(60).fill(null),borderColor:'#38bdf8',backgroundColor:'rgba(56,189,248,0.08)',fill:true,tension:0.4,pointRadius:0,borderWidth:1.5}] },
        options:{...baseOpts,scales:{x:{ticks:{font:{size:9},color:tickColor},grid:{display:false}},y:{ticks:{font:{size:9},color:tickColor,callback:v=>v+'W'},grid:{color:gridColor}}}}
      });
    }
    const netLabels = Array.from({length:30},(_,i)=>i%5===0?`-${30-i}m`:'');
    const rcv = root.getElementById('rx-canvas');
    if (rcv) this._rxChart = new Chart(rcv.getContext('2d'),{type:'line',data:{labels:netLabels,datasets:[{label:'RX0',data:Array(30).fill(null),borderColor:'#38bdf8',fill:false,tension:0.4,pointRadius:0,borderWidth:1.5}]},options:{...baseOpts,scales:{x:{ticks:{font:{size:9},color:tickColor},grid:{display:false}},y:{ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}}}}});
    const tcv = root.getElementById('tx-canvas');
    if (tcv) this._txChart = new Chart(tcv.getContext('2d'),{type:'line',data:{labels:netLabels,datasets:[{label:'TX0',data:Array(30).fill(null),borderColor:'#818cf8',fill:false,tension:0.4,pointRadius:0,borderWidth:1.5}]},options:{...baseOpts,scales:{x:{ticks:{font:{size:9},color:tickColor},grid:{display:false}},y:{ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}}}}});
  }

  _updatePowerChart() {
    if (!this._powerChart) return;
    const padded = Array(60).fill(null);
    this._powerHistory.forEach((v,i) => { padded[60-this._powerHistory.length+i] = v; });
    const price = this._num('sensor.energy_hub_elhub_price_total', 1.5);
    let data, color, bgColor, unit;
    if (this._powerTab === 'kwh') {
      let acc=0; data=padded.map(v=>v!==null?parseFloat((acc+=v/1000/60,acc).toFixed(3)):null);
      color='#10b981'; bgColor='rgba(16,185,129,0.08)'; unit='kWh';
    } else if (this._powerTab === 'cost') {
      let acc=0; data=padded.map(v=>v!==null?parseFloat((acc+=(v/1000/60)*price,acc).toFixed(4)):null);
      color='#f59e0b'; bgColor='rgba(245,158,11,0.08)'; unit='kr';
    } else {
      data=padded; color='#38bdf8'; bgColor='rgba(56,189,248,0.08)'; unit='W';
    }
    this._powerChart.data.datasets[0].data=data;
    this._powerChart.data.datasets[0].borderColor=color;
    this._powerChart.data.datasets[0].backgroundColor=bgColor;
    this._powerChart.options.scales.y.ticks.callback=v=>v+unit;
    this._powerChart.update('none');
  }

  _updateNetCharts() {
    if (this._rxChart) { const p=Array(30).fill(null); this._rxHistory.forEach((v,i)=>{p[30-this._rxHistory.length+i]=v;}); this._rxChart.data.datasets[0].data=p; this._rxChart.update('none'); }
    if (this._txChart) { const p=Array(30).fill(null); this._txHistory.forEach((v,i)=>{p[30-this._txHistory.length+i]=v;}); this._txChart.data.datasets[0].data=p; this._txChart.update('none'); }
  }

  _bindTabs() {
    this.shadowRoot.addEventListener('click', e => {
      const tab = e.target.closest('[data-section]');
      if (!tab) return;
      this._activeTab = tab.dataset.section;
      this.shadowRoot.querySelectorAll('[data-section]').forEach(t => t.classList.toggle('active', t.dataset.section===this._activeTab));
      this.shadowRoot.querySelectorAll('.section-page').forEach(p => p.style.display = p.dataset.page===this._activeTab ? 'block' : 'none');
    });
  }

  _bindPowerTabs() {
    this.shadowRoot.addEventListener('click', e => {
      const tab = e.target.closest('[data-ptab]');
      if (!tab) return;
      this._powerTab = tab.dataset.ptab;
      this.shadowRoot.querySelectorAll('[data-ptab]').forEach(t => t.classList.toggle('active', t.dataset.ptab===this._powerTab));
      if (this._chartLoaded) this._updatePowerChart();
    });
  }

  _bindActions() {
    const root = this.shadowRoot;
    // Power switch — kun tænd
    root.getElementById('act-power-switch')?.addEventListener('click', () => {
      if (this._hass?.states['switch.megalageret_remote_socket_1']?.state !== 'on')
        this._hass?.callService('switch', 'turn_on', { entity_id: 'switch.megalageret_remote_socket_1' });
    });
    root.getElementById('act-reboot')?.addEventListener('click', () =>
      this._confirm('↺ Genstart server?', 'Serveren genstarter. Vil være utilgængelig i 1–2 minutter.',
        () => this._pressButton('button.omv_megalageret_local_reboot')));
    root.getElementById('act-shutdown')?.addEventListener('click', () =>
      this._confirm('⏻ Luk server ned?', 'Serveren lukkes ned og skal startes manuelt igen.',
        () => this._pressButton('button.omv_megalageret_local_shutdown')));
    root.getElementById('act-apply')?.addEventListener('click', () =>
      this._pressButton('button.omv_megalageret_local_apply_configuration'));
    root.getElementById('act-prune-containers')?.addEventListener('click', () =>
      this._confirm('🗑 Docker container prune?', 'Sletter alle stoppede Docker containers.',
        () => this._pressButton('button.omv_megalageret_local_docker_container_prune')));
    root.getElementById('act-prune-images')?.addEventListener('click', () =>
      this._confirm('🗑 Docker image prune?', 'Sletter alle ubrugte Docker images.',
        () => this._pressButton('button.omv_megalageret_local_docker_image_prune')));
  }

  _pressButton(entityId) { this._hass?.callService('button', 'press', { entity_id: entityId }); }

  _confirm(title, message, onConfirm) {
    const overlay = this.shadowRoot.getElementById('confirm-overlay');
    if (!overlay) return;
    this.shadowRoot.getElementById('confirm-title').textContent = title;
    this.shadowRoot.getElementById('confirm-msg').textContent   = message;
    overlay.style.display = 'flex';
    const close = () => { overlay.style.display = 'none'; };
    this.shadowRoot.getElementById('confirm-ok').addEventListener('click',     () => { onConfirm(); close(); }, { once:true });
    this.shadowRoot.getElementById('confirm-cancel').addEventListener('click', close, { once:true });
  }

  _html() {
    return `
      <div id="confirm-overlay" class="overlay" style="display:none">
        <div class="dialog">
          <div id="confirm-title" class="dialog-title"></div>
          <div id="confirm-msg"   class="dialog-msg"></div>
          <div class="dialog-actions">
            <button id="confirm-cancel" class="btn-cancel">Annullér</button>
            <button id="confirm-ok"     class="btn-ok">Bekræft</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="topbar">
          <div class="topbar-header">
            <div class="header-icon">🖥</div>
            <div><div class="panel-title">Server Monitor</div><div class="panel-sub">megalageret.local</div></div>
          </div>
          <div class="tab-bar">
            <button class="tab active" data-section="energi">⚡ Energi</button>
            <button class="tab"        data-section="system">💻 System</button>
            <button class="tab"        data-section="disk">🖥️ Disk</button>
            <button class="tab"        data-section="docker">🐳 Docker</button>
            <button class="tab"        data-section="services">🔧 Services</button>
            <button class="tab"        data-section="actions">🔘 Handlinger</button>
          </div>
        </div>

        <div class="status-bar">
          <div class="sb-item"><span id="sb-uptime-dot" class="dot green"></span><span class="sb-label">Oppetid</span><span id="sb-uptime" class="sb-value mono">—</span></div>
          <div class="sb-item"><span id="sb-reboot-dot" class="dot green"></span><span class="sb-label">Reboot</span><span id="sb-reboot" class="sb-value">—</span></div>
          <div class="sb-item"><span id="sb-update-dot" class="dot green"></span><span class="sb-label">Updates</span><span id="sb-update" class="sb-value">—</span></div>
          <div class="sb-item"><span id="sb-stopped-dot" class="dot green"></span><span class="sb-label">Docker</span><span id="sb-stopped" class="sb-value">—</span></div>
        </div>

        <div id="alert-banner" class="alert-banner" style="display:none">
          <span class="alert-icon">⚠</span><span class="alert-text"></span>
        </div>

        <div class="panel-scroll">

          <!-- ENERGI -->
          <div class="section-page" data-page="energi" style="display:block">
            <div class="section-title">Strøm — live</div>
            <div class="stat-grid four">
              <div class="stat"><div class="stat-label">Forbrug</div><div id="e-power" class="stat-value accent">—</div></div>
              <div class="stat"><div class="stat-label">Volt</div><div id="e-voltage" class="stat-value">—</div></div>
              <div class="stat"><div class="stat-label">Ampere</div><div id="e-current" class="stat-value">—</div></div>
              <div class="stat"><div class="stat-label">Strømpris</div><div id="e-price" class="stat-value">—</div></div>
            </div>
            <div class="gauge-row"><span class="gauge-label">Belastning</span><div class="gauge-bg"><div id="bar-power" class="gauge-fill" style="width:0%"></div></div><span class="gauge-pct">300W max</span></div>
            <div class="section-title" style="margin-top:20px">Denne måned</div>
            <div class="stat-grid three">
              <div class="stat"><div class="stat-label">kWh</div><div id="e-kwh" class="stat-value accent">—</div><div id="e-kwh-fwd" class="stat-sub">—</div></div>
              <div class="stat"><div class="stat-label">Pris (DKK)</div><div id="e-cost" class="stat-value">—</div><div id="e-cost-fwd" class="stat-sub">—</div></div>
              <div class="stat"><div class="stat-label">CO₂</div><div id="e-co2" class="stat-value">—</div></div>
            </div>
            <div class="inner-card" style="margin-top:16px">
              <div class="inner-card-header">
                <span class="card-title">Strømforbrug — 60 min</span>
                <div class="ptab-row">
                  <button class="ptab active" data-ptab="power">W</button>
                  <button class="ptab"        data-ptab="kwh">kWh</button>
                  <button class="ptab"        data-ptab="cost">kr</button>
                </div>
              </div>
              <div class="chart-wrap"><canvas id="power-canvas"></canvas></div>
            </div>
          </div>

          <!-- SYSTEM -->
          <div class="section-page" data-page="system" style="display:none">
            <div class="section-title">Hukommelse & GPU</div>
            <div class="stat-grid two">
              <div class="stat"><div class="stat-label">RAM forbrug</div><div id="sys-ram-pct" class="stat-value accent">—</div><div class="stat-sub-row"><span id="sys-ram-used" class="stat-sub">—</span><span class="stat-sub"> / </span><span id="sys-ram-total" class="stat-sub">—</span></div></div>
              <div class="stat"><div class="stat-label">GPU load</div><div id="sys-gpu-load" class="stat-value" style="color:var(--accent2)">—</div><div id="sys-gpu-freq" class="stat-sub mono">—</div></div>
            </div>
            <div class="gauge-row"><span class="gauge-label">RAM</span><div class="gauge-bg"><div id="bar-ram" class="gauge-fill" style="width:0%"></div></div><span class="gauge-pct"></span></div>
            <div class="gauge-row"><span class="gauge-label">GPU</span><div class="gauge-bg"><div id="bar-gpu" class="gauge-fill" style="width:0%;background:var(--accent2)"></div></div><span class="gauge-pct"></span></div>
            <div class="section-title" style="margin-top:20px">Netværk — live</div>
            <div class="stat-grid four">
              <div class="stat"><div class="stat-label">RX enp1s0f0</div><div id="sys-rx0" class="stat-value" style="color:var(--accent)">—</div></div>
              <div class="stat"><div class="stat-label">TX enp1s0f0</div><div id="sys-tx0" class="stat-value" style="color:var(--accent2)">—</div></div>
              <div class="stat"><div class="stat-label">RX enp1s0f1</div><div id="sys-rx1" class="stat-value" style="color:var(--accent)">—</div></div>
              <div class="stat"><div class="stat-label">TX enp1s0f1</div><div id="sys-tx1" class="stat-value" style="color:var(--accent2)">—</div></div>
            </div>
            <div class="two-col" style="margin-top:12px">
              <div class="inner-card"><div class="card-title">Download RX — 30 min</div><div class="chart-wrap small"><canvas id="rx-canvas"></canvas></div></div>
              <div class="inner-card"><div class="card-title">Upload TX — 30 min</div><div class="chart-wrap small"><canvas id="tx-canvas"></canvas></div></div>
            </div>
          </div>

          <!-- DISK -->
          <div class="section-page" data-page="disk" style="display:none">
            <div class="section-title">Drev — overblik</div>
            ${['nvme','sda','sdd','sdb','sdc'].map(id => `
            <div class="disk-row">
              <div class="disk-info">
                <span id="disk-${id}-pct" class="disk-pct">—</span>
                <span class="disk-bar-wrap"><div class="gauge-bg disk-gauge"><div id="bar-disk-${id}" class="gauge-fill" style="width:0%"></div></div></span>
                <span id="disk-${id}-used" class="disk-used mono">—</span>
                <span class="disk-sep">fri:</span>
                <span id="disk-${id}-free" class="disk-free mono">—</span>
                <span id="disk-${id}-temp" class="disk-temp">—</span>
                <span id="disk-${id}-smart" class="disk-smart green">—</span>
              </div>
            </div>`).join('')}
          </div>

          <!-- DOCKER -->
          <div class="section-page" data-page="docker" style="display:none">
            <div class="stat-grid three">
              <div class="stat" style="border-top:2px solid var(--green)"><div class="stat-label">Kørende</div><div id="dk-running" class="stat-value" style="color:var(--green)">—</div></div>
              <div class="stat" style="border-top:2px solid var(--red)"><div class="stat-label">Stoppede</div><div id="dk-stopped" class="stat-value" style="color:var(--red)">—</div></div>
              <div class="stat" style="border-top:2px solid var(--accent)"><div class="stat-label">Total</div><div id="dk-total" class="stat-value accent">—</div></div>
            </div>
            <div class="section-title" style="margin-top:20px">🎬 Media</div>
            <div id="svc-grid-media" class="svc-grid"></div>
            <div class="section-title" style="margin-top:16px">📥 Download</div>
            <div id="svc-grid-download" class="svc-grid"></div>
            <div class="section-title" style="margin-top:16px">🎮 Minecraft</div>
            <div id="svc-grid-minecraft" class="svc-grid"></div>
            <div class="section-title" style="margin-top:16px">🔧 Øvrige</div>
            <div id="svc-grid-other" class="svc-grid"></div>
          </div>

          <!-- SERVICES -->
          <div class="section-page" data-page="services" style="display:none">
            <div class="section-title">OMV Services</div>
            <div id="services-grid" class="svc-grid"></div>
          </div>

          <!-- ACTIONS -->
          <div class="section-page" data-page="actions" style="display:none">
            <div class="section-title">Server</div>
            <div class="action-grid three">
              <button id="act-power-switch" class="act-btn power-switch">⚡ Tænd server</button>
              <button id="act-reboot"       class="act-btn amber">↺ Genstart server</button>
              <button id="act-shutdown"     class="act-btn red">⏻ Luk server ned</button>
            </div>
            <div class="section-title" style="margin-top:20px">OMV</div>
            <div class="action-grid three">
              <button id="act-apply"            class="act-btn sky">⚙ Anvend konfiguration</button>
              <button id="act-prune-containers" class="act-btn indigo">🗑 Container prune</button>
              <button id="act-prune-images"     class="act-btn indigo">🗑 Image prune</button>
            </div>
          </div>

        </div>
      </div>`;
  }

  _css() {
    return `
      :host { display:block; height:100%; }
      *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
      :host { --accent:#38bdf8; --accent2:#818cf8; --green:#10b981; --amber:#f59e0b; --red:#ef4444; --bg:var(--primary-background-color,#0f1923); --bg2:var(--secondary-background-color,#1a2535); --bg3:#243044; --text:var(--primary-text-color,#e2e8f0); --sub:var(--secondary-text-color,#94a3b8); --div:var(--divider-color,rgba(148,163,184,0.12)); --radius:18px; }
      .panel { display:flex; flex-direction:column; height:100%; background:var(--bg); color:var(--text); font-family:'DM Sans',var(--paper-font-body1_-_font-family,sans-serif); }
      .topbar { flex-shrink:0; padding:16px 28px 12px; background:var(--bg); border-bottom:1px solid var(--div); }
      .topbar-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
      .header-icon { width:42px; height:42px; background:linear-gradient(135deg,var(--accent),var(--accent2)); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
      .panel-title { font-size:17px; font-weight:700; } .panel-sub { font-size:12px; color:var(--sub); margin-top:2px; }
      .tab-bar { display:flex; gap:4px; flex-wrap:wrap; }
      .tab { padding:6px 14px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; color:var(--sub); background:transparent; border:none; font-family:inherit; transition:all 0.18s; }
      .tab:hover { background:var(--bg3); color:var(--text); }
      .tab.active { background:var(--bg3); color:var(--accent); }
      .status-bar { flex-shrink:0; display:flex; gap:0; padding:10px 28px; background:var(--bg2); border-bottom:1px solid var(--div); flex-wrap:wrap; }
      .sb-item { display:flex; align-items:center; gap:6px; padding-right:24px; }
      .sb-label { font-size:11px; color:var(--sub); text-transform:uppercase; letter-spacing:0.05em; }
      .sb-value { font-size:12px; font-weight:500; color:var(--text); }
      .alert-banner { flex-shrink:0; display:flex; align-items:flex-start; gap:8px; padding:10px 28px; background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.03)); border-bottom:1px solid rgba(245,158,11,0.25); font-size:13px; color:var(--amber); }
      .panel-scroll { flex:1; min-height:0; overflow-y:auto; overflow-x:hidden; padding:20px 28px 48px; }
      @media(max-width:600px) { .topbar{padding:12px 16px 8px} .status-bar{padding:8px 16px} .panel-scroll{padding:12px 16px 32px} }
      .section-title { font-size:11px; font-weight:700; color:var(--sub); text-transform:uppercase; letter-spacing:0.08em; margin:0 0 10px 2px; }
      .dot { display:inline-block; width:7px; height:7px; border-radius:50%; flex-shrink:0; }
      .dot.green { background:var(--green); box-shadow:0 0 5px rgba(16,185,129,0.5); }
      .dot.amber { background:var(--amber); box-shadow:0 0 5px rgba(245,158,11,0.5); }
      .dot.red   { background:var(--red);   box-shadow:0 0 5px rgba(239,68,68,0.5); }
      .stat-grid { display:grid; gap:10px; margin-bottom:14px; }
      .stat-grid.four  { grid-template-columns:repeat(4,1fr); }
      .stat-grid.three { grid-template-columns:repeat(3,1fr); }
      .stat-grid.two   { grid-template-columns:repeat(2,1fr); }
      @media(max-width:600px) { .stat-grid.four{grid-template-columns:repeat(2,1fr)} .stat-grid.three{grid-template-columns:repeat(2,1fr)} }
      .stat { background:var(--bg2); border-radius:12px; border:1px solid var(--div); padding:12px 14px; }
      .stat-label { font-size:11px; color:var(--sub); margin-bottom:4px; }
      .stat-value { font-size:20px; font-weight:700; color:var(--text); }
      .stat-value.accent { color:var(--accent); }
      .stat-sub { font-size:11px; color:var(--sub); margin-top:3px; }
      .stat-sub-row { display:flex; gap:2px; }
      .gauge-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
      .gauge-label { font-size:12px; color:var(--sub); min-width:48px; }
      .gauge-bg { flex:1; height:6px; background:var(--bg3); border-radius:3px; overflow:hidden; }
      .gauge-fill { height:100%; border-radius:3px; transition:width 0.5s ease, background 0.3s; }
      .gauge-pct { font-size:11px; color:var(--sub); min-width:60px; text-align:right; }
      .inner-card { background:var(--bg2); border:1px solid var(--div); border-radius:12px; padding:14px; }
      .inner-card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
      .card-title { font-size:12px; font-weight:500; color:var(--sub); }
      .two-col { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      @media(max-width:600px) { .two-col{grid-template-columns:1fr} }
      .ptab-row { display:flex; gap:4px; }
      .ptab { font-size:11px; padding:3px 10px; border-radius:6px; border:1px solid var(--div); background:transparent; color:var(--sub); cursor:pointer; font-family:inherit; transition:all 0.15s; }
      .ptab.active { background:var(--bg3); color:var(--accent); border-color:rgba(56,189,248,0.3); }
      .chart-wrap { position:relative; width:100%; height:180px; }
      .chart-wrap.small { height:120px; }
      .disk-row { margin-bottom:10px; }
      .disk-info { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .disk-pct { font-size:13px; font-weight:600; color:var(--text); min-width:42px; font-family:'DM Mono',monospace; }
      .disk-bar-wrap { flex:1; min-width:80px; }
      .disk-gauge { height:5px; }
      .disk-used,.disk-free { font-size:11px; font-family:'DM Mono',monospace; }
      .disk-used { color:var(--text); } .disk-free { color:var(--sub); }
      .disk-sep { font-size:11px; color:var(--sub); }
      .disk-temp { font-size:11px; color:var(--sub); min-width:54px; text-align:right; }
      .disk-smart { font-size:11px; font-weight:500; min-width:44px; text-align:right; }
      .disk-smart.green { color:var(--green); } .disk-smart.red { color:var(--red); }
      .svc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:6px; }
      .svc-chip { display:flex; align-items:center; gap:7px; padding:8px 10px; border-radius:9px; border:1px solid var(--div); background:var(--bg2); font-size:12px; font-weight:500; color:var(--text); }
      .svc-chip.running { border-color:rgba(16,185,129,0.25); }
      .svc-chip.stopped { opacity:0.45; border-color:rgba(239,68,68,0.2); }
      .svc-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
      .running .svc-dot { background:var(--green); box-shadow:0 0 5px rgba(16,185,129,0.5); }
      .stopped .svc-dot { background:var(--red); }
      .svc-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .action-grid { display:grid; gap:10px; }
      .action-grid.two   { grid-template-columns:1fr 1fr; }
      .action-grid.three { grid-template-columns:repeat(3,1fr); }
      @media(max-width:600px) { .action-grid.two{grid-template-columns:1fr} .action-grid.three{grid-template-columns:1fr} }
      .act-btn { padding:12px 16px; border-radius:11px; border:1px solid var(--div); background:var(--bg2); font-size:13px; font-weight:500; cursor:pointer; font-family:inherit; color:var(--text); transition:opacity 0.15s,transform 0.1s; text-align:center; }
      .act-btn:disabled { opacity:0.35; cursor:default; }
      .act-btn:not(:disabled):active { opacity:0.7; transform:scale(0.98); }
      .act-btn.power-switch { border-color:rgba(56,189,248,0.35); background:linear-gradient(135deg,rgba(56,189,248,0.12),rgba(56,189,248,0.04)); color:var(--accent); }
      .act-btn.power-switch:disabled { border-color:rgba(16,185,129,0.2); background:rgba(16,185,129,0.06); color:var(--green); }
      .act-btn.amber { border-color:rgba(245,158,11,0.35); background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04)); color:var(--amber); }
      .act-btn.red { border-color:rgba(239,68,68,0.35); background:linear-gradient(135deg,rgba(239,68,68,0.12),rgba(239,68,68,0.04)); color:var(--red); }
      .act-btn.sky { border-color:rgba(56,189,248,0.3); background:linear-gradient(135deg,rgba(56,189,248,0.12),rgba(56,189,248,0.04)); color:var(--accent); }
      .act-btn.indigo { border-color:rgba(129,140,248,0.3); background:linear-gradient(135deg,rgba(129,140,248,0.12),rgba(129,140,248,0.04)); color:var(--accent2); }
      .overlay { position:fixed; inset:0; background:rgba(15,25,35,0.8); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:100; }
      .dialog { background:var(--bg3); border:1px solid var(--div); border-radius:16px; padding:24px; width:calc(100% - 48px); max-width:340px; }
      .dialog-title { font-size:16px; font-weight:600; margin-bottom:10px; }
      .dialog-msg { font-size:13px; color:var(--sub); line-height:1.5; margin-bottom:20px; }
      .dialog-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .btn-cancel { padding:10px; border-radius:10px; border:1px solid var(--div); background:transparent; color:var(--sub); font-size:13px; font-weight:500; cursor:pointer; font-family:inherit; }
      .btn-ok { padding:10px; border-radius:10px; border:1px solid rgba(56,189,248,0.35); background:linear-gradient(135deg,rgba(56,189,248,0.18),rgba(56,189,248,0.08)); color:var(--accent); font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
      .mono { font-family:'DM Mono',monospace; }
    `;
  }

  static get panelUrl() { return 'server-monitor'; }
}

customElements.define('server-monitor-panel', ServerMonitorPanel);
