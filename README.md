# DEALPAM v5.0 — Plateforme de gestion de parfums Zara

Plateforme complète de gestion pour revendeur de parfums Zara.  
**Deux frontends** (Admin + Client), un **backend Flask**.

---

## 🚀 Démarrage rapide (Windows PowerShell)

### Terminal 1 — Backend Flask (port 8000)
```powershell
cd backend
pip install flask flask-sqlalchemy flask-cors flask-jwt-extended werkzeug==2.3.7
python app.py
```

### Terminal 2 — Admin (port 3000)
```powershell
cd admin
npm install
npm run dev
# → http://localhost:3000
```

### Terminal 3 — Client (port 3001)
```powershell
cd client
npm install
npm run dev
# → http://localhost:3001
```

---

## 🔑 Comptes par défaut

| Rôle       | Email                    | Mot de passe |
|------------|--------------------------|--------------|
| Admin      | admin@dealpam.com        | admin123     |
| Vendeur    | vendeur@dealpam.com      | vend123      |
| Comptable  | comptable@dealpam.com    | comp123      |
| Client     | client@dealpam.com       | client123    |

---

## 🏗️ Architecture

```
dealpam/
├── backend/           # Flask API — port 8000
│   ├── app.py         # Toutes les routes + modèles SQLAlchemy
│   └── requirements.txt
├── admin/             # React + Vite — port 3000
│   └── src/
│       ├── pages/     # Dashboard, Products, Sales, Clients, Expenses, Reports, Users, Settings
│       ├── components/ # UI kit (Btn, Card, Table, Modal, Toast…)
│       └── context/   # Auth, Currency
└── client/            # React + Vite — port 3001
    └── src/
        ├── pages/     # Home, Shop, ProductDetail, Login, Register, Orders, Profile, About
        ├── components/ # Header, CartDrawer, Toast
        └── context/   # Auth, Cart, Currency
```

---

## 📦 Fonctionnalités

### Admin (port 3000) — Thème cyber/sombre
- **Dashboard** : KPIs, graphiques 7j, 6 mois, modes paiement, alertes stock
- **Produits** : grille/liste, marge auto, images URL, featured toggle
- **Ventes** : CRUD complet, dual USD/HTG, statuts paid/partiel/impayé
- **Clients** : profil complet, historique, balance, pièce d'identité
- **Dépenses** : par catégorie, dual devises
- **Rapports** : semaine/mois/année, graphiques bar + ligne + pie, tableau récap
- **Utilisateurs** : create/edit/reset MDP, activer/désactiver *(Admin seulement)*
- **Paramètres** : taux de change, infos entreprise, changer MDP

### Client (port 3001) — Thème luxe/or
- **Boutique** : catalogue, filtres, recherche, panier persistant
- **Panier** : drawer slide-in, quantities, checkout
- **Commandes** : historique avec statuts
- **Auth** : login/register, espace profil

### Rôles
| Rôle       | Accès                                              |
|------------|----------------------------------------------------|
| Admin      | Tout — y compris users et paramètres               |
| Vendeur    | Produits, ventes, clients                          |
| Comptable  | Rapports, dépenses, transactions (lecture seule)   |
| Client     | Boutique, panier, commandes (portail client)       |

---

## 💱 Devises
- Toggle USD ↔ HTG dans topbar (admin) et header (client)
- Taux configurable dans Paramètres
- Taux par défaut : **136 HTG/USD**
- Persisté en localStorage

---

## 📱 Mobile
- Sidebar admin : overlay sur mobile avec bouton hamburger
- Header client : hamburger → drawer (slide depuis droite)
- Hero client : 1 colonne sur mobile, 2 colonnes sur desktop
- Toutes les interactions : `touch-action: manipulation`, états `:active` au lieu de `:hover`
- Grilles CSS `auto-fill` — s'adaptent automatiquement
