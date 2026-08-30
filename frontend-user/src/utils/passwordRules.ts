// Règles de validation de mot de passe partagées entre RegisterPage et
// ForgotPasswordPage. Vit dans un fichier à part (ni dans l'une ni dans
// l'autre page) — les deux sont chargées à la demande (React.lazy) ; une page
// qui importe un export nommé d'une AUTRE page lazy casse le découpage de
// chunks Vite en production (fonctionne en dev, génère une référence de
// module brisée au build → boucle de rechargement infinie). Même cause déjà
// identifiée et corrigée pour StoreForm — voir components/shared/StoreConfigForm.tsx.
export const PASSWORD_RULES = [
  { label: '8 car. min',               ok: (p: string) => p.length >= 8 },
  { label: 'Minuscule',                ok: (p: string) => /[a-z]/.test(p) },
  { label: 'Majuscule',                ok: (p: string) => /[A-Z]/.test(p) },
  { label: 'Chiffre',                  ok: (p: string) => /\d/.test(p) },
  { label: 'Caractère spécial (!@#…)', ok: (p: string) => /[!@#$%^&*()\-_=+[\]{}|;:,.<>?/\\~`"']/.test(p) },
];

export function isPasswordValid(p: string) { return PASSWORD_RULES.every(r => r.ok(p)); }
