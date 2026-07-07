import { Box, Container, Typography, Divider, Chip } from '@mui/material';
import { Cookie } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const ORANGE = '#FF6B00';
const BG = '#0F172A';

const COOKIE_TYPES = [
  {
    name: 'Essentiels',
    badge: 'Toujours actifs',
    badgeColor: '#10B981',
    description: 'Ces cookies sont indispensables au fonctionnement de la plateforme. Ils permettent la gestion de votre session de connexion, le maintien du panier et la sécurité des transactions.',
    examples: ['Session utilisateur', 'Panier d\'achat', 'Token d\'authentification (accessToken)', 'Protection CSRF'],
    duration: 'Jusqu\'à 30 jours',
  },
  {
    name: 'Performance',
    badge: 'Optionnels',
    badgeColor: '#6366F1',
    description: 'Ces cookies nous permettent de mesurer l\'audience et les performances de DealPam afin d\'améliorer continuellement l\'expérience utilisateur. Les données collectées sont anonymisées.',
    examples: ['Pages visitées', 'Durée des sessions', 'Taux de rebond', 'Erreurs rencontrées'],
    duration: '13 mois',
  },
  {
    name: 'Fonctionnels',
    badge: 'Optionnels',
    badgeColor: '#F59E0B',
    description: 'Ces cookies permettent de mémoriser vos préférences pour personnaliser votre expérience sur DealPam (localisation, langue, affichage).',
    examples: ['Zone géographique (dp_location_v2)', 'Préférences d\'affichage', 'Historique de recherche récent'],
    duration: '6 mois',
  },
  {
    name: 'Marketing',
    badge: 'Optionnels',
    badgeColor: '#EC4899',
    description: 'Ces cookies sont utilisés pour vous proposer des publicités et des offres personnalisées en fonction de vos centres d\'intérêt et de votre comportement sur la plateforme.',
    examples: ['Ciblage publicitaire', 'Retargeting', 'Mesure de l\'efficacité des annonces'],
    duration: '90 jours',
  },
];

const SECTIONS = [
  {
    title: 'Qu\'est-ce qu\'un cookie ?',
    content: `Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur, tablette, smartphone) lors de votre visite sur un site web. Il permet au site de mémoriser vos actions et préférences sur une période donnée, afin que vous n'ayez pas à les saisir à nouveau à chaque visite.

DealPam utilise également le stockage local (localStorage) de votre navigateur pour sauvegarder certaines préférences comme votre localisation géographique.`,
  },
  {
    title: 'Comment gérer vos cookies ?',
    content: `Vous pouvez contrôler et gérer les cookies de plusieurs façons :

Paramètres du navigateur : La plupart des navigateurs vous permettent de refuser ou de supprimer les cookies dans leurs paramètres. Notez que la désactivation des cookies essentiels peut empêcher le bon fonctionnement de la plateforme.

• Chrome : Paramètres > Confidentialité et sécurité > Cookies
• Firefox : Options > Vie privée et sécurité > Cookies
• Safari : Préférences > Confidentialité
• Edge : Paramètres > Cookies et autorisations du site

LocalStorage : Vous pouvez vider le stockage local depuis les outils développeur de votre navigateur (F12 > Application > Local Storage).`,
  },
  {
    title: 'Cookies tiers',
    content: `Certains partenaires de DealPam peuvent déposer des cookies sur votre appareil dans le cadre de leurs services :

• Prestataires de paiement (MonCash, NatCash) : pour sécuriser les transactions
• Services d'analyse : pour mesurer l'audience (données anonymisées)

Nous n'avons pas de contrôle direct sur les cookies déposés par ces tiers. Nous vous invitons à consulter leurs politiques de confidentialité respectives.`,
  },
  {
    title: 'Mise à jour de cette politique',
    content: `Cette politique de cookies peut être mise à jour pour refléter les changements dans nos pratiques ou les exigences légales. La date de dernière mise à jour est indiquée en haut de cette page. Nous vous informerons de tout changement significatif via une notification sur la plateforme.`,
  },
];

export default function CookiesPage() {
  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pb: 10 }}>
      <Box sx={{ bgcolor: BG, pt: 5, pb: 8 }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: `${ORANGE}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cookie sx={{ color: ORANGE, fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={900} color="white" lineHeight={1.1}>Politique de Cookies</Typography>
              <Typography fontSize={13} color="rgba(255,255,255,0.45)" mt={0.5}>Dernière mise à jour : Janvier 2026</Typography>
            </Box>
          </Box>
          <Typography color="rgba(255,255,255,0.55)" fontSize={15} lineHeight={1.8}>
            DealPam utilise des cookies et technologies similaires pour vous offrir la meilleure expérience possible sur notre marketplace.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ mt: -4 }}>
        {/* Cookie types grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
          {COOKIE_TYPES.map((ct) => (
            <Box key={ct.name} sx={{ bgcolor: 'white', borderRadius: '16px', p: 3, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography fontWeight={800} fontSize={15} color="#0F172A">{ct.name}</Typography>
                <Chip label={ct.badge} size="small" sx={{ bgcolor: `${ct.badgeColor}18`, color: ct.badgeColor, fontWeight: 700, fontSize: 10, height: 20, border: `1px solid ${ct.badgeColor}30` }} />
              </Box>
              <Typography fontSize={13} color="#64748B" lineHeight={1.7} mb={2}>{ct.description}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 1.5 }}>
                {ct.examples.map(ex => (
                  <Box key={ex} sx={{ px: 1, py: 0.3, bgcolor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <Typography fontSize={11} color="#64748B">{ex}</Typography>
                  </Box>
                ))}
              </Box>
              <Typography fontSize={11.5} color="#64748B">Durée : {ct.duration}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ bgcolor: 'white', borderRadius: '20px', boxShadow: '0 4px 32px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {SECTIONS.map((s, i) => (
            <Box key={i}>
              <Box sx={{ px: { xs: 3, md: 5 }, py: 4 }}>
                <Typography fontSize={17} fontWeight={800} color="#0F172A" mb={2}>{s.title}</Typography>
                <Typography fontSize={14.5} color="#475569" lineHeight={1.9} sx={{ whiteSpace: 'pre-line' }}>{s.content}</Typography>
              </Box>
              {i < SECTIONS.length - 1 && <Divider sx={{ borderColor: '#F1F5F9' }} />}
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 4, p: 3, bgcolor: `${ORANGE}0D`, border: `1px solid ${ORANGE}22`, borderRadius: '16px' }}>
          <Typography fontSize={13.5} color="#64748B">
            Consultez aussi notre{' '}
            <Box component={Link} to="/privacy" sx={{ color: ORANGE, textDecoration: 'none', fontWeight: 600 }}>Politique de Confidentialité</Box>.
            Pour toute question : <strong>privacy@dealpam.com</strong>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
