import { Box, Container, Typography, Divider } from '@mui/material';
import { Gavel } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const ORANGE = '#FF6B00';
const BG = '#0F172A';

const SECTIONS = [
  {
    title: '1. Présentation de la plateforme',
    content: `DealPam est une marketplace en ligne opérant en République d'Haïti, permettant à des vendeurs professionnels et particuliers de proposer des produits à la vente, et à des acheteurs de les acquérir en toute sécurité.

La plateforme est accessible à l'adresse www.dealpam.com et via l'application mobile DealPam. L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes Conditions Générales d'Utilisation (CGU).`,
  },
  {
    title: '2. Inscription et compte utilisateur',
    content: `Pour accéder aux fonctionnalités complètes de DealPam, vous devez créer un compte en fournissant des informations exactes et à jour. Vous êtes responsable de la confidentialité de vos identifiants de connexion.

DealPam se réserve le droit de suspendre ou supprimer tout compte en cas de :
• Fourniture d'informations fausses ou trompeuses
• Comportement frauduleux ou abusif
• Non-respect des présentes CGU
• Inactivité prolongée (plus de 2 ans)

Vous pouvez supprimer votre compte à tout moment depuis les paramètres de votre profil.`,
  },
  {
    title: "3. Conditions d'achat",
    content: `En passant une commande sur DealPam, vous vous engagez à :
• Être majeur ou avoir l'autorisation d'un représentant légal
• Disposer des moyens de paiement nécessaires
• Fournir une adresse de livraison valide en Haïti

Toute commande validée constitue un contrat de vente entre l'acheteur et le vendeur. DealPam agit en tant qu'intermédiaire et n'est pas partie à ce contrat.

Les prix affichés sont en Gourdes Haïtiennes (HTG) et incluent toutes les taxes applicables. Les frais de livraison sont indiqués séparément avant la validation de la commande.`,
  },
  {
    title: '4. Conditions pour les vendeurs',
    content: `Pour vendre sur DealPam, vous devez :
• Créer un compte vendeur et souscrire à un abonnement actif
• Fournir des informations exactes sur vos produits (description, photos, prix)
• Respecter les délais de traitement et d'expédition annoncés
• Disposer des droits nécessaires pour vendre les produits proposés

Les vendeurs sont entièrement responsables du contenu de leurs annonces, de la qualité des produits vendus et du respect de la législation haïtienne applicable (douanes, fiscalité, normes de sécurité).

DealPam prélève une commission sur chaque vente réalisée, dont le taux est défini dans les conditions d'abonnement.`,
  },
  {
    title: '5. Paiements et sécurité',
    content: `DealPam accepte les moyens de paiement suivants : MonCash, NatCash, Visa, MasterCard et paiement en espèces (Cash DealPam pour les retraits en point relais).

Tous les paiements électroniques sont sécurisés par chiffrement SSL 256 bits. DealPam ne stocke jamais vos données bancaires complètes.

En cas de litige de paiement, notre service client traite les réclamations dans un délai de 5 jours ouvrés.`,
  },
  {
    title: '6. Livraison et retours',
    content: `Les délais et frais de livraison varient selon le vendeur et la zone géographique. DealPam propose des livraisons dans tous les départements d'Haïti.

Politique de retour : vous disposez de 7 jours à compter de la réception de votre commande pour signaler tout produit non conforme ou défectueux. Les retours sont gérés directement entre l'acheteur et le vendeur, avec l'assistance de DealPam en cas de litige.`,
  },
  {
    title: '7. Propriété intellectuelle',
    content: `L'ensemble des contenus présents sur DealPam (logo, textes, images, interface, code source) est protégé par le droit de la propriété intellectuelle et appartient à DealPam ou à ses partenaires.

Les vendeurs accordent à DealPam une licence non exclusive pour afficher leurs contenus (photos, descriptions) sur la plateforme aux fins de promotion et de vente.

Toute reproduction, distribution ou utilisation des contenus DealPam sans autorisation préalable écrite est strictement interdite.`,
  },
  {
    title: '8. Limitation de responsabilité',
    content: `DealPam s'efforce d'assurer la disponibilité permanente de la plateforme mais ne peut garantir une disponibilité sans interruption. La plateforme peut être temporairement indisponible pour des raisons de maintenance ou en cas de force majeure.

DealPam n'est pas responsable des dommages indirects découlant de l'utilisation de la plateforme, ni de la qualité des produits vendus par les vendeurs tiers.`,
  },
  {
    title: '9. Modification des CGU',
    content: `DealPam se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs sont informés par e-mail et/ou notification sur la plateforme au moins 15 jours avant l'entrée en vigueur des modifications.

La poursuite de l'utilisation de la plateforme après cette période vaut acceptation des nouvelles CGU.`,
  },
  {
    title: '10. Droit applicable et juridiction',
    content: `Les présentes CGU sont soumises au droit haïtien. En cas de litige, une solution amiable sera recherchée en priorité. À défaut, les tribunaux compétents de Port-au-Prince, Haïti, seront seuls compétents.

Pour toute question, contactez notre service juridique à legal@dealpam.com`,
  },
];

export default function TermsPage() {
  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pb: 10 }}>
      <Box sx={{ bgcolor: BG, pt: 5, pb: 8 }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: `${ORANGE}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gavel sx={{ color: ORANGE, fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={900} color="white" lineHeight={1.1}>Conditions Générales d'Utilisation</Typography>
              <Typography fontSize={13} color="rgba(255,255,255,0.45)" mt={0.5}>Dernière mise à jour : Janvier 2026</Typography>
            </Box>
          </Box>
          <Typography color="rgba(255,255,255,0.55)" fontSize={15} lineHeight={1.8}>
            En utilisant la plateforme DealPam, vous acceptez les présentes conditions générales. Veuillez les lire attentivement.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ mt: -4 }}>
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
            <Box component={Link} to="/privacy" sx={{ color: ORANGE, textDecoration: 'none', fontWeight: 600 }}>Politique de Confidentialité</Box>
            {' '}et nos{' '}
            <Box component={Link} to="/legal" sx={{ color: ORANGE, textDecoration: 'none', fontWeight: 600 }}>Mentions Légales</Box>.
            Des questions ? Écrivez-nous à <strong>legal@dealpam.com</strong>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
