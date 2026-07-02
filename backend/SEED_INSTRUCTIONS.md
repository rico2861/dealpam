# Comment seeder la base de donnees

## Probleme
Le seed NestJS ne peut pas tourner en local car Supabase bloque les connexions IP non-whitelistees sur les plans gratuits/starter.

## Solution : executer le seed sur Hostinger

### Etape 1 - Se connecter au serveur Hostinger via SSH
```bash
ssh u123456789@hostinger-server-ip
```

### Etape 2 - Aller dans le dossier backend
```bash
cd ~/public_html/backend  # ou le chemin de ton projet
```

### Etape 3 - Lancer le seed
```bash
npx ts-node -r tsconfig-paths/register prisma/seed.ts
```

### Etape 4 - Verifier les donnees
```bash
npx prisma studio  # Lance une UI pour voir les donnees
```

## Comptes crees par le seed

| Role | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@dealpam.com | Admin@2025 |
| Client | client@dealpam.com | Client@2025 |
| Vendeur | rico.tech@dealpam.com | Seller@2025 |
| Vendeur | mode.chic@dealpam.com | Seller@2025 |
| Vendeur | auto.plus@dealpam.com | Seller@2025 |
| Vendeur | gonaives.market@dealpam.com | Seller@2025 |
| Vendeur | cayes.shop@dealpam.com | Seller@2025 |
| Vendeur | jacmel.boutique@dealpam.com | Seller@2025 |

## Produits crees (50+)
- Smartphones: 7 produits (iPhone 15 Pro Max, Samsung S24 Ultra, etc.)
- Vetements: 6 produits (robes, costumes, jeans, etc.)
- Vehicules: 5 produits (Toyota Corolla, Honda CR-V, Yamaha, etc.)
- Electronique: 6 produits (MacBook, TV Samsung, iPad, etc.)
- Meubles: 4 produits (canape, lit, table, bureau)
- Beaute: 4 produits (parfums, cremes, maquillage)
- Maison: 4 produits (ventilateur, frigo, clim, machine a laver)
- Chaussures: 4 produits (Nike, Adidas, escarpins, sandales)
- Sport: 4 produits (VTT, halteres, maillot, tapis yoga)
- Alimentation: 3 produits (cafe, rhum Barbancourt, huile)
- Services: 2 produits (reparation iPhone, cours couture)
