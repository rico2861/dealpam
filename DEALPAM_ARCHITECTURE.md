# DEALPAM v6.0 — Architecture Complète
## Plateforme E-Commerce Haïti · Production-Ready

---

## 1. VISION GÉNÉRALE

DEALPAM v6.0 est une plateforme e-commerce full-stack conçue spécifiquement pour le marché haïtien.  
**Stack** : Flask (Python) · React (Vite) · SQLite → PostgreSQL · JWT Auth · WebSocket temps réel

---

## 2. STRUCTURE DES DOSSIERS

```
dealpam/
├── backend/
│   ├── app.py                    ← Entrée principale Flask
│   ├── config.py                 ← Configuration (env vars)
│   ├── requirements.txt
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py               ← User, rôles, auth
│   │   ├── product.py            ← Product + ProductVariant
│   │   ├── order.py              ← Order, OrderItem
│   │   ├── promo.py              ← PromoCode
│   │   ├── payment.py            ← PaymentProof (virement)
│   │   ├── expense.py            ← Dépenses
│   │   ├── sale.py               ← Ventes internes admin
│   │   ├── client.py             ← Profils clients
│   │   └── setting.py            ← Paramètres globaux
│   ├── routes/
│   │   ├── auth.py               ← /api/auth/*
│   │   ├── public.py             ← /api/public/* (sans auth)
│   │   ├── orders.py             ← /api/orders/*
│   │   ├── products.py           ← /api/products/*
│   │   ├── users.py              ← /api/users/*
│   │   ├── promos.py             ← /api/promos/*
│   │   ├── payments.py           ← /api/payments/*
│   │   ├── expenses.py           ← /api/expenses/*
│   │   ├── sales.py              ← /api/sales/*
│   │   ├── clients.py            ← /api/clients/*
│   │   ├── dashboard.py          ← /api/dashboard
│   │   ├── reports.py            ← /api/reports
│   │   └── settings.py           ← /api/settings
│   ├── utils/
│   │   ├── auth.py               ← Décorateurs rôles
│   │   ├── pdf.py                ← Génération PDF (ReportLab)
│   │   ├── upload.py             ← Gestion fichiers sécurisée
│   │   ├── moncash.py            ← Intégration MonCash API
│   │   └── mailer.py             ← Notifications email
│   └── uploads/                  ← Preuves virements (non public)
│
├── client/                       ← Espace CLIENT (port 3001)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Shop.jsx
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx      ← Zone livraison + paiement
│   │   │   ├── OrderTracking.jsx
│   │   │   ├── OrderHistory.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── CartDrawer.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── VariantSelector.jsx   ← Couleur / Taille
│   │   │   ├── PromoTicker.jsx       ← Texte défilant promo
│   │   │   ├── PaymentModal.jsx      ← MonCash / Virement / COD
│   │   │   └── Toast.jsx
│   │   └── context/
│   │       ├── AuthContext.jsx
│   │       ├── CartContext.jsx
│   │       └── CurrencyContext.jsx   ← HTG / USD
│
├── admin/                        ← Espace ADMIN/VENDEUR/COMPTABLE (port 3000)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Orders.jsx            ← Toutes les commandes
│   │   │   ├── OrderDetail.jsx       ← Détail + changement statut
│   │   │   ├── Products.jsx
│   │   │   ├── ProductForm.jsx       ← Avec gestion variantes
│   │   │   ├── Clients.jsx
│   │   │   ├── Expenses.jsx
│   │   │   ├── Sales.jsx
│   │   │   ├── Reports.jsx           ← Comptable uniquement
│   │   │   ├── Promos.jsx            ← Admin uniquement
│   │   │   ├── Payments.jsx          ← Preuves de virement
│   │   │   ├── Users.jsx
│   │   │   └── Settings.jsx
│   │   └── components/
│   │       ├── Sidebar.jsx
│   │       ├── UI.jsx
│   │       └── PaymentProofViewer.jsx
│
└── public/                       ← Page statique légère (optionnel)
```

---

## 3. BASE DE DONNÉES — MODÈLES NORMALISÉS

### users
```sql
id, name, email, password_hash, role (Admin|Vendeur|Comptable|Client),
phone, address, city, active, force_password_change,
avatar_color, created_at
```

### categories
```sql
id, name, icon, slug, active
```

### products
```sql
id, sku, name, description, category_id, cost_usd, price_usd,
image_url, featured, active, has_variants, created_at
-- has_variants: si False → stock directement sur le produit
-- si True     → stock géré par product_variants
```

### product_variants *(NOUVEAU)*
```sql
id, product_id (FK), color, size, stock, sku_suffix
-- Exemples : color="Noir", size="50ml", stock=5
-- Combinaison color+size est unique par produit
```

### orders *(AMÉLIORÉ)*
```sql
id, order_ref (ex: DP-2025-00123), user_id (FK), 
client_name, client_phone, client_address,
zone (Petion-Ville|Delmas|Tabarre|Carrefour),
delivery_fee_htg, subtotal_usd, total_usd,
currency_display (HTG|USD), exchange_rate_at_order,
payment_method (moncash|virement|livraison|shop),
payment_status (pending|verified|rejected),
status (en_attente|validee|en_preparation|expediee|livree|annulee|echouee|remboursee),
moncash_ref, notes, created_at
```

### order_items
```sql
id, order_id (FK), product_id (FK), variant_id (FK nullable),
product_name, variant_label, qty, unit_price_usd, line_total_usd
```

### payment_proofs *(NOUVEAU)*
```sql
id, order_id (FK), file_path, file_type (image|pdf),
bank_name, account_type (HTG|USD),
uploaded_at, verified_by, verified_at, status (pending|approved|rejected),
rejection_reason
```

### promo_codes *(NOUVEAU)*
```sql
id, code (unique), type (percent|fixed_usd|fixed_htg),
value, min_order_usd, max_uses, uses_count,
active, starts_at, expires_at, created_by
```

### promotions *(NOUVEAU — bannières/ticker)*
```sql
id, text, type (ticker|banner|section),
active, starts_at, expires_at, created_by
```

### settings
```sql
id, company_name, slogan, exchange_rate (HTG/USD),
address, phone, email, logo_url, hero_text,
moncash_merchant_key (chiffré), created_at
```

### expenses, sales, clients
*(Modèles existants conservés et améliorés)*

---

## 4. API ENDPOINTS COMPLETS

### AUTH
```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me
POST   /api/auth/change-password
```

### PUBLIC (sans auth)
```
GET    /api/public/products          ← produits actifs + variantes
GET    /api/public/products/:id      ← détail produit
GET    /api/public/categories
GET    /api/public/settings
GET    /api/public/promotions        ← ticker + bannières actives
GET    /api/public/delivery-zones    ← zones + tarifs livraison
POST   /api/public/validate-promo    ← validation code promo côté backend
```

### ORDERS (client + admin)
```
POST   /api/orders                   ← créer commande (client)
GET    /api/orders/my                ← mes commandes (client)
GET    /api/orders/:id               ← détail commande
GET    /api/orders/:id/pdf           ← télécharger PDF
POST   /api/orders/:id/cancel        ← annuler (avant livraison)
GET    /api/orders                   ← toutes (admin/vendeur)
PUT    /api/orders/:id/status        ← changer statut (admin/vendeur)
```

### PAIEMENTS
```
POST   /api/payments/proof/:order_id     ← uploader preuve virement
GET    /api/payments/proofs              ← liste preuves (admin/vendeur)
PUT    /api/payments/proof/:id/verify    ← approuver/rejeter
GET    /api/payments/proof/:id/file      ← télécharger fichier (protégé)
POST   /api/payments/moncash/initiate    ← initier paiement MonCash
POST   /api/payments/moncash/verify      ← vérifier paiement MonCash
```

### PRODUCTS (admin)
```
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/products/:id/variants
POST   /api/products/:id/variants
PUT    /api/products/variants/:vid
DELETE /api/products/variants/:vid
```

### PROMOS (admin seulement)
```
GET    /api/promos
POST   /api/promos
PUT    /api/promos/:id
DELETE /api/promos/:id
GET    /api/promotions
POST   /api/promotions
PUT    /api/promotions/:id
DELETE /api/promotions/:id
```

### DASHBOARD & REPORTS (rôle-dépendant)
```
GET    /api/dashboard       ← KPIs selon rôle
GET    /api/reports         ← comptable + admin uniquement
```

---

## 5. LOGIQUE LIVRAISON (BACKEND)

```python
DELIVERY_ZONES = {
    "Petion-Ville": {"fee_htg": 600, "delay_days": 1},
    "Delmas":       {"fee_htg": 600, "delay_days": 1},
    "Tabarre":      {"fee_htg": 700, "delay_days": 2},
    "Carrefour":    {"fee_htg": 700, "delay_days": 2},
}

def calculate_delivery(zone: str, subtotal_htg: float) -> dict:
    if zone not in DELIVERY_ZONES:
        raise ValueError(f"Zone non autorisée: {zone}")
    info = DELIVERY_ZONES[zone]
    return {
        "zone": zone,
        "fee_htg": info["fee_htg"],
        "delay_days": info["delay_days"],
        "total_htg": subtotal_htg + info["fee_htg"]
    }
```

**Règles :**
- Le frontend affiche les zones disponibles (données serveur)
- Le prix de livraison est TOUJOURS calculé côté backend
- Le total envoyé par le client est re-vérifié côté serveur
- Aucune zone dangereuse dans la liste

---

## 6. LOGIQUE VARIANTES PRODUITS (BACKEND)

```python
# Création variante
POST /api/products/:id/variants
{
  "color": "Noir",
  "size": "50ml",
  "stock": 10
}

# Lors d'une commande, le frontend envoie :
{
  "productId": 3,
  "variantId": 7,   # null si pas de variante
  "qty": 2
}

# Le backend :
# 1. Vérifie que variantId appartient au productId
# 2. Vérifie stock disponible sur la variante (ou produit direct)
# 3. Décrémente stock au moment de la validation
# 4. Stock réservé au moment de la commande (statut: en_attente)
# 5. Stock déduit définitivement à la validation
```

---

## 7. LOGIQUE CONVERSION DEVISE (BACKEND)

```python
def convert(amount_usd: float, to: str, rate: float) -> float:
    """Toute conversion passe par ici. Jamais dans le frontend."""
    if to == 'HTG':
        return round(amount_usd * rate, 2)
    return round(amount_usd, 2)

# Le taux est toujours lu depuis settings.exchange_rate
# Stocké dans chaque commande au moment de la création
# (pour garder l'historique correct même si le taux change)
```

**Dans chaque commande :**
- `exchange_rate_at_order` est figé au moment de la commande
- Les calculs historiques utilisent ce taux archivé
- Le frontend ne fait AUCUN calcul financier

---

## 8. LOGIQUE PAIEMENTS

### MonCash
```
1. Client choisit MonCash → POST /api/payments/moncash/initiate
2. Backend génère une référence MonCash via l'API MonCash Sandbox/Prod
3. Le client reçoit un code/lien MonCash
4. MonCash webhook → POST /api/payments/moncash/webhook
5. Backend vérifie la transaction, met à jour order.payment_status
```

### Virement Bancaire
```
Comptes affichés au client :
  SOGEBANK HTG : Richo Brezault – 94389348394
  SOGEBANK USD : Richo Brezault – 98348947348
  UNIBANK  USD : Richo Brezault – 9849349349
  UNIBANK  HTG : Richo Brezault – 9724625274

1. Client uploade preuve → POST /api/payments/proof/:order_id
2. Fichier stocké hors dossier public (chemin hashed, extension validée)
3. Admin/Vendeur voit preuve → GET /api/payments/proofs
4. Admin approuve/rejette → PUT /api/payments/proof/:id/verify
5. Si approuvé → order.payment_status = 'verified', order.status = 'validee'
```

### Livraison / Shop
```
1. Commande créée avec payment_method = 'livraison' ou 'shop'
2. Génération automatique d'un ID court lisible (ex: SHOP-4821)
3. Affichage : produits + montant total à payer
4. Recherche rapide par ID dans le panel admin/vendeur
```

---

## 9. STATUTS DE COMMANDES

```
en_attente      → Commande reçue, paiement en attente
validee         → Paiement confirmé, commande acceptée
en_preparation  → En cours de préparation
expediee        → Envoyée en livraison
livree          → Livrée au client
annulee         → Annulée (avant expédition)
echouee         → Problème (paiement rejeté, rupture stock, etc.)
remboursee      → Remboursement effectué
```

**Transitions autorisées :**
- Client peut annuler : `en_attente` → `annulee` seulement
- Admin/Vendeur peut changer librement
- PDF téléchargeable si : `validee`, `livree`, `echouee`

---

## 10. PDF COMMANDE (ReportLab)

```python
from reportlab.platypus import SimpleDocTemplate, Table, Paragraph

def generate_order_pdf(order: Order) -> bytes:
    # Contenu :
    # - Logo + Nom boutique
    # - Référence commande + Date
    # - Informations client (nom, téléphone, adresse, zone)
    # - Tableau produits (nom, variante, qty, prix unitaire, total ligne)
    # - Sous-total + Livraison + TOTAL
    # - Mode de paiement
    # - Statut (avec couleur)
    # - Pied de page : remerciement + contact
    pass

# Accessible uniquement via JWT + statut correct
GET /api/orders/:id/pdf
Authorization: Bearer <token>
```

---

## 11. CODES PROMO — LOGIQUE BACKEND

```python
def apply_promo(code: str, subtotal_usd: float) -> dict:
    promo = PromoCode.query.filter_by(code=code.upper(), active=True).first()
    
    if not promo:
        raise ValueError("Code promo invalide")
    if promo.expires_at and promo.expires_at < datetime.now():
        raise ValueError("Code promo expiré")
    if promo.uses_count >= promo.max_uses:
        raise ValueError("Code promo épuisé")
    if subtotal_usd < promo.min_order_usd:
        raise ValueError(f"Minimum de commande : ${promo.min_order_usd}")
    
    # Calcul réduction
    if promo.type == 'percent':
        discount = subtotal_usd * (promo.value / 100)
    elif promo.type == 'fixed_usd':
        discount = min(promo.value, subtotal_usd)
    
    return {
        "valid": True,
        "discount_usd": round(discount, 2),
        "new_subtotal_usd": round(subtotal_usd - discount, 2)
    }
```

---

## 12. GESTION DES RÔLES ET PERMISSIONS

| Action | Client | Vendeur | Comptable | Admin |
|--------|--------|---------|-----------|-------|
| Voir produits (public) | ✅ | ✅ | ✅ | ✅ |
| Passer une commande | ✅ | — | — | ✅ |
| Voir ses commandes | ✅ | — | — | ✅ |
| Traiter commandes | — | ✅ | — | ✅ |
| Voir preuves paiement | — | ✅ | — | ✅ |
| Voir ventes globales | — | Ses ventes | ✅ | ✅ |
| Voir dépenses | — | — | ✅ | ✅ |
| Voir profits/finances | — | — | ✅ | ✅ |
| Gérer produits | — | — | — | ✅ |
| Gérer codes promo | — | — | — | ✅ |
| Gérer utilisateurs | — | — | — | ✅ |
| Modifier taux change | — | — | — | ✅ |
| Voir rapport complet | — | — | ✅ | ✅ |

---

## 13. SÉCURITÉ

### Authentification
- JWT avec expiration 24h
- `role_required(*roles)` decorator sur chaque endpoint sensible
- Refresh token recommandé pour production

### Upload fichiers
```python
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

def secure_upload(file) -> str:
    ext = validate_extension(file.filename)
    # Scan magic bytes (vérification réelle du type de fichier)
    # Nom hashed (UUID), jamais le nom original
    # Stocké dans backend/uploads/ (hors accès direct web)
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(UPLOAD_FOLDER, filename))
    return filename
```

### Protection API
- Rate limiting (flask-limiter)
- CORS strict (origines whitelistées)
- Validation de tous les inputs côté backend
- Aucune donnée sensible dans les réponses publiques

### Calculs financiers
- JAMAIS dans le frontend
- Re-validation systématique côté backend
- `exchange_rate_at_order` archivé dans chaque commande

---

## 14. TEMPS RÉEL (WebSocket / Polling)

### Option 1 — WebSocket (Flask-SocketIO)
```python
# Backend
@socketio.on('join_admin')
def handle_join(data):
    join_room('admin_room')

# Événements émis :
# - 'new_order'         → nouvelle commande reçue
# - 'order_updated'     → statut commande changé
# - 'payment_proof'     → preuve de virement uploadée
# - 'low_stock'         → alerte stock bas
```

### Option 2 — Polling (plus simple, recommandé v6)
```javascript
// Frontend admin — polling toutes les 30s
useEffect(() => {
  const interval = setInterval(() => {
    api.get('/orders?status=en_attente').then(refresh)
  }, 30000)
  return () => clearInterval(interval)
}, [])
```

---

## 15. DASHBOARDS PAR RÔLE

### Admin
- KPIs : CA, encaissé, dépenses, profit net, commandes en attente
- Graphiques : ventes 7 jours, tendance 6 mois, méthodes paiement
- Alertes stock bas
- Commandes récentes
- Preuves de virement en attente

### Vendeur
- Commandes à traiter
- Ses ventes du mois
- Recherche commande par ID (livraison/shop)
- Preuves de virement en attente

### Comptable
- CA global, dépenses, profit net
- Rapport par période (semaine/mois/année)
- Export Excel/PDF des données financières
- Remboursements approuvés/rejetés
- Ventilation par méthode de paiement

### Client
- Suivi de commande (timeline visuelle)
- Historique commandes
- Téléchargement PDF

---

## 16. PAGES CLIENT — LISTE COMPLÈTE

| Page | Route | Description |
|------|-------|-------------|
| Accueil | `/` | Hero, best-sellers, promotions, stats |
| Boutique | `/shop` | Catalogue filtrable par catégorie |
| Produit | `/product/:id` | Détail + variantes + ajout panier |
| Panier | `/cart` | Récap + code promo + choix devise |
| Checkout | `/checkout` | Zone livraison + paiement |
| Suivi | `/track/:ref` | Timeline commande |
| Historique | `/orders` | Mes commandes + PDF |
| Profil | `/profile` | Modifier infos + mot de passe |
| Connexion | `/login` | Login + lien inscription |
| Inscription | `/register` | Création compte client |

---

## 17. COMPOSANTS FRONTEND CLÉS

### VariantSelector
```jsx
// Affiche couleurs + tailles disponibles
// Grise les combinaisons hors stock
// Stocke (productId, variantId) dans le panier
<VariantSelector
  variants={product.variants}
  onSelect={(variantId) => setSelectedVariant(variantId)}
/>
```

### CheckoutForm
```jsx
// Étapes :
// 1. Infos client (nom, téléphone, adresse)
// 2. Zone de livraison → prix calculé via /api/public/delivery-zones
// 3. Mode de paiement
// 4. Résumé + confirmation
// Tout validé côté backend avant création commande
```

### PromoTicker
```jsx
// Bande défilante avec promotions actives
// Données depuis /api/public/promotions?type=ticker
<marquee> ✦ PROMO -20% avec code DEALPAM20 · Livraison gratuite Pétion-Ville... </marquee>
```

---

## 18. DONNÉES DE TEST (SEED)

Comptes disponibles :
```
admin@dealpam.com    / admin123    → Admin
vendeur@dealpam.com  / vend123     → Vendeur
comptable@dealpam.com/ comp123     → Comptable
client@dealpam.com   / client123   → Client
```

---

## 19. DÉPLOIEMENT PRODUCTION

```
Backend  → Gunicorn + Nginx · port 8000
Admin    → Build Vite → dist/ servi par Nginx
Client   → Build Vite → dist/ servi par Nginx
DB       → PostgreSQL (migration depuis SQLite)
Uploads  → Volume persistant (hors /tmp)
SSL      → Let's Encrypt (Certbot)
```

### Variables d'environnement
```env
FLASK_ENV=production
JWT_SECRET_KEY=<32+ chars aléatoires>
DATABASE_URL=postgresql://user:pass@localhost/dealpam
UPLOAD_FOLDER=/var/dealpam/uploads
MONCASH_API_KEY=<clé MonCash>
MONCASH_SECRET=<secret MonCash>
```

---

## 20. RÉSUMÉ DES NOUVELLES FONCTIONNALITÉS v6

| Fonctionnalité | Status v5 | v6 |
|---|---|---|
| Variantes produits (couleur/taille/stock) | ❌ | ✅ |
| Zones de livraison Haïti | ❌ | ✅ |
| Checkout complet avec livraison | ❌ | ✅ |
| MonCash | ❌ | ✅ |
| Virement bancaire + preuve upload | ❌ | ✅ |
| Paiement livraison / shop + ID unique | ❌ | ✅ |
| 8 statuts de commande | ❌ | ✅ |
| Annulation client avant livraison | ❌ | ✅ |
| PDF téléchargeable | ❌ | ✅ |
| Codes promo (admin) | ❌ | ✅ |
| Bannières / ticker promotionnel | ❌ | ✅ |
| Conversion devise HTG/USD (backend) | Partiel | ✅ |
| Taux de change archivé par commande | ❌ | ✅ |
| Permissions comptable (finances seules) | Partiel | ✅ |
| Upload sécurisé (magic bytes) | ❌ | ✅ |

---

*DEALPAM v6.0 · Architecture par Claude · Production-Ready pour Haïti*
