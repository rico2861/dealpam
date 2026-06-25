# Guide de Déploiement — Dealpam (Hostinger)

## Architecture de production

```
Hostinger Shared Hosting          Hostinger VPS
─────────────────────             ──────────────────────────────────
dealpam.com                       api.dealpam.com
  └── frontend-user/dist/           └── NestJS (PM2, port 3000)
                                        └── Nginx reverse proxy
admin.dealpam.com
  └── frontend-admin/dist/

         │                                    │
         └──────── VITE_API_URL ──────────────┘
                   https://api.dealpam.com/v1

Services externes
─────────────────
Supabase → PostgreSQL
Cloudflare R2 → Images & documents
```

---

## ÉTAPE 1 — Supabase (Base de données PostgreSQL)

1. Créez un compte sur https://supabase.com
2. New Project → nom + mot de passe fort
3. Settings → Database → copiez l'URL de connexion :
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```
4. Notez cette URL, vous en aurez besoin à l'étape 4

---

## ÉTAPE 2 — Cloudflare R2 (Stockage des images)

1. Compte Cloudflare → R2 → Create Bucket → nom : `dealpam`
2. R2 → Manage R2 API Tokens → Create Token (Read & Write)
3. Copiez : Account ID, Access Key ID, Secret Access Key
4. Optionnel : activez un domaine public pour le bucket (Custom Domain)

---

## ÉTAPE 3 — Build local (sur votre PC)

Remplissez d'abord les fichiers `.env` :

**`frontend-user/.env`**
```env
VITE_API_URL=https://api.dealpam.com/v1
```

**`frontend-admin/.env`**
```env
VITE_API_URL=https://api.dealpam.com/v1
```

Puis lancez le build :
```bash
bash build.sh
```

Cela génère :
- `backend/dist/` — le backend compilé
- `frontend-user/dist/` — le site principal
- `frontend-admin/dist/` — le panneau admin

---

## ÉTAPE 4 — VPS Hostinger (Backend NestJS)

### 4.1 — Connexion et installation

```bash
ssh root@VOTRE_IP_VPS

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx

# PM2
npm install -g pm2
```

### 4.2 — Uploader le backend

Via SFTP (FileZilla ou WinSCP), uploadez ces dossiers/fichiers vers `/var/www/dealpam/` :
```
backend/dist/
backend/node_modules/     (ou relancez npm ci sur le VPS)
backend/package.json
backend/prisma/
backend/ecosystem.config.js
backend/.env              (créez-le sur le VPS, voir 4.3)
```

Ou via Git :
```bash
git clone https://github.com/VOTRE_REPO /var/www/dealpam
cd /var/www/dealpam/backend
npm ci --omit=dev
npm run prisma:generate
npm run build
```

### 4.3 — Fichier .env backend (sur le VPS)

```bash
nano /var/www/dealpam/backend/.env
```

```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"

JWT_SECRET="MINIMUM_32_CARACTERES_ALEATOIRES"
JWT_REFRESH_SECRET="AUTRE_SECRET_32_CARACTERES"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

PORT=3000
NODE_ENV=production
FRONTEND_URL="https://dealpam.com"
ADMIN_URL="https://admin.dealpam.com"

R2_ENDPOINT="https://ACCOUNT_ID.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="votre_access_key"
R2_SECRET_ACCESS_KEY="votre_secret_key"
R2_BUCKET_NAME="dealpam"
R2_PUBLIC_URL="https://pub-XXXX.r2.dev"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="votre@gmail.com"
SMTP_PASS="votre_app_password"
SMTP_FROM="Dealpam <noreply@dealpam.com>"

MONCASH_CLIENT_ID="votre_client_id"
MONCASH_SECRET_KEY="votre_secret"
MONCASH_MODE="sandbox"

STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 4.4 — Migration base de données

```bash
cd /var/www/dealpam/backend
npx prisma migrate deploy
npx ts-node prisma/seed.ts   # optionnel : données initiales
```

### 4.5 — Démarrer avec PM2

```bash
cd /var/www/dealpam/backend
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # copier-coller la commande affichée
```

### 4.6 — Nginx reverse proxy

```bash
nano /etc/nginx/sites-available/api.dealpam.com
```

```nginx
server {
    listen 80;
    server_name api.dealpam.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/api.dealpam.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL automatique
certbot --nginx -d api.dealpam.com
```

---

## ÉTAPE 5 — Hostinger Shared Hosting (Frontends)

### 5.1 — Frontend User (dealpam.com)

1. Hostinger hPanel → File Manager
2. Allez dans `public_html/`
3. Supprimez tout ce qui s'y trouve (ou créez un sous-dossier)
4. Uploadez **tout le contenu** de `frontend-user/dist/`
5. Uploadez aussi `frontend-user/.htaccess` à la racine de `public_html/`

### 5.2 — Frontend Admin (admin.dealpam.com)

1. hPanel → Domains → Subdomains → créez `admin.dealpam.com`
   - Document root : `/public_html/admin/` (ou le chemin proposé)
2. File Manager → allez dans le dossier du sous-domaine
3. Uploadez **tout le contenu** de `frontend-admin/dist/`
4. Uploadez aussi `frontend-admin/.htaccess`

> **Important :** Le `.htaccess` est obligatoire — sans lui, React Router donne des erreurs 404 lors des rafraichissements de page.

### 5.3 — SSL

hPanel → SSL → Let's Encrypt → activez pour `dealpam.com` et `admin.dealpam.com`

---

## ÉTAPE 6 — DNS (si domaine chez Hostinger)

| Type | Nom | Valeur |
|------|-----|--------|
| A | @ | IP Shared Hosting |
| A | admin | IP Shared Hosting |
| A | api | IP VPS |

---

## Vérification finale

```bash
# API répond ?
curl https://api.dealpam.com/v1/health

# Logs PM2
pm2 logs dealpam-api --lines 50
```

| URL | Description |
|-----|-------------|
| https://dealpam.com | Site principal |
| https://admin.dealpam.com | Panneau admin |
| https://api.dealpam.com | API backend |
| https://api.dealpam.com/api/docs | Documentation Swagger |

---

## Compte admin par défaut (après seed)

- **Email :** admin@dealpam.com
- **Mot de passe :** Admin@2024!

**Changez ce mot de passe immédiatement après le premier login.**

---

## Commandes utiles sur le VPS

```bash
pm2 status                        # état du backend
pm2 restart dealpam-api           # redémarrer
pm2 logs dealpam-api              # logs en direct
pm2 monit                         # monitoring CPU/RAM

cd /var/www/dealpam/backend
npx prisma studio                 # interface DB (port 5555)
```
