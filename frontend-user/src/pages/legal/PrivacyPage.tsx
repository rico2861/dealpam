import { Box, Container, Typography, Divider } from '@mui/material';
import { Shield } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const ORANGE = '#FF6B00';
const BG = '#0F172A';

const SECTIONS = [
  {
    title: '1. Collecte des données',
    content: `DealPam collecte les informations que vous nous fournissez directement lors de la création de votre compte (nom, prénom, adresse e-mail, numéro de téléphone), lors de vos commandes (adresse de livraison, informations de paiement) et lors de votre utilisation de la plateforme (historique de navigation, recherches, interactions avec les produits).

Nous collectons également automatiquement certaines données techniques : adresse IP, type de navigateur, système d'exploitation, pages visitées, durée des sessions, données de localisation approximative (département/ville) si vous avez accordé cette permission.`,
  },
  {
    title: '2. Utilisation des données',
    content: `Vos données personnelles sont utilisées pour :
• Créer et gérer votre compte utilisateur
• Traiter vos commandes et gérer les paiements
• Vous envoyer des confirmations de commandes et notifications importantes
• Personnaliser votre expérience d'achat (recommandations, offres ciblées)
• Améliorer nos services et développer de nouvelles fonctionnalités
• Prévenir la fraude et assurer la sécurité de la plateforme
• Respecter nos obligations légales

Avec votre consentement explicite, nous pouvons utiliser vos données pour vous envoyer des communications marketing et promotionnelles.`,
  },
  {
    title: '3. Partage des données',
    content: `DealPam ne vend jamais vos données personnelles à des tiers. Nous partageons uniquement les informations nécessaires avec :

• Les vendeurs DealPam : pour traiter vos commandes (nom, adresse de livraison, numéro de contact)
• Nos prestataires de paiement (MonCash, NatCash, Visa/MasterCard) : pour sécuriser les transactions
• Nos prestataires logistiques : pour assurer la livraison de vos achats
• Les autorités compétentes : si la loi l'exige ou pour protéger nos droits légaux`,
  },
  {
    title: '4. Conservation des données',
    content: `Vos données personnelles sont conservées pendant toute la durée de votre relation avec DealPam et jusqu'à 5 ans après la clôture de votre compte, conformément aux obligations légales en vigueur en République d'Haïti.

Les données de transaction sont conservées 10 ans à des fins comptables et fiscales. Les données de navigation sont supprimées après 13 mois.`,
  },
  {
    title: '5. Sécurité',
    content: `DealPam met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre l'accès non autorisé, la modification, la divulgation ou la destruction. Nous utilisons le chiffrement SSL/TLS 256 bits pour toutes les transmissions de données sensibles.

Malgré ces mesures, aucun système n'est infaillible. En cas de violation de données susceptible d'affecter vos droits, nous vous en informerons dans les meilleurs délais.`,
  },
  {
    title: '6. Vos droits',
    content: `Conformément à la législation applicable, vous disposez des droits suivants sur vos données personnelles :
• Droit d'accès : obtenir une copie de vos données
• Droit de rectification : corriger des données inexactes
• Droit à l'effacement : demander la suppression de vos données
• Droit à la portabilité : recevoir vos données dans un format lisible
• Droit d'opposition : vous opposer au traitement de vos données à des fins marketing

Pour exercer ces droits, contactez-nous à privacy@dealpam.com ou via notre formulaire de contact.`,
  },
  {
    title: '7. Cookies',
    content: `DealPam utilise des cookies pour améliorer votre expérience. Pour en savoir plus sur notre utilisation des cookies, consultez notre Politique de Cookies. Vous pouvez gérer vos préférences de cookies à tout moment dans les paramètres de votre navigateur.`,
  },
  {
    title: '8. Contact',
    content: `Pour toute question relative à la protection de vos données personnelles, contactez notre Délégué à la Protection des Données :

DealPam – Service Privacy
Port-au-Prince, Haïti
E-mail : privacy@dealpam.com
Téléphone : +509 XXXX-XXXX`,
  },
];

export default function PrivacyPage() {
  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pb: 10 }}>
      <Box sx={{ bgcolor: BG, pt: 5, pb: 8 }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: `${ORANGE}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield sx={{ color: ORANGE, fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={900} color="white" lineHeight={1.1}>Politique de Confidentialité</Typography>
              <Typography fontSize={13} color="rgba(255,255,255,0.45)" mt={0.5}>Dernière mise à jour : Janvier 2026</Typography>
            </Box>
          </Box>
          <Typography color="rgba(255,255,255,0.55)" fontSize={15} lineHeight={1.8}>
            Chez DealPam, nous accordons une importance capitale à la protection de vos données personnelles. Cette politique explique comment nous collectons, utilisons et protégeons vos informations.
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

        <Box sx={{ mt: 4, p: 3, bgcolor: `${ORANGE}0D`, border: `1px solid ${ORANGE}22`, borderRadius: '16px', display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Shield sx={{ color: ORANGE, fontSize: 20, mt: 0.2, flexShrink: 0 }} />
          <Box>
            <Typography fontSize={14} fontWeight={700} color="#0F172A" mb={0.5}>Des questions sur vos données ?</Typography>
            <Typography fontSize={13.5} color="#64748B">
              Consultez aussi notre{' '}
              <Box component={Link} to="/cookies" sx={{ color: ORANGE, textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>Politique de Cookies</Box>
              {' '}et nos{' '}
              <Box component={Link} to="/terms" sx={{ color: ORANGE, textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>CGU</Box>.
              Contactez-nous à <strong>privacy@dealpam.com</strong>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
