/**
 * Server Monitor — Mobile Card
 * type: custom:server-monitor-card
 * Served at: /local/server_monitor/server-monitor-card.js
 */
class ServerMonitorCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._hass = null; }

  setConfig(config) {
    this.config = {
      title:                 config.title                 || 'megalageret',
      uptime_entity:         config.uptime_entity         || 'sensor.omv_megalageret_local_uptime',
      reboot_entity:         config.reboot_entity         || 'binary_sensor.omv_megalageret_local_reboot_required',
      update_entity:         config.update_entity         || 'update.omv_megalageret_local_system_update',
      packages_entity:       config.packages_entity       || 'sensor.omv_megalageret_local_available_package_updates',
      docker_running_entity: config.docker_running_entity || 'sensor.megalageret_docker_running_2',
      docker_total_entity:   config.docker_total_entity   || 'sensor.megalageret_docker_total_2',
      docker_stopped_entity: config.docker_stopped_entity || 'sensor.omv_megalageret_local_docker_containers_not_running',
      power_entity:          config.power_entity          || 'sensor.server_energimaler_power',
      price_entity:          config.price_entity          || 'sensor.energy_hub_elhub_price_total',
      power_switch:          config.power_switch          || 'switch.megalageret_remote_socket_1',
      reboot_button:         config.reboot_button         || 'button.omv_megalageret_local_reboot',
      shutdown_button:       config.shutdown_button       || 'button.omv_megalageret_local_shutdown',
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.innerHTML) { this._build(); } else { this._update(); }
  }

  _val(eid, fallback = '—') { return this._hass?.states[eid]?.state ?? fallback; }
  _isOn(eid) { const s = this._val(eid, 'off'); return s === 'on' || s === 'true'; }
  _num(eid, fallback = 0) { const v = parseFloat(this._val(eid, fallback)); return isNaN(v) ? fallback : v; }

  _build() {
    this.shadowRoot.innerHTML = `<style>${this._css()}</style>${this._html()}`;
    this._bindActions();
    this._update();
  }

  _update() {
    if (!this._hass) return;
    const $ = (id) => this.shadowRoot.getElementById(id);

    // ── Online / uptime ──
    const uptimeRaw = this._val(this.config.uptime_entity, null);
    const online = uptimeRaw !== null && !['unavailable','unknown','—'].includes(uptimeRaw);
    $('dot-online').className     = 'status-dot ' + (online ? 'green' : 'red');
    $('label-online').textContent = online ? 'Online' : 'Offline';
    $('val-uptime').textContent   = online ? uptimeRaw : '—';

    // ── Power switch — kun tænd, kan ikke slukke ──
    // on  = strøm til serveren, server kører → knap disabled (grå)
    // off = ingen strøm → knap aktiv, tænder stikkontakten
    const switchOn      = this._isOn(this.config.power_switch);
    const switchUnavail = this._val(this.config.power_switch) === 'unavailable';
    const switchBtn     = $('btn-power-switch');
    if (switchBtn) {
      if (switchUnavail) {
        switchBtn.textContent = '⚡ Utilgængelig';
        switchBtn.className   = 'btn btn-switch-disabled';
        switchBtn.disabled    = true;
      } else if (switchOn) {
        switchBtn.textContent = '⚡ Strøm til serveren';
        switchBtn.className   = 'btn btn-switch-on';
        switchBtn.disabled    = true;
      } else {
        switchBtn.textContent = '⚡ Tænd strøm';
        switchBtn.className   = 'btn btn-switch-off';
        switchBtn.disabled    = false;
      }
    }

    // ── Live strøm + pris ──
    const power = this._num(this.config.power_entity, 0);
    const powerEl = $('val-power');
    if (powerEl) {
      powerEl.textContent = power + ' W';
      powerEl.style.color = power > 200 ? 'var(--red)' : power > 150 ? 'var(--amber)' : 'var(--accent)';
    }
    const price   = this._num(this.config.price_entity, 0);
    const priceEl = $('val-price');
    if (priceEl) priceEl.textContent = price.toFixed(2) + ' kr/kWh';

    const bar = $('bar-power');
    if (bar) {
      bar.style.width      = Math.min(power / 3, 100) + '%';
      bar.style.background = power > 200 ? 'var(--red)' : power > 150 ? 'var(--amber)' : 'var(--accent)';
    }

    // ── Reboot ──
    const rebootOn = this._isOn(this.config.reboot_entity);
    $('dot-reboot').className   = 'status-dot ' + (rebootOn ? 'amber' : 'green');
    $('val-reboot').textContent = rebootOn ? 'Påkrævet' : 'Ikke påkrævet';

    // ── Updates ──
    const updateOn = this._isOn(this.config.update_entity);
    const pkgs     = this._num(this.config.packages_entity, 0);
    $('dot-update').className = 'status-dot ' + (updateOn || pkgs > 0 ? 'amber' : 'green');
    if      (updateOn && pkgs > 0) $('val-update').textContent = `System + ${pkgs} pakker`;
    else if (updateOn)             $('val-update').textContent = 'System update';
    else if (pkgs > 0)             $('val-update').textContent = `${pkgs} pakker`;
    else                           $('val-update').textContent = 'Opdateret';

    // ── Docker ──
    const running = this._num(this.config.docker_running_entity, 0);
    const total   = this._num(this.config.docker_total_entity, 0);
    const stopped = this._num(this.config.docker_stopped_entity, 0);
    $('dot-docker').className   = 'status-dot ' + (stopped > 0 ? 'amber' : 'green');
    $('val-docker').textContent = `${running}/${total} kørende`;

    // ── Alert banner ──
    const alerts = [];
    if (rebootOn)    alerts.push('Reboot påkrævet');
    if (updateOn)    alerts.push('Systemopdatering tilgængelig');
    if (pkgs > 0)    alerts.push(`${pkgs} pakkeopdateringer`);
    if (stopped > 0) alerts.push(`${stopped} container(e) stoppet`);
    const banner = $('alert-banner');
    banner.style.display = alerts.length ? 'flex' : 'none';
    $('alert-text').textContent = alerts.join(' · ');
  }

  _bindActions() {
    this.shadowRoot.getElementById('btn-reboot')?.addEventListener('click', () =>
      this._confirm('↺ Genstart server?', 'Serveren genstarter og vil være utilgængelig i ca. 1–2 minutter.',
        () => this._hass?.callService('button', 'press', { entity_id: this.config.reboot_button }))
    );
    this.shadowRoot.getElementById('btn-shutdown')?.addEventListener('click', () =>
      this._confirm('⏻ Luk server ned?', 'Serveren lukkes ned og skal startes manuelt igen.',
        () => this._hass?.callService('button', 'press', { entity_id: this.config.shutdown_button }))
    );
    this.shadowRoot.getElementById('btn-power-switch')?.addEventListener('click', () => {
      // Kun tænd — ingen slukning via denne knap
      if (!this._isOn(this.config.power_switch)) {
        this._hass?.callService('switch', 'turn_on', { entity_id: this.config.power_switch });
      }
    });
  }

  _confirm(title, message, onConfirm) {
    const o = this.shadowRoot.getElementById('confirm-overlay');
    if (!o) return;
    this.shadowRoot.getElementById('confirm-title').textContent = title;
    this.shadowRoot.getElementById('confirm-msg').textContent   = message;
    o.style.display = 'flex';
    const close = () => { o.style.display = 'none'; };
    this.shadowRoot.getElementById('confirm-ok').addEventListener('click',     () => { onConfirm(); close(); }, { once: true });
    this.shadowRoot.getElementById('confirm-cancel').addEventListener('click', close, { once: true });
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
      <div class="card">
        <div class="header">
          <div class="header-left">
            <div class="header-icon">🖥</div>
            <div><div class="title">${this.config.title}</div><div class="subtitle">Server Monitor</div></div>
          </div>
          <div class="header-right">
            <span id="dot-online" class="status-dot green"></span>
            <span id="label-online" class="online-label">Online</span>
          </div>
        </div>
        <div id="alert-banner" class="alert-banner" style="display:none">
          <span class="alert-icon">⚠</span><span id="alert-text"></span>
        </div>
        <div class="power-row">
          <div class="power-left">
            <span class="power-label">⚡ Live forbrug</span>
            <span id="val-power" class="power-value">— W</span>
          </div>
          <div class="power-right">
            <div class="power-bar-wrap">
              <div class="power-bar-bg"><div id="bar-power" class="power-bar-fill"></div></div>
              <span class="power-max">300W</span>
            </div>
            <div class="power-price-row">
              <span class="power-price-label">Pris nu</span>
              <span id="val-price" class="power-price-value">— kr/kWh</span>
            </div>
          </div>
        </div>
        <div class="rows">
          <div class="row"><div class="row-left"><span id="dot-reboot" class="status-dot green"></span><span class="row-label">Reboot</span></div><span id="val-reboot" class="row-value">—</span></div>
          <div class="row"><div class="row-left"><span id="dot-update" class="status-dot green"></span><span class="row-label">Opdateringer</span></div><span id="val-update" class="row-value">—</span></div>
          <div class="row"><div class="row-left"><span id="dot-docker" class="status-dot green"></span><span class="row-label">Docker</span></div><span id="val-docker" class="row-value">—</span></div>
          <div class="row row-last"><div class="row-left"><span class="row-label">⏱ Oppetid</span></div><span id="val-uptime" class="row-value mono">—</span></div>
        </div>
        <div class="actions three">
          <button id="btn-reboot"       class="btn btn-amber">↺ Genstart</button>
          <button id="btn-shutdown"     class="btn btn-red">⏻ Luk ned</button>
          <button id="btn-power-switch" class="btn btn-switch-off">⚡ Tænd strøm</button>
        </div>
      </div>`;
  }

  _css() {
    return `
      :host { display: block; }
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :host { --accent:#38bdf8; --accent2:#818cf8; --green:#10b981; --amber:#f59e0b; --red:#ef4444; --bg3:#243044; --text:var(--primary-text-color,#e2e8f0); --sub:var(--secondary-text-color,#94a3b8); --div:var(--divider-color,rgba(148,163,184,0.12)); --radius:18px; }
      .card { background:var(--card-background-color); border-radius:var(--radius); border:1px solid var(--div); padding:16px; font-family:'DM Sans',var(--paper-font-body1_-_font-family,sans-serif); color:var(--text); position:relative; overflow:hidden; }
      .card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,var(--accent),var(--accent2)); border-radius:var(--radius) var(--radius) 0 0; }
      .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
      .header-left { display:flex; align-items:center; gap:10px; }
      .header-icon { width:38px; height:38px; background:linear-gradient(135deg,var(--accent),var(--accent2)); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; }
      .title { font-size:15px; font-weight:600; } .subtitle { font-size:11px; color:var(--sub); margin-top:1px; }
      .header-right { display:flex; align-items:center; gap:6px; } .online-label { font-size:12px; color:var(--sub); }
      .alert-banner { display:flex; align-items:flex-start; gap:8px; background:linear-gradient(135deg,rgba(245,158,11,0.18),rgba(245,158,11,0.04)); border-left:3px solid var(--amber); border-radius:0 8px 8px 0; padding:8px 10px; margin-bottom:10px; font-size:12px; color:var(--amber); }
      .power-row { display:flex; align-items:center; gap:10px; background:rgba(56,189,248,0.06); border:1px solid rgba(56,189,248,0.15); border-radius:10px; padding:10px 12px; margin-bottom:10px; }
      .power-left { display:flex; flex-direction:column; gap:2px; min-width:90px; }
      .power-label { font-size:11px; color:var(--sub); }
      .power-value { font-size:20px; font-weight:700; color:var(--accent); }
      .power-right { flex:1; display:flex; flex-direction:column; gap:6px; }
      .power-bar-wrap { display:flex; align-items:center; gap:6px; }
      .power-bar-bg { flex:1; height:5px; background:rgba(148,163,184,0.15); border-radius:3px; overflow:hidden; }
      .power-bar-fill { height:100%; width:0%; background:var(--accent); border-radius:3px; transition:width 0.5s ease, background 0.3s; }
      .power-max { font-size:10px; color:var(--sub); white-space:nowrap; }
      .power-price-row { display:flex; justify-content:space-between; align-items:center; }
      .power-price-label { font-size:11px; color:var(--sub); }
      .power-price-value { font-size:12px; font-weight:600; color:var(--accent2); }
      .status-dot { display:inline-block; width:8px; height:8px; border-radius:50%; flex-shrink:0; }
      .status-dot.green { background:var(--green); box-shadow:0 0 6px rgba(16,185,129,0.5); }
      .status-dot.amber { background:var(--amber); box-shadow:0 0 6px rgba(245,158,11,0.5); }
      .status-dot.red   { background:var(--red);   box-shadow:0 0 6px rgba(239,68,68,0.5); }
      .rows { display:flex; flex-direction:column; }
      .row { display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid var(--div); }
      .row-last { border-bottom:none; } .row-left { display:flex; align-items:center; gap:8px; }
      .row-label { font-size:13px; color:var(--sub); } .row-value { font-size:13px; font-weight:500; color:var(--text); }
      .mono { font-family:'DM Mono',monospace; font-size:11px; }
      .actions { display:grid; gap:8px; margin-top:12px; }
      .actions.three { grid-template-columns:1fr 1fr; }
      .actions.three .btn:last-child { grid-column:1/-1; }
      .btn { padding:9px 0; border-radius:10px; border:none; font-size:13px; font-weight:500; cursor:pointer; font-family:inherit; transition:opacity 0.15s,transform 0.1s; }
      .btn:disabled { opacity:0.35; cursor:default; }
      .btn:not(:disabled):active { opacity:0.75; transform:scale(0.97); }
      .btn-amber { background:linear-gradient(135deg,rgba(245,158,11,0.18),rgba(245,158,11,0.08)); border:1px solid rgba(245,158,11,0.35); color:var(--amber); }
      .btn-red { background:linear-gradient(135deg,rgba(239,68,68,0.18),rgba(239,68,68,0.08)); border:1px solid rgba(239,68,68,0.35); color:var(--red); }
      .btn-switch-on { background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); color:var(--green); }
      .btn-switch-off { background:linear-gradient(135deg,rgba(56,189,248,0.18),rgba(56,189,248,0.08)); border:1px solid rgba(56,189,248,0.35); color:var(--accent); }
      .btn-switch-disabled { background:rgba(148,163,184,0.06); border:1px solid rgba(148,163,184,0.15); color:var(--sub); }
      .overlay { position:absolute; inset:0; background:rgba(15,25,35,0.85); backdrop-filter:blur(4px); border-radius:var(--radius); display:flex; align-items:center; justify-content:center; z-index:10; }
      .dialog { background:var(--bg3); border:1px solid var(--div); border-radius:14px; padding:20px; width:calc(100% - 32px); max-width:280px; }
      .dialog-title { font-size:15px; font-weight:600; margin-bottom:8px; } .dialog-msg { font-size:13px; color:var(--sub); line-height:1.5; margin-bottom:16px; }
      .dialog-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .btn-cancel { padding:9px 0; border-radius:9px; border:1px solid var(--div); background:transparent; color:var(--sub); font-size:13px; font-weight:500; cursor:pointer; font-family:inherit; }
      .btn-ok { padding:9px 0; border-radius:9px; border:1px solid rgba(56,189,248,0.35); background:linear-gradient(135deg,rgba(56,189,248,0.18),rgba(56,189,248,0.08)); color:var(--accent); font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
    `;
  }

  getCardSize() { return 4; }
  static getStubConfig() { return { title: 'megalageret' }; }
}

customElements.define('server-monitor-card', ServerMonitorCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'server-monitor-card', name: 'Server Monitor — Mobil', description: 'Kompakt status-kort', preview: false });
