// La plupart des erreurs backend sont déjà en français (voir translateValidationMessage
// côté API), mais certaines fuient encore du texte technique brut (erreurs Prisma,
// exceptions génériques NestJS non traduites, messages de librairies tierces) —
// reconnaissable à des mots-clés anglais typiques. Dans ce cas, on affiche un
// message générique plutôt que du jargon incompréhensible pour un vendeur/client.
const TECHNICAL_PATTERNS = /\b(error|exception|internal server|unexpected|failed|cannot|undefined|null|stack|prisma|econnrefused|timeout|validation failed)\b/i;

export function friendlyApiError(err: any, fallback: string): string {
  const raw = err?.response?.data?.message;
  const msg = Array.isArray(raw) ? raw.join(', ') : raw;
  if (!msg || typeof msg !== 'string') return fallback;
  if (TECHNICAL_PATTERNS.test(msg)) return fallback;
  return msg;
}
