/* ═══════════════════════════════════════════════════════
   DEALPAM — Frontend Application
   ═══════════════════════════════════════════════════════ */
const App = (() => {
  // ── STATE ──────────────────────────────────────────────
  let settings = {};
  let charts = {};
  let reportMode = 'monthly';
  let reportYear = new Date().getFullYear().toString();
  let reportFrom = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  let reportTo = new Date().toISOString().slice(0, 10);
  const PAGE_META = {
    dashboard:    { title: 'Tableau de bord',       sub: 'Vue générale de votre activité' },
    rapports:     { title: 'Rapports & CA',          sub: 'Analyse de votre chiffre d\'affaires' },
    produits:     { title: 'Produits',               sub: 'Gestion du catalogue et des stocks' },
    ventes:       { title: 'Ventes',                 sub: 'Registre complet des transactions' },
    clients:      { title: 'Clients',                sub: 'Suivi de votre portefeuille clients' },
    depenses:     { title: 'Dépenses',               sub: 'Suivi de vos coûts et charges' },
    utilisateurs: { title: 'Utilisateurs',           sub: 'Gestion des accès et des rôles' },
    parametres:   { title: 'Paramètres',             sub: 'Configuration de l\'application' },
  };

  // ── API ────────────────────────────────────────────────
  async function api(method, url, data) {
    try {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (data) opts.body = JSON.stringify(data);
      const r = await fetch(url, opts);
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
      return r.json();
    } catch (e) { toast(e.message || 'Erreur réseau', 'error'); throw e; }
  }
  const GET  = url       => api('GET',    url);
  const POST = (url, d)  => api('POST',   url, d);
  const PUT  = (url, d)  => api('PUT',    url, d);
  const DEL  = url       => api('DELETE', url);

  // ── TOAST ──────────────────────────────────────────────
  function toast(msg, type = 'success') {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type]||'✓'}</span>${msg}`;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => { t.style.animation = 'toastOut .4s ease forwards'; setTimeout(() => t.remove(), 400); }, 3000);
  }

  // ── MODAL ──────────────────────────────────────────────
  function openModal(title, bodyHTML, confirmLabel, confirmFn) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    const btn = document.getElementById('modal-confirm');
    btn.textContent = confirmLabel || 'Confirmer';
    btn.onclick = confirmFn || closeModal;
    document.getElementById('overlay').classList.add('open');
  }
  function closeModal() {
    document.getElementById('overlay').classList.remove('open');
    setTimeout(() => { document.getElementById('modal-body').innerHTML = ''; }, 200);
  }
  document.getElementById('overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closeModal(); });

  // ── NAV ────────────────────────────────────────────────
  function nav(page) {
    killCharts();
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === page);
    });
    const meta = PAGE_META[page] || {};
    document.getElementById('page-title').textContent = meta.title || page;
    document.getElementById('page-sub').textContent   = meta.sub  || '';
    document.getElementById('action-btn').style.display = page === 'ventes' ? 'flex' : 'none';
    document.getElementById('content').innerHTML = `<div class="loading"><div class="spinner"></div> Chargement...</div>`;
    const pages = { dashboard, rapports, produits, ventes, clients, depenses, utilisateurs, parametres };
    (pages[page] || dashboard)();
  }
  document.querySelectorAll('.nav-item[data-page]').forEach(n => n.addEventListener('click', () => nav(n.dataset.page)));

  function killCharts() {
    Object.values(charts).forEach(c => { try { c.destroy(); } catch (e) {} });
    charts = {};
  }

  // ── INIT ───────────────────────────────────────────────
  async function init() {
    try {
      settings = await GET('/api/settings');
    } catch (e) {
      settings = { exchangeRate: 136, companyName: 'DEALPAM', currentUser: 'Admin' };
    }
    document.getElementById('rate-pill').textContent = `Taux: ${settings.exchangeRate} HTG/USD`;
    const u = settings.currentUser || 'Admin';
    document.getElementById('user-name').textContent = u;
    document.getElementById('user-ava').textContent  = u.charAt(0).toUpperCase();
    nav('dashboard');
  }

  // ── UTILS ──────────────────────────────────────────────
  function htg(usd)  { return Math.round((usd || 0) * (settings.exchangeRate || 136)).toLocaleString() + ' HTG'; }
  function $$(v)     { return '$' + parseFloat(v || 0).toFixed(2); }
  function fd(d)     {
    if (!d) return '—';
    try { return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }
  function mkchart(id, type, data, extraOpts = {}) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    charts[id] = new Chart(ctx, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8892B0', font: { family: "'Plus Jakarta Sans'", size: 11 }, boxWidth: 12, padding: 16 } },
          tooltip: { backgroundColor: '#12121E', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#EEF0F8', bodyColor: '#8892B0', padding: 10, callbacks: { label: ctx => ' $' + parseFloat(ctx.raw || 0).toFixed(2) } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#50566E', font: { size: 10, family: "'Plus Jakarta Sans'" } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#50566E', font: { size: 10, family: "'Plus Jakarta Sans'" }, callback: v => '$' + v } }
        },
        ...extraOpts
      }
    });
  }
  function dlCSV(filename) { window.open('/api/export/' + filename, '_blank'); }

  // ── DASHBOARD ──────────────────────────────────────────
  async function dashboard() {
    const d = await GET('/api/dashboard').catch(() => null);
    if (!d) { document.getElementById('content').innerHTML = '<div class="loading">Erreur de chargement</div>'; return; }
    const { kpis, lowStock, chart7, recentSales, nbClients, nbProducts, nbSales } = d;

    const kpiDefs = [
      { label: "CA Aujourd'hui", val: $$(kpis.caToday),  sub: htg(kpis.caToday),  icon:'📅', color:'linear-gradient(90deg,#00D9FF,#8B5CF6)' },
      { label: 'CA Ce mois',     val: $$(kpis.caMonth),  sub: htg(kpis.caMonth),  icon:'📆', color:'linear-gradient(90deg,#8B5CF6,#EC4899)' },
      { label: "CA Cette année", val: $$(kpis.caYear),   sub: htg(kpis.caYear),   icon:'🗓', color:'linear-gradient(90deg,#EC4899,#F59E0B)' },
      { label: 'CA Total',       val: $$(kpis.caTotal),  sub: htg(kpis.caTotal),  icon:'💰', color:'linear-gradient(90deg,#F59E0B,#00D9FF)' },
      { label: 'Encaissé',       val: $$(kpis.paid),     sub: 'Payé effectivement',icon:'✅',color:'linear-gradient(90deg,#10B981,#3B82F6)' },
      { label: 'Balance dûe',    val: $$(kpis.balance),  sub: htg(kpis.balance),  icon:'⚠', color: kpis.balance > 0 ? 'linear-gradient(90deg,#EF4444,#F59E0B)' : 'linear-gradient(90deg,#10B981,#3B82F6)' },
      { label: 'Dépenses',       val: $$(kpis.expTotal), sub: htg(kpis.expTotal), icon:'📋', color:'linear-gradient(90deg,#EF4444,#EC4899)' },
      { label: 'Bénéfice net',   val: $$(kpis.benefice), sub: htg(kpis.benefice), icon:'📈', color: kpis.benefice >= 0 ? 'linear-gradient(90deg,#10B981,#00D9FF)' : 'linear-gradient(90deg,#EF4444,#8B5CF6)' },
      { label: 'Produits',       val: nbProducts,         sub: `${kpis.stockUnits} unités en stock`, icon:'📦', color:'linear-gradient(90deg,#3B82F6,#8B5CF6)' },
      { label: 'Clients',        val: nbClients,           sub: `${nbSales} ventes total`, icon:'👥', color:'linear-gradient(90deg,#8B5CF6,#EC4899)' },
    ];

    let html = `<div class="kpi-grid">`;
    kpiDefs.forEach(k => {
      html += `<div class="kpi" style="--kpi-accent:${k.color}">
        <div class="kpi-icon">${k.icon}</div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-val">${k.val}</div>
        <div class="kpi-sub">${k.sub}</div>
      </div>`;
    });
    html += `</div>`;

    if (lowStock.length > 0) {
      html += `<div class="alert alert-warn">⚠ <strong>${lowStock.length} produit(s) en bas stock :</strong> ${lowStock.map(p => `<em>${p.name}</em>`).join(', ')}</div>`;
    }

    const recRows = recentSales.map(s => {
      const bal = (s.totalUSD || 0) - (s.paidUSD || 0);
      return `<tr>
        <td>${fd(s.date)}</td>
        <td><strong>${s.clientName || '—'}</strong></td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${s.productName||''}">${s.productName || '—'}</td>
        <td><strong>${$$(s.totalUSD)}</strong></td>
        <td>${bal <= 0 ? '<span class="badge b-green">Payé</span>' : `<span class="badge b-red">$${bal.toFixed(2)}</span>`}</td>
      </tr>`;
    }).join('');

    html += `<div class="two-col">
      <div class="card">
        <div class="card-header"><div class="card-title">CA — 7 derniers jours</div></div>
        <div class="card-body"><div class="chart-wrap" style="height:210px"><canvas id="c-7d"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Dernières ventes</div>
          <button class="btn btn-primary btn-sm" onclick="App.openNewSaleModal()">+ Vente</button>
        </div>
        <div class="table-wrap">
          <table><thead><tr><th>Date</th><th>Client</th><th>Produit</th><th>Total</th><th>Statut</th></tr></thead>
          <tbody>${recRows || '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🛒</div><div class="empty-sub">Aucune vente</div></div></td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>`;

    document.getElementById('content').innerHTML = html;

    mkchart('c-7d', 'bar', {
      labels: chart7.map(d => d.label),
      datasets: [
        { label: 'CA', data: chart7.map(d => d.ca),  backgroundColor: 'rgba(0,217,255,0.65)', borderRadius: 8, borderSkipped: false },
        { label: 'Dépenses', data: chart7.map(d => d.exp), backgroundColor: 'rgba(239,68,68,0.45)', borderRadius: 8, borderSkipped: false },
      ]
    }, { plugins: { legend: { labels: { color: '#8892B0', font: { size: 11 }, boxWidth: 10 } } } });
  }

  // ── RAPPORTS ───────────────────────────────────────────
  async function rapports() {
    const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

    let html = `
    <div class="tabs">
      <div class="tab ${reportMode==='daily'?'active':''}" onclick="App.setRepMode('daily')">Journalier</div>
      <div class="tab ${reportMode==='monthly'?'active':''}" onclick="App.setRepMode('monthly')">Mensuel</div>
      <div class="tab ${reportMode==='yearly'?'active':''}" onclick="App.setRepMode('yearly')">Annuel</div>
    </div>
    <div id="rep-filters" style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:18px"></div>
    <div id="rep-kpis" class="kpi-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))"></div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <div class="card-title" id="rep-chart-title">Chiffre d'affaires</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="App.exportReport()">⬇ Export CSV</button>
          <button class="btn btn-ghost btn-sm" onclick="dlCSV('sales')">⬇ Ventes CSV</button>
        </div>
      </div>
      <div class="card-body"><div class="chart-wrap" style="height:270px"><canvas id="rep-chart"></canvas></div></div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Tableau détaillé</div></div>
      <div class="table-wrap" id="rep-table"></div>
    </div>`;

    document.getElementById('content').innerHTML = html;
    buildRepFilters();
    await loadReport();
  }

  function buildRepFilters() {
    let html = '';
    if (reportMode === 'daily') {
      html = `
        <div class="form-group"><label class="form-label">De</label><input type="date" class="form-control" value="${reportFrom}" onchange="reportFrom=this.value;App.reloadReport()"></div>
        <div class="form-group"><label class="form-label">À</label><input type="date" class="form-control" value="${reportTo}" onchange="reportTo=this.value;App.reloadReport()"></div>`;
    } else if (reportMode === 'monthly') {
      const currentY = new Date().getFullYear();
      const years = [];
      for (let y = currentY; y >= currentY - 5; y--) years.push(y.toString());
      html = `<div class="form-group"><label class="form-label">Année</label>
        <select class="form-control" style="width:130px" onchange="reportYear=this.value;App.reloadReport()">
          ${years.map(y => `<option value="${y}" ${reportYear===y?'selected':''}>${y}</option>`).join('')}
        </select></div>`;
    } else {
      html = `<span style="font-size:12px;color:var(--text3);align-self:center">Toutes les années disponibles</span>`;
    }
    const el = document.getElementById('rep-filters');
    if (el) el.innerHTML = html;
  }

  async function loadReport() {
    killCharts();
    let url = `/api/reports?type=${reportMode}`;
    if (reportMode === 'daily') url += `&from=${reportFrom}&to=${reportTo}`;
    if (reportMode === 'monthly') url += `&year=${reportYear}`;

    const { rows, summary } = await GET(url).catch(() => ({ rows: [], summary: {} }));

    const kTitle = document.getElementById('rep-chart-title');
    if (kTitle) kTitle.textContent = reportMode === 'daily' ? 'CA journalier' : reportMode === 'monthly' ? `CA mensuel — ${reportYear}` : 'CA annuel';

    const kpis = document.getElementById('rep-kpis');
    if (kpis) kpis.innerHTML = [
      { l:'CA Total',    v: $$(summary.totalCA),  s: htg(summary.totalCA),  c:'linear-gradient(90deg,var(--cyan),var(--purple))' },
      { l:'Dépenses',    v: $$(summary.totalExp), s: htg(summary.totalExp), c:'linear-gradient(90deg,var(--red),var(--pink))' },
      { l:'Bénéfice net',v: $$(summary.totalBen), s: htg(summary.totalBen), c: summary.totalBen >= 0 ? 'linear-gradient(90deg,var(--green),var(--cyan))' : 'linear-gradient(90deg,var(--red),var(--purple))' },
      { l:'Payé',        v: $$(summary.totalPaid),s: 'Encaissé effectivement',c:'linear-gradient(90deg,var(--green),var(--blue))' },
    ].map(k => `<div class="kpi" style="--kpi-accent:${k.c}"><div class="kpi-label">${k.l}</div><div class="kpi-val" style="font-size:20px">${k.v}</div><div class="kpi-sub">${k.s}</div></div>`).join('');

    mkchart('rep-chart', 'bar', {
      labels: rows.map(r => r.label),
      datasets: [
        { label: 'CA',       data: rows.map(r => r.ca),  backgroundColor: 'rgba(0,217,255,0.7)',  borderRadius: 8, borderSkipped: false },
        { label: 'Dépenses', data: rows.map(r => r.exp), backgroundColor: 'rgba(239,68,68,0.5)',  borderRadius: 8, borderSkipped: false },
        { label: 'Bénéfice', data: rows.map(r => r.benefice), backgroundColor: 'rgba(16,185,129,0.55)', borderRadius: 8, borderSkipped: false, type: 'line', borderColor: 'rgba(16,185,129,0.8)', borderWidth: 2, pointRadius: 3, fill: false },
      ]
    }, {});

    const rt = document.getElementById('rep-table');
    if (rt) {
      let t = `<table><thead><tr><th>Période</th><th>CA (USD)</th><th>CA (HTG)</th><th>Dépenses</th><th>Bénéfice</th><th>Encaissé</th><th>Balance</th></tr></thead><tbody>`;
      if (!rows.length) t += `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📊</div><div class="empty-sub">Aucune donnée pour la période</div></div></td></tr>`;
      rows.forEach(r => {
        t += `<tr>
          <td><strong>${r.label}</strong></td>
          <td><strong>${$$(r.ca)}</strong></td>
          <td style="color:var(--text3);font-size:11px">${htg(r.ca)}</td>
          <td style="color:#F87171">${$$(r.exp)}</td>
          <td style="color:${r.benefice >= 0 ? '#34D399' : '#F87171'}"><strong>${$$(r.benefice)}</strong></td>
          <td style="color:#34D399">${$$(r.paid)}</td>
          <td style="color:${r.balance > 0 ? '#F87171' : '#34D399'}">${$$(r.balance)}</td>
        </tr>`;
      });
      t += `</tbody></table>`;
      rt.innerHTML = t;
    }
  }

  function setRepMode(m) { reportMode = m; killCharts(); rapports(); }
  async function reloadReport() { killCharts(); buildRepFilters(); await loadReport(); }

  function exportReport() {
    const rows = document.querySelectorAll('#rep-table tbody tr');
    let csv = 'Période,CA USD,CA HTG,Dépenses,Bénéfice,Encaissé,Balance\n';
    rows.forEach(r => {
      csv += [...r.querySelectorAll('td')].map(c => `"${c.textContent.trim()}"`).join(',') + '\n';
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `rapport_dealpam_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    toast('Rapport exporté !');
  }

  // ── PRODUITS ───────────────────────────────────────────
  let prodFilter = '';
  async function produits() {
    const ps = await GET('/api/products').catch(() => []);
    const draw = (list) => {
      const filtered = list.filter(p => !prodFilter || (p.name?.toLowerCase().includes(prodFilter) || p.category?.toLowerCase().includes(prodFilter) || p.sku?.toLowerCase().includes(prodFilter)));
      let html = `
      <div class="toolbar">
        <div class="search-box"><input id="p-search" class="form-control" placeholder="Rechercher produit, SKU, catégorie..." value="${prodFilter}" oninput="App._prodSearch(this.value,ps)"></div>
        <button class="btn btn-primary" onclick="App.openProdModal(null,ps)">+ Nouveau produit</button>
        <div class="divider"></div>
        <button class="btn btn-ghost btn-sm" onclick="dlCSV('products')">⬇ Export CSV</button>
      </div>
      <div class="card"><div class="card-body no-pad"><div class="table-wrap">
      <table><thead><tr><th>#</th><th>Produit</th><th>SKU</th><th>Catégorie</th><th>Qté</th><th>Alerte</th><th>Coût $</th><th>Prix $</th><th>Marge</th><th>Statut</th><th></th></tr></thead><tbody>`;
      if (!filtered.length) html += `<tr><td colspan="11"><div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">Aucun produit</div><div class="empty-sub">Cliquez sur "+ Nouveau produit" pour commencer</div></div></td></tr>`;
      filtered.forEach(p => {
        const mg = p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
        html += `<tr>
          <td style="color:var(--text3)">${p.id}</td>
          <td><strong>${p.name}</strong></td>
          <td style="color:var(--text3);font-size:11px;font-family:monospace">${p.sku || '—'}</td>
          <td><span class="badge b-gray">${p.category || '—'}</span></td>
          <td><input type="number" min="0" value="${p.qty || 0}" class="form-control" style="width:64px;padding:5px 8px;font-size:12px" onchange="App.updateQty(${p.id},this.value)"></td>
          <td style="color:var(--text3)">${p.alertQty || 2}</td>
          <td>${$$(p.cost)}</td>
          <td><strong style="color:var(--cyan)">${$$(p.price)}</strong><div style="font-size:10px;color:var(--text3)">${Math.round((p.price||0)*(settings.exchangeRate||136))} HTG</div></td>
          <td><span class="badge ${mg >= 50 ? 'b-green' : mg >= 30 ? 'b-gold' : 'b-red'}">${mg}%</span></td>
          <td>${(p.qty||0) > (p.alertQty||2) ? '<span class="badge b-green">✓ OK</span>' : '<span class="badge b-red">⚠ Bas</span>'}</td>
          <td style="white-space:nowrap">
            <button class="btn-icon" onclick="App.openProdModal(${p.id},ps)" title="Modifier">✏</button>
            <button class="btn-icon" style="color:#F87171" onclick="App.delProd(${p.id})" title="Supprimer">🗑</button>
          </td>
        </tr>`;
      });
      html += `</tbody></table></div></div></div>`;
      document.getElementById('content').innerHTML = html;
      const el = document.getElementById('p-search');
      if (el) { el.focus(); el.setSelectionRange(prodFilter.length, prodFilter.length); }
    };
    App._prodSearch = (v, list) => { prodFilter = v.toLowerCase(); draw(list); };
    draw(ps);
  }

  async function updateQty(id, v) {
    await PUT(`/api/products/${id}`, { qty: Math.max(0, parseInt(v) || 0) }).catch(() => null);
    toast('Quantité mise à jour', 'info');
  }

  async function openProdModal(id, cache) {
    const p = id ? (cache || []).find(x => x.id === id) || await GET(`/api/products/${id}`).catch(() => null) : null;
    const body = `<div class="form-grid g2">
      <div class="form-group full"><label class="form-label">Nom du produit *</label><input id="pm-name" class="form-control" value="${p?.name||''}" placeholder="Nom du produit"></div>
      <div class="form-group"><label class="form-label">SKU / Code</label><input id="pm-sku" class="form-control" value="${p?.sku||''}" placeholder="EX-001"></div>
      <div class="form-group"><label class="form-label">Catégorie</label><input id="pm-cat" class="form-control" value="${p?.category||''}" placeholder="Parfum, Vêtement..."></div>
      <div class="form-group"><label class="form-label">Quantité en stock</label><input id="pm-qty" type="number" min="0" class="form-control" value="${p?.qty||0}"></div>
      <div class="form-group"><label class="form-label">Seuil d'alerte</label><input id="pm-alert" type="number" min="0" class="form-control" value="${p?.alertQty||2}"></div>
      <div class="form-group"><label class="form-label">Coût d'achat ($)</label><input id="pm-cost" type="number" step="0.01" class="form-control" value="${p?.cost||0}"></div>
      <div class="form-group"><label class="form-label">Prix de vente ($)</label><input id="pm-price" type="number" step="0.01" class="form-control" value="${p?.price||0}"></div>
    </div>`;
    openModal(p ? 'Modifier le produit' : 'Nouveau produit', body, p ? 'Enregistrer' : 'Ajouter le produit', async () => {
      const name = document.getElementById('pm-name').value.trim();
      if (!name) { toast('Le nom est requis', 'error'); return; }
      const data = { name, sku: document.getElementById('pm-sku').value.trim(), category: document.getElementById('pm-cat').value.trim(), qty: parseInt(document.getElementById('pm-qty').value)||0, alertQty: parseInt(document.getElementById('pm-alert').value)||2, cost: parseFloat(document.getElementById('pm-cost').value)||0, price: parseFloat(document.getElementById('pm-price').value)||0 };
      if (p) await PUT(`/api/products/${p.id}`, data);
      else    await POST('/api/products', data);
      closeModal(); produits(); toast(p ? 'Produit mis à jour' : 'Produit ajouté !');
    });
  }

  async function delProd(id) {
    if (!confirm('Supprimer ce produit ?')) return;
    await DEL(`/api/products/${id}`); produits(); toast('Produit supprimé', 'info');
  }

  // ── VENTES ─────────────────────────────────────────────
  let saleFilter = '';
  async function ventes() {
    const [sales] = await Promise.all([GET('/api/sales').catch(() => [])]);
    const caTotal = sales.reduce((a, s) => a + (s.totalUSD || 0), 0);
    const paid    = sales.reduce((a, s) => a + (s.paidUSD || 0), 0);
    const bal     = caTotal - paid;

    const draw = (list) => {
      let html = `<div class="stats-row">
        <div class="stat-card"><div class="stat-label">CA Total</div><div class="stat-val" style="color:var(--cyan)">${$$(caTotal)}</div></div>
        <div class="stat-card"><div class="stat-label">Encaissé</div><div class="stat-val" style="color:var(--green)">${$$(paid)}</div></div>
        <div class="stat-card"><div class="stat-label">Balance dûe</div><div class="stat-val" style="color:${bal>0?'var(--red)':'var(--green)'}">${$$(bal)}</div></div>
        <div class="stat-card"><div class="stat-label">Nb transactions</div><div class="stat-val">${sales.length}</div></div>
      </div>
      <div class="toolbar">
        <div class="search-box"><input id="s-search" class="form-control" placeholder="Rechercher client, produit..." value="${saleFilter}" oninput="App._saleSearch(this.value)"></div>
        <input type="date" class="form-control" style="width:160px" id="s-date-filter" onchange="App._saleSearch(document.getElementById('s-search').value)">
        <button class="btn btn-primary" onclick="App.openNewSaleModal()">+ Nouvelle vente</button>
        <div class="divider"></div>
        <button class="btn btn-ghost btn-sm" onclick="dlCSV('sales')">⬇ CSV</button>
      </div>
      <div class="card"><div class="card-body no-pad"><div class="table-wrap">
      <table><thead><tr><th>Date</th><th>Client</th><th>Produit</th><th>Qté</th><th>Prix unit.</th><th>Total USD</th><th>Total HTG</th><th>Payé</th><th>Balance</th><th>Mode</th><th>Statut</th><th></th></tr></thead><tbody id="s-tbody">`;
      html += sRows(list);
      html += `</tbody></table></div></div></div>`;
      document.getElementById('content').innerHTML = html;
    };

    App._saleSearch = (v) => {
      const f = v.toLowerCase(), dt = document.getElementById('s-date-filter')?.value || '';
      document.getElementById('s-tbody').innerHTML = sRows(sales.filter(s => (!f || (s.clientName?.toLowerCase().includes(f) || s.productName?.toLowerCase().includes(f))) && (!dt || s.date === dt)));
    };
    draw(sales);
  }

  function sRows(list) {
    if (!list.length) return `<tr><td colspan="12"><div class="empty-state"><div class="empty-icon">🛒</div><div class="empty-title">Aucune vente</div><div class="empty-sub">Cliquez sur "+ Nouvelle vente" pour commencer</div></div></td></tr>`;
    return [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(s => {
      const b = (s.totalUSD || 0) - (s.paidUSD || 0);
      return `<tr>
        <td style="white-space:nowrap">${fd(s.date)}</td>
        <td><strong>${s.clientName || '—'}</strong></td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${s.productName||''}">${s.productName || '—'}</td>
        <td>${s.qty}</td>
        <td>${$$(s.unitPrice)}</td>
        <td><strong>${$$(s.totalUSD)}</strong></td>
        <td style="color:var(--text3);font-size:11px">${Math.round((s.totalUSD||0)*(settings.exchangeRate||136)).toLocaleString()}</td>
        <td style="color:var(--green)">${$$(s.paidUSD)}</td>
        <td>${b > 0 ? `<span style="color:#F87171">$${b.toFixed(2)}</span>` : `<span style="color:#34D399">—</span>`}</td>
        <td><span class="badge b-gray">${s.paymentMethod || s.mode || '—'}</span></td>
        <td>${b <= 0 ? '<span class="badge b-green">Payé</span>' : '<span class="badge b-red">Solde dû</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn-icon" onclick="App.openEditSaleModal(${s.id})" title="Modifier">✏</button>
          <button class="btn-icon" style="color:#F87171" onclick="App.delSale(${s.id})" title="Supprimer">🗑</button>
        </td>
      </tr>`;
    }).join('');
  }

  async function openNewSaleModal(sid) {
    const [prods, cls, existing] = await Promise.all([
      GET('/api/products').catch(() => []),
      GET('/api/clients').catch(() => []),
      sid ? GET(`/api/sales/${sid}`).catch(() => null) : Promise.resolve(null),
    ]);
    const s = sid ? (await GET('/api/sales').catch(() => [])).find(x => x.id === sid) : null;

    const clOpts = cls.map(c => `<option value="${c.name}" ${s?.clientName===c.name?'selected':''}>${c.name}</option>`).join('');
    const prOpts = prods.map(p => `<option value="${p.id}" data-price="${p.price}" data-name="${p.name}" ${s?.productId===p.id?'selected':''}>${p.name} — ${$$(p.price)} (stock: ${p.qty})</option>`).join('');

    const body = `<div class="form-grid g2">
      <div class="form-group"><label class="form-label">Date *</label><input type="date" id="sv-date" class="form-control" value="${s?.date || new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group"><label class="form-label">Client *</label>
        <input list="sv-cl" id="sv-client" class="form-control" placeholder="Nom du client" value="${s?.clientName||''}">
        <datalist id="sv-cl">${clOpts}</datalist>
      </div>
      <div class="form-group full"><label class="form-label">Produit *</label>
        <select id="sv-prod" class="form-control" onchange="App._updateSalePrice()">
          <option value="">— Choisir un produit —</option>${prOpts}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Quantité</label><input type="number" min="1" id="sv-qty" class="form-control" value="${s?.qty||1}" oninput="App._updateSaleTotal()"></div>
      <div class="form-group"><label class="form-label">Prix unitaire ($)</label><input type="number" step="0.01" id="sv-price" class="form-control" value="${s?.unitPrice||''}" oninput="App._updateSaleTotal()"></div>
      <div class="form-group"><label class="form-label">Montant payé ($)</label><input type="number" step="0.01" id="sv-paid" class="form-control" value="${s?.paidUSD||''}" placeholder="0.00"></div>
      <div class="form-group"><label class="form-label">Mode de paiement</label>
        <select id="sv-mode" class="form-control">
          ${['Cash','MoCash','Virement','Carte bancaire','Chèque'].map(m => `<option ${(s?.paymentMethod||s?.mode)===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full"><label class="form-label">Notes</label><input id="sv-notes" class="form-control" value="${s?.notes||''}" placeholder="Notes optionnelles"></div>
      <div class="full">
        <div class="total-box">
          <div class="label">Total calculé</div>
          <div class="value" id="sv-total">—</div>
          <div class="sub" id="sv-total-htg"></div>
        </div>
      </div>
    </div>`;

    openModal(s ? 'Modifier la vente' : 'Nouvelle vente', body, s ? 'Enregistrer' : 'Enregistrer la vente', async () => {
      const clientName = document.getElementById('sv-client').value.trim();
      const productId  = parseInt(document.getElementById('sv-prod').value);
      if (!clientName || !productId) { toast('Client et produit requis', 'error'); return; }
      const qty        = parseInt(document.getElementById('sv-qty').value) || 1;
      const unitPrice  = parseFloat(document.getElementById('sv-price').value) || 0;
      const paidUSD    = parseFloat(document.getElementById('sv-paid').value) || 0;
      const totalUSD   = parseFloat((qty * unitPrice).toFixed(2));
      const prod       = prods.find(p => p.id === productId);
      const data = { date: document.getElementById('sv-date').value, clientName, productId, productName: prod?.name || '', qty, unitPrice, totalUSD, paidUSD, paymentMethod: document.getElementById('sv-mode').value, notes: document.getElementById('sv-notes').value };
      if (s) await PUT(`/api/sales/${s.id}`, data);
      else    await POST('/api/sales', data);
      closeModal(); ventes(); toast(s ? 'Vente mise à jour' : 'Vente enregistrée !');
    });

    if (s) setTimeout(() => App._updateSaleTotal(), 80);
  }

  App._updateSalePrice = () => {
    const sel = document.getElementById('sv-prod');
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    if (opt?.dataset?.price) document.getElementById('sv-price').value = parseFloat(opt.dataset.price).toFixed(2);
    App._updateSaleTotal();
  };
  App._updateSaleTotal = () => {
    const q = parseFloat(document.getElementById('sv-qty')?.value) || 0;
    const p = parseFloat(document.getElementById('sv-price')?.value) || 0;
    const t = q * p;
    const tv = document.getElementById('sv-total');
    const th = document.getElementById('sv-total-htg');
    if (tv) tv.textContent = `$${t.toFixed(2)}`;
    if (th) th.textContent = htg(t);
  };

  async function openEditSaleModal(id) { openNewSaleModal(id); }

  async function delSale(id) {
    if (!confirm('Supprimer cette vente ?')) return;
    await DEL(`/api/sales/${id}`); ventes(); toast('Vente supprimée', 'info');
  }

  // ── CLIENTS ────────────────────────────────────────────
  async function clients() {
    const [cls, sales] = await Promise.all([GET('/api/clients').catch(() => []), GET('/api/sales').catch(() => [])]);
    const enriched = cls.map(c => {
      const cv  = sales.filter(s => s.clientId === c.id || s.clientName === c.name);
      const tot = cv.reduce((a, s) => a + (s.totalUSD || 0), 0);
      const pd  = cv.reduce((a, s) => a + (s.paidUSD  || 0), 0);
      return { ...c, nbSales: cv.length, total: tot, balance: tot - pd };
    });

    let html = `<div class="toolbar">
      <div class="search-box"><input id="cl-search" class="form-control" placeholder="Rechercher un client..." oninput="App._filterCli(this.value)"></div>
      <button class="btn btn-primary" onclick="App.openClientModal(null)">+ Nouveau client</button>
      <div class="divider"></div>
      <button class="btn btn-ghost btn-sm" onclick="dlCSV('clients')">⬇ CSV</button>
    </div>
    <div class="card"><div class="card-body no-pad"><div class="table-wrap">
    <table><thead><tr><th>#</th><th>Client</th><th>Téléphone</th><th>Email</th><th>Ventes</th><th>Total achats</th><th>Balance</th><th>Depuis</th><th></th></tr></thead><tbody id="cl-tbody">`;
    html += cliRows(enriched);
    html += `</tbody></table></div></div></div>`;
    document.getElementById('content').innerHTML = html;
    App._filterCli = (v) => {
      const f = v.toLowerCase();
      document.getElementById('cl-tbody').innerHTML = cliRows(enriched.filter(c => !f || c.name?.toLowerCase().includes(f) || c.phone?.includes(f) || c.email?.toLowerCase().includes(f)));
    };
  }

  function cliRows(list) {
    if (!list.length) return `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">Aucun client</div></div></td></tr>`;
    return list.map(c => `<tr>
      <td style="color:var(--text3)">${c.id}</td>
      <td><div style="display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--purple),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">${(c.name||'?').charAt(0).toUpperCase()}</div>
        <strong>${c.name}</strong></div></td>
      <td style="color:var(--text2)">${c.phone || '—'}</td>
      <td style="color:var(--cyan)">${c.email || '—'}</td>
      <td><span class="badge b-purple">${c.nbSales} vente${c.nbSales!==1?'s':''}</span></td>
      <td><strong>${$$(c.total)}</strong></td>
      <td>${c.balance > 0 ? `<span class="badge b-red">$${c.balance.toFixed(2)}</span>` : '<span class="badge b-green">Soldé</span>'}</td>
      <td style="color:var(--text3);font-size:12px">${fd(c.createdAt)}</td>
      <td style="white-space:nowrap">
        <button class="btn-icon" onclick="App.openClientModal(${c.id})">✏</button>
        <button class="btn-icon" style="color:#F87171" onclick="App.delClient(${c.id})">🗑</button>
      </td>
    </tr>`).join('');
  }

  async function openClientModal(id) {
    const c = id ? (await GET('/api/clients').catch(() => [])).find(x => x.id === id) : null;
    const body = `<div class="form-grid">
      <div class="form-group"><label class="form-label">Nom complet *</label><input id="cm-name" class="form-control" value="${c?.name||''}" placeholder="Prénom et nom"></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input id="cm-phone" class="form-control" value="${c?.phone||''}" placeholder="+509 XXXX XXXX"></div>
      <div class="form-group"><label class="form-label">Email</label><input id="cm-email" class="form-control" value="${c?.email||''}" placeholder="email@example.com"></div>
      <div class="form-group"><label class="form-label">Adresse</label><input id="cm-addr" class="form-control" value="${c?.address||''}" placeholder="Adresse (optionnel)"></div>
    </div>`;
    openModal(c ? 'Modifier le client' : 'Nouveau client', body, c ? 'Enregistrer' : 'Ajouter le client', async () => {
      const name = document.getElementById('cm-name').value.trim();
      if (!name) { toast('Le nom est requis', 'error'); return; }
      const data = { name, phone: document.getElementById('cm-phone').value.trim(), email: document.getElementById('cm-email').value.trim(), address: document.getElementById('cm-addr').value.trim() };
      if (c) await PUT(`/api/clients/${c.id}`, data);
      else    await POST('/api/clients', data);
      closeModal(); clients(); toast(c ? 'Client mis à jour' : 'Client ajouté !');
    });
  }

  async function delClient(id) {
    if (!confirm('Supprimer ce client ?')) return;
    await DEL(`/api/clients/${id}`); clients(); toast('Client supprimé', 'info');
  }

  // ── DÉPENSES ───────────────────────────────────────────
  async function depenses() {
    const exp = await GET('/api/expenses').catch(() => []);
    const total = exp.reduce((a, e) => a + (e.amount || 0), 0);
    const bycat = {};
    exp.forEach(e => { bycat[e.category] = (bycat[e.category] || 0) + (e.amount || 0); });

    let html = `<div class="stats-row">
      <div class="stat-card"><div class="stat-label">Total Dépenses</div><div class="stat-val" style="color:#F87171">${$$(total)}</div></div>
      ${Object.entries(bycat).map(([k,v]) => `<div class="stat-card"><div class="stat-label">${k||'Autre'}</div><div class="stat-val" style="font-size:16px">${$$(v)}</div></div>`).join('')}
    </div>
    <div class="toolbar">
      <div class="search-box"><input id="ex-search" class="form-control" placeholder="Rechercher..." oninput="App._filterExp(this.value)"></div>
      <select class="form-control" style="width:170px" id="ex-cat" onchange="App._filterExp(document.getElementById('ex-search').value)">
        <option value="">Toutes catégories</option>
        ${['Achat Stock','Shipping','Marketing','Loyer','Salaires','Autre'].map(c => `<option>${c}</option>`).join('')}
      </select>
      <button class="btn btn-primary" onclick="App.openExpenseModal(null)">+ Dépense</button>
      <div class="divider"></div>
      <button class="btn btn-ghost btn-sm" onclick="dlCSV('expenses')">⬇ CSV</button>
    </div>
    <div class="card"><div class="card-body no-pad"><div class="table-wrap">
    <table><thead><tr><th>Date</th><th>Catégorie</th><th>Description</th><th>Montant USD</th><th>Montant HTG</th><th>Mode</th><th></th></tr></thead><tbody id="ex-tbody">`;
    html += expRows(exp);
    html += `</tbody></table></div></div></div>`;
    document.getElementById('content').innerHTML = html;
    App._filterExp = (v) => {
      const f = v.toLowerCase(), cat = document.getElementById('ex-cat')?.value || '';
      document.getElementById('ex-tbody').innerHTML = expRows(exp.filter(e => (!f || e.description?.toLowerCase().includes(f) || e.category?.toLowerCase().includes(f)) && (!cat || e.category === cat)));
    };
  }

  function expRows(list) {
    if (!list.length) return `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Aucune dépense</div></div></td></tr>`;
    return [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(e => `<tr>
      <td style="white-space:nowrap">${fd(e.date)}</td>
      <td><span class="badge b-gold">${e.category || '—'}</span></td>
      <td>${e.description || '—'}</td>
      <td><strong style="color:#F87171">${$$(e.amount)}</strong></td>
      <td style="color:var(--text3);font-size:11px">${htg(e.amount)}</td>
      <td><span class="badge b-gray">${e.paymentMethod || '—'}</span></td>
      <td style="white-space:nowrap">
        <button class="btn-icon" onclick="App.openExpenseModal(${e.id})">✏</button>
        <button class="btn-icon" style="color:#F87171" onclick="App.delExpense(${e.id})">🗑</button>
      </td>
    </tr>`).join('');
  }

  async function openExpenseModal(id) {
    const list = await GET('/api/expenses').catch(() => []);
    const e = id ? list.find(x => x.id === id) : null;
    const body = `<div class="form-grid g2">
      <div class="form-group"><label class="form-label">Date</label><input type="date" id="em-date" class="form-control" value="${e?.date || new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group"><label class="form-label">Catégorie</label>
        <select id="em-cat" class="form-control">
          ${['Achat Stock','Shipping','Marketing','Loyer','Salaires','Autre'].map(c => `<option ${e?.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full"><label class="form-label">Description *</label><input id="em-desc" class="form-control" value="${e?.description||''}" placeholder="Description de la dépense"></div>
      <div class="form-group"><label class="form-label">Montant ($) *</label><input type="number" step="0.01" id="em-amount" class="form-control" value="${e?.amount||''}"></div>
      <div class="form-group"><label class="form-label">Mode de paiement</label>
        <select id="em-mode" class="form-control">
          ${['Cash','MoCash','Virement','Carte bancaire','Chèque'].map(m => `<option ${e?.paymentMethod===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
    </div>`;
    openModal(e ? 'Modifier la dépense' : 'Nouvelle dépense', body, e ? 'Enregistrer' : 'Ajouter', async () => {
      const description = document.getElementById('em-desc').value.trim();
      const amount = parseFloat(document.getElementById('em-amount').value);
      if (!description || !amount) { toast('Description et montant requis', 'error'); return; }
      const data = { date: document.getElementById('em-date').value, category: document.getElementById('em-cat').value, description, amount, paymentMethod: document.getElementById('em-mode').value };
      if (e) await PUT(`/api/expenses/${e.id}`, data);
      else    await POST('/api/expenses', data);
      closeModal(); depenses(); toast(e ? 'Dépense mise à jour' : 'Dépense ajoutée !');
    });
  }

  async function delExpense(id) {
    if (!confirm('Supprimer cette dépense ?')) return;
    await DEL(`/api/expenses/${id}`); depenses(); toast('Dépense supprimée', 'info');
  }

  // ── UTILISATEURS ───────────────────────────────────────
  async function utilisateurs() {
    const us = await GET('/api/users').catch(() => []);
    let html = `<div class="toolbar"><button class="btn btn-primary" onclick="App.openUserModal(null)">+ Nouvel utilisateur</button></div>
    <div class="card"><div class="card-body no-pad"><div class="table-wrap">
    <table><thead><tr><th>#</th><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Créé le</th><th></th></tr></thead><tbody>`;
    if (!us.length) html += `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">Aucun utilisateur</div></div></td></tr>`;
    us.forEach(u => {
      html += `<tr>
        <td style="color:var(--text3)">${u.id}</td>
        <td><div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--purple));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">${(u.name||'?').charAt(0).toUpperCase()}</div>
          <strong>${u.name}</strong></div></td>
        <td style="color:var(--cyan)">${u.email || '—'}</td>
        <td><span class="badge ${u.role==='Admin'?'b-gold':u.role==='Manager'?'b-purple':'b-blue'}">${u.role || 'Vendeur'}</span></td>
        <td style="color:var(--text3);font-size:12px">${fd(u.createdAt)}</td>
        <td style="white-space:nowrap">
          <button class="btn-icon" onclick="App.openUserModal(${u.id})">✏</button>
          <button class="btn-icon" style="color:#F87171" onclick="App.delUser(${u.id})">🗑</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div></div></div>`;
    document.getElementById('content').innerHTML = html;
  }

  async function openUserModal(id) {
    const list = await GET('/api/users').catch(() => []);
    const u = id ? list.find(x => x.id === id) : null;
    const body = `<div class="form-grid">
      <div class="form-group"><label class="form-label">Nom complet *</label><input id="um-name" class="form-control" value="${u?.name||''}" placeholder="Nom de l'utilisateur"></div>
      <div class="form-group"><label class="form-label">Email</label><input id="um-email" class="form-control" value="${u?.email||''}" placeholder="email@dealpam.com"></div>
      <div class="form-group"><label class="form-label">Rôle</label>
        <select id="um-role" class="form-control">
          ${['Admin','Manager','Vendeur','Comptable'].map(r => `<option ${u?.role===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
    </div>`;
    openModal(u ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur', body, u ? 'Enregistrer' : 'Ajouter', async () => {
      const name = document.getElementById('um-name').value.trim();
      if (!name) { toast('Le nom est requis', 'error'); return; }
      const data = { name, email: document.getElementById('um-email').value.trim(), role: document.getElementById('um-role').value };
      if (u) await PUT(`/api/users/${u.id}`, data);
      else    await POST('/api/users', data);
      closeModal(); utilisateurs(); toast(u ? 'Utilisateur mis à jour' : 'Utilisateur ajouté !');
    });
  }

  async function delUser(id) {
    const list = await GET('/api/users').catch(() => []);
    if (list.length <= 1) { toast('Impossible de supprimer le seul administrateur', 'error'); return; }
    if (!confirm('Supprimer cet utilisateur ?')) return;
    await DEL(`/api/users/${id}`); utilisateurs(); toast('Utilisateur supprimé', 'info');
  }

  // ── PARAMÈTRES ─────────────────────────────────────────
  async function parametres() {
    const st = await GET('/api/settings').catch(() => ({}));
    const us = await GET('/api/users').catch(() => []);
    let html = `<div class="two-col">
      <div class="card">
        <div class="card-header"><div class="card-title">Paramètres généraux</div></div>
        <div class="card-body">
          <div class="form-grid" style="gap:14px">
            <div class="form-group"><label class="form-label">Nom de l'entreprise</label><input id="st-company" class="form-control" value="${st.companyName||'DEALPAM'}"></div>
            <div class="form-group"><label class="form-label">Taux de change HTG/USD</label><input type="number" step="0.5" id="st-rate" class="form-control" value="${st.exchangeRate||136}"></div>
            <div class="form-group"><label class="form-label">Devise principale</label>
              <select id="st-cur" class="form-control">
                ${['USD','EUR','HTG','CAD'].map(c => `<option ${st.currency===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label class="form-label">Utilisateur actif</label>
              <select id="st-user" class="form-control">
                ${us.map(u => `<option ${st.currentUser===u.name?'selected':''}>${u.name}</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-primary" onclick="App.saveSettings()">Enregistrer les paramètres</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Export & Sauvegarde</div></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:11px">
            <button class="btn btn-ghost" onclick="dlCSV('backup')">⬇ Backup complet (JSON)</button>
            <button class="btn btn-ghost" onclick="dlCSV('sales')">⬇ Export ventes (CSV)</button>
            <button class="btn btn-ghost" onclick="dlCSV('expenses')">⬇ Export dépenses (CSV)</button>
            <button class="btn btn-ghost" onclick="dlCSV('products')">⬇ Export produits (CSV)</button>
            <button class="btn btn-ghost" onclick="dlCSV('clients')">⬇ Export clients (CSV)</button>
            <div style="height:1px;background:var(--border);margin:4px 0"></div>
            <button class="btn btn-danger" onclick="App.resetData()">⚠ Réinitialiser les données</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">À propos de DEALPAM</div></div>
      <div class="card-body">
        <p style="font-size:13.5px;color:var(--text2);line-height:1.8">
          <strong style="background:linear-gradient(135deg,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:16px">DEALPAM</strong> — Application de gestion d'entreprise professionnelle.<br>
          Développée en <strong>Node.js + Express</strong>. Les données sont stockées dans <code style="background:var(--card2);padding:2px 6px;border-radius:4px;font-size:11px">./data/db.json</code>.<br>
          <span style="font-size:11.5px;color:var(--text3)">Pour lancer l'application : ouvrez un terminal dans le dossier et exécutez <code style="background:var(--card2);padding:2px 6px;border-radius:4px">npm start</code>, puis allez sur http://localhost:3000</span>
        </p>
      </div>
    </div>`;
    document.getElementById('content').innerHTML = html;
  }

  async function saveSettings() {
    const data = {
      companyName: document.getElementById('st-company').value,
      exchangeRate: parseFloat(document.getElementById('st-rate').value) || 136,
      currency: document.getElementById('st-cur').value,
      currentUser: document.getElementById('st-user').value,
    };
    settings = await PUT('/api/settings', data);
    document.getElementById('rate-pill').textContent = `Taux: ${settings.exchangeRate} HTG/USD`;
    const u = settings.currentUser || 'Admin';
    document.getElementById('user-name').textContent = u;
    document.getElementById('user-ava').textContent  = u.charAt(0).toUpperCase();
    toast('Paramètres sauvegardés !');
  }

  async function resetData() {
    if (!confirm('⚠ Cette action va supprimer toutes vos données. Confirmez ?')) return;
    if (!confirm('DERNIÈRE CONFIRMATION — Action irréversible !')) return;
    await fetch('/api/settings', { method: 'GET' }); // just a ping
    const empty = { products:[], sales:[], clients:[], expenses:[], users:[{ id:1, name:'Administrateur', email:'admin@dealpam.com', role:'Admin', createdAt: new Date().toISOString().slice(0,10) }], settings: settings };
    await PUT('/api/settings', { ...settings, _reset: true }).catch(() => null);
    location.reload();
  }

  // ── PUBLIC API ─────────────────────────────────────────
  return {
    nav, closeModal, toast,
    openNewSaleModal, openEditSaleModal, openProdModal, openClientModal, openExpenseModal, openUserModal,
    delProd, delSale, delClient, delExpense, delUser,
    updateQty, saveSettings, resetData,
    setRepMode, reloadReport, exportReport,
    _prodSearch: () => {}, _saleSearch: () => {}, _filterCli: () => {}, _filterExp: () => {},
    _updateSalePrice: () => {}, _updateSaleTotal: () => {},
  };
})();

window.reportFrom = App._rFrom;
window.reportTo   = App._rTo;
window.dlCSV = (t) => { window.open('/api/export/' + t, '_blank'); };

// expose report vars for inline onchange handlers
window.reportFrom = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
window.reportTo   = new Date().toISOString().slice(0, 10);
window.reportYear = new Date().getFullYear().toString();

// ── BOOT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Init via the internal init function
  fetch('/api/settings')
    .then(r => r.json())
    .then(s => {
      document.getElementById('rate-pill').textContent = `Taux: ${s.exchangeRate || 136} HTG/USD`;
      const u = s.currentUser || 'Admin';
      document.getElementById('user-name').textContent = u;
      document.getElementById('user-role').textContent = 'Administrateur';
      document.getElementById('user-ava').textContent  = u.charAt(0).toUpperCase();
      App.nav('dashboard');
    })
    .catch(() => App.nav('dashboard'));
});
