# 🛒 Dealpam — Projet Complet

E-commerce Dealpam multi-vendeurs pour Haïti.

## Structure du projet

```
dealpam/
├── backend/              ← API NestJS (Node.js + TypeScript)
├── frontend-user/        ← Site principal (React + MUI)
├── frontend-admin/       ← Panel administrateur (React + MUI)
├── DEPLOYMENT.md         ← Guide de déploiement complet
└── README.md
```

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend API | NestJS + TypeScript + Prisma ORM |
| Base de données | **Supabase** (PostgreSQL managé) |
| Images produits | **Cloudinary** (CDN — aucune image stockée localement) |
| Frontend User | React 18 + Vite + Material-UI + Zustand + React Query |
| Frontend Admin | React 18 + Vite + Material-UI + Recharts + DataGrid |
| Déploiement | **Hostinger** (frontends) + VPS/Railway (backend) |

## Images produits → Cloudinary

Le flux est le suivant :
1. Le vendeur sélectionne ses photos dans le formulaire
2. Les fichiers sont envoyés au backend (multipart/form-data)
3. Le backend les envoie à **Cloudinary via leur API**
4. L'URL CDN retournée (`res.cloudinary.com/...`) est stockée en base
5. **Aucune image sur le serveur ni dans un dossier local**

## Démarrage rapide

```bash
# Backend
cd backend
cp .env.example .env     # Remplissez DATABASE_URL, CLOUDINARY_*, JWT_*
npm install
npx prisma migrate deploy
npx ts-node prisma/seed.ts
npm run start:dev

# Frontend User (autre terminal)
cd frontend-user
cp .env.example .env
npm install
npm run dev              # http://localhost:5173

# Frontend Admin (autre terminal)
cd frontend-admin
cp .env.example .env
npm install
npm run dev              # http://localhost:5174
```

## Admin par défaut (après seed)
- Email: admin@dealpam.com
- Mot de passe: Admin@2024!

## Documentation API
http://localhost:3000/api/docs (Swagger)
