/**
 * Megalageret Server Monitor Card
 * Drop into /config/www/megalageret-server-card.js
 * Register in configuration.yaml or via UI Resources:
 *   url: /local/megalageret-server-card.js
 *   type: module
 */

class MegalageretServerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._chartLoaded = false;
    this._powerChart = null;
    this._netChart = null;
    this._powerHistory = [];
    this._activeTab = 'power';
  }

  setConfig(config) {
    this.config = {
      // Power meter entities
      power_entity:   config.power_entity   || 'sensor.server_energimaler_power',
      voltage_entity: config.voltage_entity || 'sensor.server_energimaler_voltage',
      current_entity: config.current_entity || 'sensor.server_energimaler_current',
      // Cost / energy
      price_entity:   config.price_entity   || 'sensor.energi_data_service',
      co2_entity:     config.co2_entity     || 'sensor.energi_data_service_co2',
      monthly_kwh_entity:  config.monthly_kwh_entity  || 'sensor.server_monthly_kwh',
      monthly_cost_entity: config.monthly_cost_entity || 'sensor.server_monthly_cost',
      // System
      uptime_entity:  config.uptime_entity  || 'sensor.megalageret_system_uptime',
      memory_entity:  config.memory_entity  || 'sensor.megalageret_system_memory',
      reboot_entity:  config.reboot_entity  || 'binary_sensor.megalageret_system_reboot_pending',
      update_entity:  config.update_entity  || 'binary_sensor.megalageret_system_update_available',
      // Services
      services_active_entity: config.services_active_entity || 'sensor.megalageret_services_active',
      services_total_entity:  config.services_total_entity  || 'sensor.megalageret_services_total',
      // Network
      rx_entity: config.rx_entity || 'sensor.megalageret_system_enp1s0f0_rx',
      tx_entity: config.tx_entity || 'sensor.megalageret_system_enp1s0f0_tx',
      // Compose services list (max 30)
      compose_entities: config.compose_entities || [
        'sensor.megalageret_compose',
        'sensor.megalageret_compose_2',
        'sensor.megalageret_compose_4',
        'sensor.megalageret_compose_5',
        'sensor.megalageret_compose_6',
        'sensor.megalageret_compose_7',
        'sensor.megalageret_compose_8',
        'sensor.megalageret_compose_9',
        'sensor.megalageret_compose_11',
        'sensor.megalageret_compose_12',
        'sensor.megalageret_compose_14',
        'sensor.megalageret_compose_15',
        'sensor.megalageret_compose_16',
        'sensor.megalageret_compose_18',
        'sensor.megalageret_compose_19',
        'sensor.megalageret_compose_20',
        'sensor.megalageret_compose_21',
        'sensor.megalageret_compose_22',
        'sensor.megalageret_compose_23',
        'sensor.megalageret_compose_24',
        'sensor.megalageret_compose_25',
        'sensor.megalageret_compose_29',
      ],
      title: config.title || 'Server Monitor',
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.innerHTML) {
      this._build();
    } else {
      this._update();
    }
  }

  _st(entity_id) {
    if (!this._hass || !this._hass.states[entity_id]) return null;
    return this._hass.states[entity_id];
  }

  _val(entity_id, fallback = '—') {
    const s = this._st(entity_id);
    return s ? s.state : fallback;
  }

  _num(entity_id, decimals = 1, fallback = 0) {
    const v = parseFloat(this._val(entity_id, fallback));
    return isNaN(v) ? fallback : parseFloat(v.toFixed(decimals));
  }

  _build() {
    const s = this.shadowRoot;
    s.innerHTML = `
      <style>${this._css()}</style>
      <div class="card" id="root">${this._html()}</div>
    `;
    this._loadChartJs().then(() => {
      this._initCharts();
      this._update();
    });
    this._bindTabs();
  }

  _update() {
    if (!this._hass) return;
    const h = this._hass;
    const $ = (id) => this.shadowRoot.getElementById(id);

    // Alert bar
    const updateOn = this._val(this.config.update_entity) === 'on';
    const rebootOn  = this._val(this.config.reboot_entity)  === 'on';
    const alertBar  = $('alert-bar');
    if (alertBar) {
      alertBar.style.display = (updateOn || rebootOn) ? 'flex' : 'none';
      if (updateOn && rebootOn) alertBar.querySelector('span:last-child').textContent = 'Softwareopdatering + reboot påkrævet';
      else if (updateOn)        alertBar.querySelector('span:last-child').textContent = 'Softwareopdatering tilgængelig — kræver handling';
      else if (rebootOn)        alertBar.querySelector('span:last-child').textContent = 'Reboot påkrævet';
    }

    // Status metrics
    this._setText('val-uptime',  this._val(this.config.uptime_entity));
    this._setText('val-reboot',  rebootOn ? 'Påkrævet' : 'Ikke påkrævet');
    this._setText('val-reboot-dot', '', rebootOn ? 'dot dot-amber' : 'dot dot-green');

    const active = parseInt(this._val(this.config.services_active_entity, '0'));
    const total  = parseInt(this._val(this.config.services_total_entity, '22'));
    this._setText('val-services', `${active}/${total}`);
    const inactiveCnt = total - active;
    this._setText('val-services-sub', `${inactiveCnt} inaktive`);
    this._setText('val-services-dot', '', inactiveCnt > 0 ? 'dot dot-amber' : 'dot dot-green');

    const ram = this._num(this.config.memory_entity, 0);
    this._setText('val-ram', `${ram}%`);
    this._setText('val-ram-dot', '', ram >= 85 ? 'dot dot-red' : ram >= 70 ? 'dot dot-amber' : 'dot dot-green');
    const ramBar = $('bar-ram');
    if (ramBar) { ramBar.style.width = ram + '%'; ramBar.style.background = ram >= 85 ? '#e24b4a' : ram >= 70 ? '#ef9f27' : '#2d9e75'; }

    // Power
    const power = this._num(this.config.power_entity, 0);
    this._setText('val-power', power + ' W');
    const pBar = $('bar-power');
    if (pBar) { pBar.style.width = Math.min(power / 3, 100) + '%'; pBar.style.background = power > 200 ? '#e24b4a' : power > 150 ? '#ef9f27' : '#2d9e75'; }

    this._setText('val-voltage', this._num(this.config.voltage_entity, 0) + ' V');
    this._setText('val-current', this._num(this.config.current_entity, 2) + ' A');
    this._setText('val-price',   this._num(this.config.price_entity, 2) + ' kr/kWh');
    this._setText('val-co2',     this._num(this.config.co2_entity, 0) + ' g/kWh');

    const kwh  = this._num(this.config.monthly_kwh_entity, 1);
    const cost = this._num(this.config.monthly_cost_entity, 2);
    this._setText('val-kwh',  kwh + ' kWh');
    this._setText('val-cost', cost + ' kr');

    // Forecast: extrapolate to end of month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const daysSoFar   = now.getDate() + (now.getHours() / 24);
    const fwdKwh  = daysSoFar > 0 ? parseFloat((kwh  / daysSoFar * daysInMonth).toFixed(1)) : 0;
    const fwdCost = daysSoFar > 0 ? parseFloat((cost / daysSoFar * daysInMonth).toFixed(2)) : 0;
    this._setText('val-kwh-fwd',  `Fremskrevet: ~${fwdKwh} kWh`);
    this._setText('val-cost-fwd', `Fremskrevet: ~${fwdCost} kr`);

    // Services grid
    this._renderServices();

    // Power history ring buffer
    this._powerHistory.push(power);
    if (this._powerHistory.length > 60) this._powerHistory.shift();
    if (this._chartLoaded) this._updatePowerChart();
  }

  _setText(id, text, className) {
    const el = this.shadowRoot.getElementById(id);
    if (!el) return;
    if (text !== '') el.textContent = text;
    if (className !== undefined) el.className = className;
  }

  _renderServices() {
    const grid = this.shadowRoot.getElementById('svc-grid');
    if (!grid) return;
    grid.innerHTML = '';
    this.config.compose_entities.forEach(eid => {
      const state = this._val(eid, 'unknown');
      const on    = state === 'on';
      const name  = eid.replace('sensor.megalageret_', '').replace(/_/g, ' ');
      const div   = document.createElement('div');
      div.className = 'svc' + (on ? '' : ' inactive');
      div.innerHTML = `<span class="dot ${on ? 'dot-green' : 'dot-red'}"></span><span>${name}</span>`;
      grid.appendChild(div);
    });
  }

  _loadChartJs() {
    return new Promise((resolve) => {
      if (window.Chart) { this._chartLoaded = true; resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      s.onload = () => { this._chartLoaded = true; resolve(); };
      document.head.appendChild(s);
    });
  }

  _initCharts() {
    const root = this.shadowRoot;
    const pcv  = root.getElementById('power-canvas');
    const ncv  = root.getElementById('net-canvas');
    if (!pcv || !ncv || !window.Chart) return;

    const labels60 = Array.from({length:60}, (_,i) => i % 10 === 0 ? `-${60-i}m` : '');

    this._powerChart = new Chart(pcv.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels60,
        datasets: [{
          label: 'W',
          data: Array(60).fill(null),
          borderColor: '#378add',
          backgroundColor: 'rgba(55,138,221,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1.5,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 9 }, color: '#888' }, grid: { display: false } },
          y: { ticks: { font: { size: 9 }, color: '#888', callback: v => v + 'W' }, grid: { color: 'rgba(128,128,128,0.12)' } }
        }
      }
    });

    const netLabels = Array.from({length:20}, (_,i) => i % 5 === 0 ? `-${20-i}m` : '');
    this._netChart = new Chart(ncv.getContext('2d'), {
      type: 'line',
      data: {
        labels: netLabels,
        datasets: [
          { label: 'RX', data: Array(20).fill(null), borderColor: '#2d9e75', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
          { label: 'TX', data: Array(20).fill(null), borderColor: '#d85a30', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 1.5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 9 }, color: '#888' }, grid: { display: false } },
          y: { ticks: { font: { size: 9 }, color: '#888' }, grid: { color: 'rgba(128,128,128,0.12)' } }
        }
      }
    });
  }

  _updatePowerChart() {
    if (!this._powerChart) return;
    const padded = Array(60).fill(null);
    this._powerHistory.forEach((v, i) => { padded[60 - this._powerHistory.length + i] = v; });

    let chartData;
    if (this._activeTab === 'power') {
      chartData = padded;
      this._powerChart.data.datasets[0].borderColor = '#378add';
      this._powerChart.data.datasets[0].backgroundColor = 'rgba(55,138,221,0.08)';
      this._powerChart.options.scales.y.ticks.callback = v => v + 'W';
    } else if (this._activeTab === 'kwh') {
      let acc = 0;
      chartData = padded.map(v => { if (v !== null) acc += v / 1000 / 60; return v !== null ? parseFloat(acc.toFixed(3)) : null; });
      this._powerChart.data.datasets[0].borderColor = '#2d9e75';
      this._powerChart.data.datasets[0].backgroundColor = 'rgba(45,158,117,0.08)';
      this._powerChart.options.scales.y.ticks.callback = v => v + 'kWh';
    } else {
      const price = parseFloat(this._val(this.config.price_entity, '1.5'));
      let acc = 0;
      chartData = padded.map(v => { if (v !== null) acc += (v / 1000 / 60) * price; return v !== null ? parseFloat(acc.toFixed(3)) : null; });
      this._powerChart.data.datasets[0].borderColor = '#ba7517';
      this._powerChart.data.datasets[0].backgroundColor = 'rgba(186,117,23,0.08)';
      this._powerChart.options.scales.y.ticks.callback = v => v + 'kr';
    }

    this._powerChart.data.datasets[0].data = chartData;
    this._powerChart.update('none');
  }

  _bindTabs() {
    this.shadowRoot.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (!tab) return;
      this._activeTab = tab.dataset.tab;
      this.shadowRoot.querySelectorAll('[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === this._activeTab));
      if (this._chartLoaded) this._updatePowerChart();
    });
  }

  _html() {
    return `
      <div class="header">
        <span class="title">${this.config.title}</span>
        <span class="updated">opdateret nu</span>
      </div>

      <div id="alert-bar" class="alert-bar" style="display:none">
        <span class="alert-icon">⚠</span>
        <span>Softwareopdatering tilgængelig</span>
      </div>

      <div class="section-label">Status</div>
      <div class="metric-grid">
        <div class="metric">
          <div class="metric-label">Oppetid</div>
          <div id="val-uptime" class="metric-value">—</div>
          <div class="metric-sub"><span class="dot dot-green"></span>Online</div>
        </div>
        <div class="metric">
          <div class="metric-label">Reboot</div>
          <div id="val-reboot" class="metric-value" style="font-size:13px;padding-top:6px">—</div>
          <div class="metric-sub"><span id="val-reboot-dot" class="dot dot-green"></span></div>
        </div>
        <div class="metric">
          <div class="metric-label">Services</div>
          <div id="val-services" class="metric-value">—</div>
          <div class="metric-sub"><span id="val-services-dot" class="dot dot-green"></span><span id="val-services-sub"></span></div>
        </div>
        <div class="metric">
          <div class="metric-label">RAM</div>
          <div id="val-ram" class="metric-value">—</div>
          <div class="metric-sub"><span id="val-ram-dot" class="dot dot-green"></span></div>
        </div>
      </div>

      <div class="section-label">Strøm & energi</div>
      <div class="metric-grid">
        <div class="metric">
          <div class="metric-label">Live forbrug</div>
          <div id="val-power" class="metric-value">—</div>
          <div class="metric-sub">Max 300W</div>
        </div>
        <div class="metric">
          <div class="metric-label">Volt</div>
          <div id="val-voltage" class="metric-value">—</div>
        </div>
        <div class="metric">
          <div class="metric-label">Ampere</div>
          <div id="val-current" class="metric-value">—</div>
        </div>
        <div class="metric">
          <div class="metric-label">Strømpris</div>
          <div id="val-price" class="metric-value">—</div>
        </div>
      </div>

      <div class="section-label">Månedlig tracker</div>
      <div class="metric-grid three">
        <div class="metric">
          <div class="metric-label">kWh denne måned</div>
          <div id="val-kwh" class="metric-value">—</div>
          <div id="val-kwh-fwd" class="metric-sub"></div>
        </div>
        <div class="metric">
          <div class="metric-label">Månedlig pris</div>
          <div id="val-cost" class="metric-value">—</div>
          <div id="val-cost-fwd" class="metric-sub"></div>
        </div>
        <div class="metric">
          <div class="metric-label">CO₂</div>
          <div id="val-co2" class="metric-value">—</div>
          <div class="metric-sub">g/kWh</div>
        </div>
      </div>

      <div class="inner-card">
        <div class="card-title">Strømforbrug — live (60 min)</div>
        <div class="tab-row">
          <button class="tab active" data-tab="power">Forbrug (W)</button>
          <button class="tab" data-tab="kwh">kWh</button>
          <button class="tab" data-tab="cost">Pris (kr)</button>
        </div>
        <div class="chart-wrap"><canvas id="power-canvas"></canvas></div>
      </div>

      <div class="two-col">
        <div class="inner-card">
          <div class="card-title">Ressourcer</div>
          <div class="gauge-row">
            <span class="gauge-name">RAM</span>
            <div class="gauge-bg"><div id="bar-ram" class="gauge-fill" style="width:0%;background:#2d9e75"></div></div>
            <span id="val-ram-bar" class="gauge-pct" id="val-ram">—</span>
          </div>
          <div class="gauge-row">
            <span class="gauge-name">Strøm</span>
            <div class="gauge-bg"><div id="bar-power" class="gauge-fill" style="width:0%;background:#2d9e75"></div></div>
          </div>
        </div>
        <div class="inner-card">
          <div class="card-title">Netværk — enp1s0f0</div>
          <div class="net-legend">
            <span><span class="leg-dot" style="background:#2d9e75"></span>RX</span>
            <span><span class="leg-dot" style="background:#d85a30"></span>TX</span>
          </div>
          <div class="chart-wrap small"><canvas id="net-canvas"></canvas></div>
        </div>
      </div>

      <div class="section-label">Docker services</div>
      <div class="inner-card">
        <div id="svc-grid" class="svc-grid"></div>
      </div>
    `;
  }

  _css() {
    return `
      :host { display: block; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .card {
        background: var(--card-background-color, #fff);
        border-radius: 12px;
        padding: 16px;
        font-family: var(--primary-font-family, sans-serif);
        color: var(--primary-text-color, #212121);
      }
      .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
      .title  { font-size: 15px; font-weight: 500; }
      .updated { font-size: 11px; color: var(--secondary-text-color, #727272); }
      .alert-bar {
        background: #faeeda; border-left: 3px solid #ef9f27;
        border-radius: 0 8px 8px 0; padding: 8px 12px; margin-bottom: 12px;
        display: flex; align-items: center; gap: 8px;
        font-size: 12px; color: #633806;
      }
      .alert-icon { font-size: 14px; }
      .section-label {
        font-size: 10px; font-weight: 500; letter-spacing: 0.08em;
        text-transform: uppercase; color: var(--secondary-text-color, #727272);
        margin: 14px 0 8px;
      }
      .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .metric-grid.three { grid-template-columns: repeat(3, 1fr); }
      @media (max-width: 420px) {
        .metric-grid { grid-template-columns: repeat(2, 1fr); }
        .metric-grid.three { grid-template-columns: repeat(2, 1fr); }
        .two-col { grid-template-columns: 1fr; }
      }
      .metric {
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 8px; padding: 10px 12px;
      }
      .metric-label { font-size: 11px; color: var(--secondary-text-color, #727272); margin-bottom: 3px; }
      .metric-value { font-size: 18px; font-weight: 500; }
      .metric-sub   { font-size: 10px; color: var(--secondary-text-color, #727272); margin-top: 3px; display: flex; align-items: center; gap: 4px; }
      .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
      .dot-green { background: #2d9e75; }
      .dot-amber { background: #ef9f27; }
      .dot-red   { background: #e24b4a; }
      .inner-card {
        background: var(--card-background-color, #fff);
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        border-radius: 10px; padding: 12px 14px; margin-top: 10px;
      }
      .card-title { font-size: 12px; font-weight: 500; color: var(--secondary-text-color, #727272); margin-bottom: 10px; }
      .tab-row { display: flex; gap: 5px; margin-bottom: 10px; flex-wrap: wrap; }
      .tab {
        font-size: 11px; padding: 4px 10px; border-radius: 6px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.15));
        background: transparent; color: var(--secondary-text-color, #727272);
        cursor: pointer; font-family: inherit;
      }
      .tab.active {
        background: var(--secondary-background-color, #f0f0f0);
        color: var(--primary-text-color, #212121); font-weight: 500;
      }
      .chart-wrap { position: relative; width: 100%; height: 180px; }
      .chart-wrap.small { height: 120px; }
      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .gauge-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
      .gauge-name { font-size: 12px; min-width: 50px; color: var(--secondary-text-color, #727272); }
      .gauge-bg { flex: 1; height: 7px; background: var(--secondary-background-color, #eee); border-radius: 4px; overflow: hidden; }
      .gauge-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease, background 0.3s; }
      .gauge-pct { font-size: 11px; min-width: 36px; text-align: right; }
      .net-legend { display: flex; gap: 12px; font-size: 11px; color: var(--secondary-text-color, #727272); margin-bottom: 8px; }
      .leg-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 3px; }
      .svc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 6px; }
      .svc {
        border: 1px solid var(--divider-color, rgba(0,0,0,0.1));
        border-radius: 6px; padding: 6px 9px;
        display: flex; align-items: center; gap: 6px;
        font-size: 11px; color: var(--primary-text-color, #212121);
        background: var(--card-background-color, #fff);
      }
      .svc.inactive { opacity: 0.45; }
    `;
  }

  getCardSize() { return 6; }

  static getConfigElement() {
    return document.createElement('megalageret-server-card-editor');
  }

  static getStubConfig() {
    return { title: 'Server Monitor' };
  }
}

customElements.define('megalageret-server-card', MegalageretServerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'megalageret-server-card',
  name: 'Megalageret Server Monitor',
  description: 'Live power, services, network and system stats for megalageret',
  preview: false,
});
