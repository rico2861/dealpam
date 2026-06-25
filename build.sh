#!/bin/bash
# Script de build complet — Dealpam
# Usage: bash build.sh

set -e

echo "=== BUILD DEALPAM ==="

# ── Backend ──────────────────────────────────────────────────────────────────
echo ""
echo "[1/3] Backend NestJS..."
cd backend
npm ci --omit=dev
npm run prisma:generate
npm run build
echo "    backend/dist/ OK"
cd ..

# ── Frontend User ─────────────────────────────────────────────────────────────
echo ""
echo "[2/3] Frontend User..."
cd frontend-user
npm ci
npm run build
echo "    frontend-user/dist/ OK"
cd ..

# ── Frontend Admin ────────────────────────────────────────────────────────────
echo ""
echo "[3/3] Frontend Admin..."
cd frontend-admin
npm ci
npm run build
echo "    frontend-admin/dist/ OK"
cd ..

echo ""
echo "=== BUILD TERMINE ==="
echo ""
echo "Fichiers a uploader sur Hostinger :"
echo "  backend/dist/           → VPS (dossier backend)"
echo "  frontend-user/dist/     → public_html/ (dealpam.com)"
echo "  frontend-admin/dist/    → public_html/ (admin.dealpam.com)"
