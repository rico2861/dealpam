import { Box, Container, Typography, Divider } from '@mui/material';
import { Business } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const ORANGE = '#FF6B00';
const BG = '#0F172A';

const SECTIONS = [
  {
    title: 'Éditeur de la plateforme',
    content: `Nom de la société : DealPam S.A.
Forme juridique : Société Anonyme
Siège social : Port-au-Prince, République d'Haïti
Numéro d'enregistrement : [En cours d'enregistrement]
Capital social : [Information confidentielle]
Directeur de la publication : Direction Générale DealPam

E-mail de contact : contact@dealpam.com
Téléphone : +509 34 54 6896`,
  },
  {
    title: 'Hébergement',
    content: `La plateforme DealPam est hébergée sur des serveurs cloud sécurisés. Les données des utilisateurs haïtiens sont traitées conformément aux meilleures pratiques internationales en matière de sécurité informatique.

Pour des raisons de sécurité, nous ne communiquons pas publiquement les détails de notre infrastructure d'hébergement. Les informations relatives à l'hébergement sont disponibles sur demande auprès de notre service juridique.`,
  },
  {
    title: 'Activité et objet social',
    content: `DealPam est une marketplace en ligne spécialisée dans la mise en relation d'acheteurs et de vendeurs en République d'Haïti. La plateforme permet à des particuliers et des professionnels de vendre et d'acheter des produits dans diverses catégories : mode, électronique, maison, beauté, alimentation, services et bien plus.

DealPam agit exclusivement en tant qu'intermédiaire entre acheteurs et vendeurs. Les transactions s'effectuent directement entre les parties, DealPam n'étant pas propriétaire des produits mis en vente sur la plateforme.`,
  },
  {
    title: 'Propriété intellectuelle',
    content: `L'ensemble des éléments constituant la plateforme DealPam — notamment le nom commercial, le logo, la charte graphique, les textes, les images, les icônes, les logiciels et le code source — sont la propriété exclusive de DealPam S.A. et sont protégés par le droit haïtien et les conventions internationales applicables en matière de propriété intellectuelle.

Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments de la plateforme, quel que soit le moyen ou le procédé utilisé, est interdite sauf autorisation préalable et écrite de DealPam S.A.`,
  },
  {
    title: 'Limitation de responsabilité',
    content: `DealPam met tout en œuvre pour assurer la disponibilité et la fiabilité de sa plateforme. Cependant, DealPam ne saurait être tenu responsable :

• Des interruptions de service liées à des opérations de maintenance ou des événements de force majeure
• Du contenu publié par les vendeurs tiers (descriptions, photos, prix)
• De la qualité des produits vendus par des vendeurs indépendants
• Des retards de livraison imputables aux transporteurs ou à des événements extérieurs
• Des dommages indirects résultant de l'utilisation ou de l'impossibilité d'utilisation de la plateforme

Les vendeurs sont seuls responsables de l'exactitude des informations relatives à leurs produits et du respect de la législation applicable à leur activité.`,
  },
  {
    title: 'Données personnelles et cookies',
    content: `DealPam accorde une importance particulière à la protection de vos données personnelles. Le traitement de vos données est effectué conformément à notre Politique de Confidentialité et notre Politique de Cookies, accessibles depuis le pied de page de la plateforme.

Pour toute question relative à vos données personnelles, vous pouvez contacter notre équipe à privacy@dealpam.com`,
  },
  {
    title: 'Règlement des litiges',
    content: `En cas de litige relatif à l'utilisation de la plateforme DealPam, nous vous invitons à contacter notre service client en premier lieu à support@dealpam.com afin de trouver une solution amiable.

À défaut de résolution amiable dans un délai de 30 jours, tout litige relatif à l'utilisation de la plateforme sera soumis à la juridiction des tribunaux compétents de Port-au-Prince, République d'Haïti.

Les présentes mentions légales sont régies par le droit haïtien.`,
  },
  {
    title: 'Contact',
    content: `Pour toute question relative aux présentes mentions légales :

Service juridique DealPam
Port-au-Prince, Haïti
E-mail : legal@dealpam.com
Téléphone : +509 34 54 6896
Horaires : Lundi – Vendredi, 8h00 – 17h00 (heure de Port-au-Prince)`,
  },
];

export default function LegalPage() {
  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pb: 10 }}>
      <Box sx={{ bgcolor: BG, pt: 5, pb: 8 }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: `${ORANGE}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Business sx={{ color: ORANGE, fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={900} color="white" lineHeight={1.1}>Mentions Légales</Typography>
              <Typography fontSize={13} color="rgba(255,255,255,0.45)" mt={0.5}>Dernière mise à jour : Janvier 2026</Typography>
            </Box>
          </Box>
          <Typography color="rgba(255,255,255,0.55)" fontSize={15} lineHeight={1.8}>
            Informations légales relatives à la plateforme DealPam — La marketplace haïtienne.
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
            Consultez aussi nos{' '}
            <Box component={Link} to="/terms" sx={{ color: ORANGE, textDecoration: 'none', fontWeight: 600 }}>CGU</Box>
            {' '}et notre{' '}
            <Box component={Link} to="/privacy" sx={{ color: ORANGE, textDecoration: 'none', fontWeight: 600 }}>Politique de Confidentialité</Box>.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
