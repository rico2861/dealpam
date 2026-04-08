const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── DB HELPERS ──────────────────────────────────────────────
const DEFAULT_DB = {
  products: [
    { id: 1, sku: 'DP-001', name: 'Produit exemple', category: 'Général', qty: 10, alertQty: 2, cost: 10.00, price: 20.00, createdAt: new Date().toISOString().slice(0,10) }
  ],
  sales: [],
  clients: [],
  expenses: [],
  users: [
    { id: 1, name: 'Administrateur', email: 'admin@dealpam.com', role: 'Admin', createdAt: new Date().toISOString().slice(0,10) }
  ],
  settings: {
    companyName: 'DEALPAM',
    currency: 'USD',
    secondCurrency: 'HTG',
    exchangeRate: 136,
    defaultMargin: 0.5,
    currentUser: 'Administrateur',
    logoText: 'DEALPAM'
  }
};

function readDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
      return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error('DB read error:', e.message);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function writeDB(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('DB write error:', e.message);
    return false;
  }
}

function nextId(arr) {
  return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

// ── GENERIC CRUD FACTORY ────────────────────────────────────
function crudRouter(collectionName) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const db = readDB();
    res.json(db[collectionName] || []);
  });

  router.post('/', (req, res) => {
    const db = readDB();
    if (!db[collectionName]) db[collectionName] = [];
    const item = { id: nextId(db[collectionName]), ...req.body, createdAt: new Date().toISOString().slice(0,10) };
    db[collectionName].push(item);
    writeDB(db);
    res.status(201).json(item);
  });

  router.put('/:id', (req, res) => {
    const db = readDB();
    const idx = (db[collectionName] || []).findIndex(x => x.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    db[collectionName][idx] = { ...db[collectionName][idx], ...req.body };
    writeDB(db);
    res.json(db[collectionName][idx]);
  });

  router.delete('/:id', (req, res) => {
    const db = readDB();
    const before = (db[collectionName] || []).length;
    db[collectionName] = (db[collectionName] || []).filter(x => x.id !== parseInt(req.params.id));
    if (db[collectionName].length === before) return res.status(404).json({ error: 'Not found' });
    writeDB(db);
    res.json({ success: true });
  });

  return router;
}

// ── ROUTES ──────────────────────────────────────────────────
app.use('/api/products',  crudRouter('products'));
app.use('/api/clients',   crudRouter('clients'));
app.use('/api/expenses',  crudRouter('expenses'));
app.use('/api/users',     crudRouter('users'));

// Sales — custom POST to handle stock update
app.get('/api/sales', (req, res) => {
  const db = readDB();
  res.json(db.sales || []);
});

app.post('/api/sales', (req, res) => {
  const db = readDB();
  const { productId, qty } = req.body;
  const prod = (db.products || []).find(p => p.id === productId);
  if (prod) {
    if (prod.qty < qty) return res.status(400).json({ error: 'Stock insuffisant' });
    prod.qty -= qty;
  }
  if (!db.sales) db.sales = [];
  // Auto-add client if not exists
  const { clientName } = req.body;
  if (clientName && !db.clients.find(c => c.name === clientName)) {
    db.clients.push({ id: nextId(db.clients), name: clientName, phone: '', email: '', address: '', createdAt: new Date().toISOString().slice(0,10) });
  }
  const clientId = db.clients.find(c => c.name === clientName)?.id || 0;
  const sale = { id: nextId(db.sales), ...req.body, clientId, createdAt: new Date().toISOString().slice(0,10) };
  db.sales.push(sale);
  writeDB(db);
  res.status(201).json(sale);
});

app.put('/api/sales/:id', (req, res) => {
  const db = readDB();
  const idx = (db.sales || []).findIndex(x => x.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.sales[idx] = { ...db.sales[idx], ...req.body };
  writeDB(db);
  res.json(db.sales[idx]);
});

app.delete('/api/sales/:id', (req, res) => {
  const db = readDB();
  db.sales = (db.sales || []).filter(s => s.id !== parseInt(req.params.id));
  writeDB(db);
  res.json({ success: true });
});

// Settings
app.get('/api/settings', (req, res) => {
  const db = readDB();
  res.json(db.settings || DEFAULT_DB.settings);
});

app.put('/api/settings', (req, res) => {
  const db = readDB();
  db.settings = { ...db.settings, ...req.body };
  writeDB(db);
  res.json(db.settings);
});

// Reports
app.get('/api/reports', (req, res) => {
  const db = readDB();
  const { type = 'monthly', year, from, to } = req.query;
  const sales = db.sales || [];
  const expenses = db.expenses || [];
  const rate = db.settings?.exchangeRate || 136;

  let rows = [];
  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  if (type === 'daily' && from && to) {
    const start = new Date(from), end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0,10);
      const ca = sales.filter(s => s.date === ds).reduce((a, s) => a + (s.totalUSD || 0), 0);
      const exp = expenses.filter(e => e.date === ds).reduce((a, e) => a + (e.amount || 0), 0);
      const paid = sales.filter(s => s.date === ds).reduce((a, s) => a + (s.paidUSD || 0), 0);
      rows.push({ label: ds, ca, exp, benefice: ca - exp, paid, balance: ca - paid, caHTG: ca * rate });
    }
  } else if (type === 'monthly') {
    const y = year || new Date().getFullYear().toString();
    for (let m = 1; m <= 12; m++) {
      const ms = y + '-' + (m < 10 ? '0' : '') + m;
      const ca = sales.filter(s => s.date && s.date.startsWith(ms)).reduce((a, s) => a + (s.totalUSD || 0), 0);
      const exp = expenses.filter(e => e.date && e.date.startsWith(ms)).reduce((a, e) => a + (e.amount || 0), 0);
      const paid = sales.filter(s => s.date && s.date.startsWith(ms)).reduce((a, s) => a + (s.paidUSD || 0), 0);
      rows.push({ label: MONTHS[m-1] + ' ' + y, month: ms, ca, exp, benefice: ca - exp, paid, balance: ca - paid, caHTG: ca * rate });
    }
  } else {
    const years = [...new Set([...sales.map(s => s.date?.slice(0,4)), ...expenses.map(e => e.date?.slice(0,4))].filter(Boolean))].sort();
    if (!years.length) years.push(new Date().getFullYear().toString());
    years.forEach(y => {
      const ca = sales.filter(s => s.date?.startsWith(y)).reduce((a, s) => a + (s.totalUSD || 0), 0);
      const exp = expenses.filter(e => e.date?.startsWith(y)).reduce((a, e) => a + (e.amount || 0), 0);
      const paid = sales.filter(s => s.date?.startsWith(y)).reduce((a, s) => a + (s.paidUSD || 0), 0);
      rows.push({ label: y, ca, exp, benefice: ca - exp, paid, balance: ca - paid, caHTG: ca * rate });
    });
  }

  const summary = {
    totalCA: rows.reduce((a, r) => a + r.ca, 0),
    totalExp: rows.reduce((a, r) => a + r.exp, 0),
    totalBen: rows.reduce((a, r) => a + r.benefice, 0),
    totalPaid: rows.reduce((a, r) => a + r.paid, 0),
    totalBal: rows.reduce((a, r) => a + r.balance, 0),
  };

  res.json({ rows, summary, rate });
});

// Dashboard stats
app.get('/api/dashboard', (req, res) => {
  const db = readDB();
  const today = new Date().toISOString().slice(0,10);
  const thisMonth = today.slice(0,7);
  const thisYear = today.slice(0,4);
  const sales = db.sales || [];
  const expenses = db.expenses || [];
  const products = db.products || [];
  const rate = db.settings?.exchangeRate || 136;

  const caToday  = sales.filter(s => s.date === today).reduce((a,s) => a + (s.totalUSD||0), 0);
  const caMonth  = sales.filter(s => s.date?.startsWith(thisMonth)).reduce((a,s) => a + (s.totalUSD||0), 0);
  const caYear   = sales.filter(s => s.date?.startsWith(thisYear)).reduce((a,s) => a + (s.totalUSD||0), 0);
  const caTotal  = sales.reduce((a,s) => a + (s.totalUSD||0), 0);
  const paid     = sales.reduce((a,s) => a + (s.paidUSD||0), 0);
  const expTotal = expenses.reduce((a,e) => a + (e.amount||0), 0);
  const benefice = caTotal - expTotal;
  const stockUnits = products.reduce((a,p) => a + (p.qty||0), 0);
  const stockPotential = products.reduce((a,p) => a + (p.qty||0)*(p.price||0), 0);
  const lowStock = products.filter(p => (p.qty||0) <= (p.alertQty||2));

  // Last 7 days chart data
  const chart7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0,10);
    chart7.push({
      label: d.toLocaleDateString('fr', { weekday: 'short', day: 'numeric' }),
      ca: sales.filter(s => s.date === ds).reduce((a,s) => a + (s.totalUSD||0), 0),
      exp: expenses.filter(e => e.date === ds).reduce((a,e) => a + (e.amount||0), 0)
    });
  }

  const recentSales = [...sales].sort((a,b) => (b.date||'').localeCompare(a.date||'')).slice(0,8);

  res.json({
    kpis: { caToday, caMonth, caYear, caTotal, paid, balance: caTotal - paid, expTotal, benefice, stockUnits, stockPotential, rate },
    lowStock,
    chart7,
    recentSales,
    nbClients: (db.clients||[]).length,
    nbProducts: products.length,
    nbSales: sales.length,
  });
});

// Export endpoint
app.get('/api/export/:type', (req, res) => {
  const db = readDB();
  const type = req.params.type;
  let csv = '', filename = '';

  if (type === 'sales') {
    filename = 'ventes_dealpam.csv';
    const rows = [['Date','Client','Produit','Qté','Prix unit','Total USD','Total HTG','Payé USD','Balance','Mode','Notes']];
    const rate = db.settings?.exchangeRate || 136;
    (db.sales||[]).forEach(s => rows.push([s.date,s.clientName,s.productName,s.qty,s.unitPrice,s.totalUSD,Math.round((s.totalUSD||0)*rate),(s.totalUSD||0)-(s.paidUSD||0),s.paidUSD,s.mode,s.notes||'']));
    csv = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  } else if (type === 'expenses') {
    filename = 'depenses_dealpam.csv';
    const rows = [['Date','Catégorie','Description','Montant USD','Mode']];
    (db.expenses||[]).forEach(e => rows.push([e.date,e.category,e.description,e.amount,e.paymentMethod]));
    csv = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  } else if (type === 'clients') {
    filename = 'clients_dealpam.csv';
    const rows = [['Nom','Téléphone','Email','Adresse','Date création']];
    (db.clients||[]).forEach(c => rows.push([c.name,c.phone,c.email,c.address,c.createdAt]));
    csv = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  } else if (type === 'products') {
    filename = 'produits_dealpam.csv';
    const rows = [['SKU','Nom','Catégorie','Quantité','Alerte','Coût','Prix Vente','Marge%']];
    (db.products||[]).forEach(p => {
      const m = p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
      rows.push([p.sku,p.name,p.category,p.qty,p.alertQty,p.cost,p.price,m+'%']);
    });
    csv = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  } else if (type === 'backup') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup_dealpam_${new Date().toISOString().slice(0,10)}.json"`);
    return res.send(JSON.stringify(db, null, 2));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv); // BOM for Excel compatibility
});

// ── START ────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log('\n');
  console.log('  ██████╗ ███████╗ █████╗ ██╗     ██████╗  █████╗ ███╗   ███╗');
  console.log('  ██╔══██╗██╔════╝██╔══██╗██║     ██╔══██╗██╔══██╗████╗ ████║');
  console.log('  ██║  ██║█████╗  ███████║██║     ██████╔╝███████║██╔████╔██║');
  console.log('  ██║  ██║██╔══╝  ██╔══██║██║     ██╔═══╝ ██╔══██║██║╚██╔╝██║');
  console.log('  ██████╔╝███████╗██║  ██║███████╗██║     ██║  ██║██║ ╚═╝ ██║');
  console.log('  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝     ╚═╝');
  console.log('\n  ✦ Application de gestion d\'entreprise');
  console.log(`  ✦ Démarré sur → http://localhost:${PORT}`);
  console.log('  ✦ Données     → ./data/db.json');
  console.log('\n  Ctrl+C pour arrêter\n');
});
