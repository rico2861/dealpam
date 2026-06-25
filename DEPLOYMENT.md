# 🚀 Guide de Déploiement — Dealpam

## Architecture de production

```
[Hostinger]           [Hostinger VPS / Railway]     [Supabase]         [Cloudinary]
frontend-user/dist ──→ Backend NestJS (Port 3000) ──→ PostgreSQL DB ──→ Images CDN
frontend-admin/dist ──→     + Nginx Reverse Proxy
```

---

## ÉTAPE 1 — Supabase (Base de données)

1. Créez un compte sur https://supabase.com
2. New Project → choisissez un nom et mot de passe fort
3. Settings → Database → copiez l'URL de connexion :
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```
4. Mettez cette URL dans `backend/.env` → `DATABASE_URL=...`

---

## ÉTAPE 2 — Cloudinary (Hébergement des images produits)

> **Comment ça marche :** quand un vendeur uploade une photo, le backend NestJS
> reçoit le fichier en mémoire (multer), puis l'envoie directement à Cloudinary via
> leur API. L'URL Cloudinary (ex: `https://res.cloudinary.com/...`) est enregistrée
> en base de données. Les images ne touchent JAMAIS votre serveur ni votre dossier.

1. Créez un compte gratuit sur https://cloudinary.com
2. Dashboard → copiez : Cloud Name, API Key, API Secret
3. Ajoutez dans `backend/.env` :
   ```
   CLOUDINARY_CLOUD_NAME=votre_cloud_name
   CLOUDINARY_API_KEY=votre_api_key
   CLOUDINARY_API_SECRET=votre_api_secret
   CLOUDINARY_FOLDER=dealpam
   ```

**Plan gratuit Cloudinary :** 25 GB stockage, 25 GB bande passante/mois — suffisant pour démarrer.

---

## ÉTAPE 3 — Déployer le Backend (Hostinger VPS)

### Option A — Hostinger VPS (recommandé)

```bash
# 1. Connectez-vous à votre VPS
ssh root@VOTRE_IP_HOSTINGER

# 2. Installer Docker
curl -fsSL https://get.docker.com | sh

# 3. Uploader le dossier backend (via SFTP ou Git)
git clone https://github.com/VOTRE_REPO dealpam
cd dealpam/backend

# 4. Créer le fichier .env
cp .env.example .env
nano .env   # ← remplissez toutes les variables

# 5. Lancer avec Docker Compose
docker compose up -d

# 6. Initialiser la base de données
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx ts-node prisma/seed.ts
```

### Option B — Railway.app (plus simple, gratuit pour tester)

1. https://railway.app → New Project → Deploy from GitHub
2. Sélectionnez le dossier `backend/`
3. Variables d'environnement → ajoutez toutes les variables du `.env.example`
4. Railway génère automatiquement une URL (ex: `https://dealpam-backend.up.railway.app`)

---

## ÉTAPE 4 — Déployer les Frontends sur Hostinger

### Préparation du build

```bash
# Frontend User
cd frontend-user
cp .env.example .env
# Éditez .env : VITE_API_URL=https://api.dealpam.com/v1
npm install
npm run build
# → Le dossier dist/ est créé

# Frontend Admin
cd ../frontend-admin
cp .env.example .env
# Éditez .env : VITE_API_URL=https://api.dealpam.com/v1
npm install
npm run build
# → Le dossier dist/ est créé
```

### Upload sur Hostinger

1. **cPanel Hostinger** → File Manager
2. Pour le site principal (`dealpam.com`) :
   - Uploadez le contenu de `frontend-user/dist/` dans `public_html/`
   - Uploadez aussi `frontend-user/.htaccess` dans `public_html/`
3. Pour le sous-domaine admin (`admin.dealpam.com`) :
   - Domains → Add Subdomain : `admin`
   - Uploadez `frontend-admin/dist/` dans le dossier du sous-domaine
   - Uploadez aussi `frontend-admin/.htaccess`

> **Important :** Le fichier `.htaccess` est OBLIGATOIRE pour que React Router fonctionne.
> Sans lui, actualiser une page donnera une erreur 404.

---

## ÉTAPE 5 — SSL & Domaine

### Backend sur VPS
```bash
# Installer Certbot
apt install certbot python3-certbot-nginx -y
certbot --nginx -d api.dealpam.com
```

### Frontends sur Hostinger
Hostinger active le SSL automatiquement → cPanel → SSL/TLS → Let's Encrypt.

---

## ÉTAPE 6 — Variables d'environnement backend

Créez `backend/.env` avec toutes ces valeurs :

```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"

JWT_SECRET="CHANGEZ_CE_SECRET_32_CHARS_MINIMUM"
JWT_REFRESH_SECRET="CHANGEZ_CE_REFRESH_SECRET_32_CHARS"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

PORT=3000
NODE_ENV=production
FRONTEND_URL="https://dealpam.com"
ADMIN_URL="https://admin.dealpam.com"

CLOUDINARY_CLOUD_NAME="votre_cloud_name"
CLOUDINARY_API_KEY="votre_api_key"
CLOUDINARY_API_SECRET="votre_api_secret"
CLOUDINARY_FOLDER="dealpam"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="votre@gmail.com"
SMTP_PASS="votre_app_password_gmail"

MONCASH_CLIENT_ID="votre_client_id"
MONCASH_SECRET_KEY="votre_secret"
MONCASH_MODE="sandbox"
```

---

## Compte administrateur par défaut

Après le seed :
- **Email :** admin@dealpam.com
- **Mot de passe :** Admin@2024!

⚠️ **Changez immédiatement ce mot de passe en production !**

---

## URLs de production

| Service | URL |
|---------|-----|
| Frontend User | https://dealpam.com |
| Frontend Admin | https://admin.dealpam.com |
| API Backend | https://api.dealpam.com |
| API Docs (Swagger) | https://api.dealpam.com/api/docs |
| Supabase Dashboard | https://app.supabase.com |
| Cloudinary Dashboard | https://cloudinary.com/console |

---

## Plans d'abonnement vendeurs

| Plan | Prix/mois | Produits | Images | Avantages |
|------|-----------|----------|--------|-----------|
| STARTER | 500 HTG | 50 | 5 | Basique |
| BUSINESS | 1 000 HTG | 130 | 10 | Badge vérifié + Stats |
| PREMIUM | 2 500 HTG | 300 | 10 | Badge + Priorité recherche |
| ELITE | 5 000 HTG | Illimité | 15 | Tout + Page accueil + Sponsorisé |

---

## Support & Questions

- Documentation API Swagger : `/api/docs`
- Logs Docker : `docker compose logs -f backend`
- Logs Railway : Dashboard → Deployments → Logs
