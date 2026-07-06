// ─────────────────────────────────────────────────────────────────────────
// Détection heuristique de contenu potentiellement illicite à la publication.
// Ne bloque JAMAIS automatiquement une annonce — elle est seulement marquée
// "isFlagged" et forcée en PENDING_REVIEW pour qu'un admin tranche. Faux
// positifs attendus et acceptables (ex: "couteau de cuisine" peut matcher
// "couteau") — le rôle de l'admin est justement de trancher ces cas-là.
// Liste volontairement groupée par catégorie pour que le motif affiché à
// l'admin soit compréhensible, pas juste "mot interdit détecté".
// ─────────────────────────────────────────────────────────────────────────

interface FlagCategory {
  label: string;
  patterns: RegExp[];
}

const CATEGORIES: FlagCategory[] = [
  {
    label: 'Armes / munitions',
    patterns: [
      /\b(fusil|pistolet|revolver|glock|ak-?47|munitions?|cartouches?|grenade|explosifs?)\b/i,
      /\b(firearm|handgun|ammunition|bullets?)\b/i,
    ],
  },
  {
    label: 'Drogues / stupéfiants',
    patterns: [
      /\b(cocaine|coke|marijuana|cannabis|weed|ganja|crack|heroine|meth(amphetamine)?|ecstasy|lsd)\b/i,
      /\b(dwòg|kokayin)\b/i,
    ],
  },
  {
    label: 'Médicaments réglementés / contrefaits',
    patterns: [
      /\b(ordonnance requise|prescription only|opioides?|fentanyl|morphine sans ordonnance)\b/i,
      /\bviagra (générique|contrefait)\b/i,
    ],
  },
  {
    label: 'Contrefaçon',
    patterns: [
      /\b(replique|réplique|contrefacon|contrefaçon|counterfeit|fake\s+(nike|gucci|rolex|louis vuitton))\b/i,
      /\b(copie identique marque|AAA quality replica)\b/i,
    ],
  },
  {
    label: 'Espèces protégées / ivoire',
    patterns: [
      /\b(ivoire|d[ée]fense d'[ée]l[ée]phant|corne de rhinoc[ée]ros|carapace de tortue)\b/i,
      /\b(ivory|rhino horn)\b/i,
    ],
  },
  {
    label: 'Documents officiels / identité',
    patterns: [
      /\b(faux passeport|fake passport|faux permis|carte d'identit[ée] vierge|diplome vierge|dipl[oô]me vierge)\b/i,
    ],
  },
  {
    label: 'Traite / exploitation',
    patterns: [
      /\b(vente d'organes?|organ(s)? for sale|service sexuel mineur)\b/i,
    ],
  },
];

export interface ModerationResult {
  isFlagged: boolean;
  reason: string | null;
}

export function scanForProhibitedContent(...texts: (string | null | undefined)[]): ModerationResult {
  const haystack = texts.filter(Boolean).join(' \n ');
  if (!haystack.trim()) return { isFlagged: false, reason: null };

  for (const category of CATEGORIES) {
    for (const pattern of category.patterns) {
      const match = haystack.match(pattern);
      if (match) {
        return { isFlagged: true, reason: `${category.label} — terme détecté : "${match[0]}"` };
      }
    }
  }
  return { isFlagged: false, reason: null };
}
