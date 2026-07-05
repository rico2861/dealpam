import { Box, Container, Typography, Grid, alpha } from '@mui/material';
import {
  Email, Phone, LocationOn, WhatsApp,
  ShoppingBag, Store, HelpOutline, Payment,
} from '@mui/icons-material';

const ORANGE = '#FF6B00';
const BG = '#0F172A';

const TOPICS = [
  { icon: ShoppingBag, title: 'Commandes & Livraison', desc: 'Suivi, retours, délais de livraison', color: '#60A5FA' },
  { icon: Payment,     title: 'Paiements',             desc: 'MonCash, NatCash, Visa, problèmes', color: '#34D399' },
  { icon: Store,       title: 'Espace Vendeur',         desc: 'Compte, abonnement, produits, stats', color: '#FBBF24' },
  { icon: HelpOutline, title: 'Aide générale',          desc: 'Compte, sécurité, questions diverses', color: '#F472B6' },
];

export default function SupportPage() {
  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pb: 10 }}>
      <Box sx={{ bgcolor: BG, pt: 5, pb: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={900} color="white" mb={1.5}>
            Centre d'assistance DealPam
          </Typography>
          <Typography color="rgba(255,255,255,0.5)" fontSize={15}>
            Notre équipe est disponible 7j/7 pour vous aider.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ mt: -4 }}>
        {/* Topics */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {TOPICS.map(({ icon: Icon, title, desc, color }) => (
            <Grid item xs={6} sm={3} key={title}>
              <Box sx={{ bgcolor: 'white', borderRadius: '16px', p: 2.5, textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0', cursor: 'default', transition: 'all 0.2s', '&:hover': { boxShadow: '0 6px 24px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' } }}>
                <Box sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5, border: `1px solid ${alpha(color, 0.2)}` }}>
                  <Icon sx={{ fontSize: 24, color }} />
                </Box>
                <Typography fontWeight={700} fontSize={13} color="#0F172A" lineHeight={1.3} mb={0.5}>{title}</Typography>
                <Typography fontSize={11.5} color="#94A3B8" lineHeight={1.4}>{desc}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Contact channels */}
        <Box sx={{ bgcolor: 'white', borderRadius: '20px', boxShadow: '0 4px 32px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <Box sx={{ px: { xs: 3, md: 5 }, pt: 4, pb: 2 }}>
            <Typography fontSize={18} fontWeight={800} color="#0F172A" mb={0.5}>Contactez-nous</Typography>
            <Typography fontSize={14} color="#64748B">Choisissez le canal qui vous convient le mieux.</Typography>
          </Box>

          {[
            { icon: WhatsApp, color: '#25D366', bg: '#F0FDF4', title: 'WhatsApp', value: '+509 XXXX-XXXX', sub: 'Réponse rapide · Lun–Sam 8h–20h', href: 'https://wa.me/509XXXXXXXX' },
            { icon: Email,    color: ORANGE,    bg: '#FFF7ED', title: 'Email',    value: 'support@dealpam.com', sub: 'Réponse sous 24h', href: 'mailto:support@dealpam.com' },
            { icon: Phone,    color: '#6366F1', bg: '#F5F3FF', title: 'Téléphone', value: '+509 XXXX-XXXX', sub: 'Lun–Ven 8h–17h', href: 'tel:+509XXXXXXXX' },
            { icon: LocationOn, color: '#64748B', bg: '#F8FAFC', title: 'Adresse', value: 'Port-au-Prince, Haïti', sub: 'Siège social DealPam', href: '#' },
          ].map(({ icon: Icon, color, bg, title, value, sub, href }, i, arr) => (
            <Box key={title} component="a" href={href} sx={{
              display: 'flex', alignItems: 'center', gap: 2, px: { xs: 3, md: 5 }, py: 2.5,
              textDecoration: 'none', borderTop: '1px solid #F1F5F9',
              transition: 'background 0.15s', '&:hover': { bgcolor: '#F8FAFC' },
            }}>
              <Box sx={{ width: 46, height: 46, borderRadius: '13px', bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon sx={{ fontSize: 22, color }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontSize={11.5} color="#94A3B8" mb={0.2}>{title}</Typography>
                <Typography fontSize={14} fontWeight={700} color="#0F172A">{value}</Typography>
                <Typography fontSize={12} color="#94A3B8">{sub}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 3, p: 3, bgcolor: alpha(ORANGE, 0.06), border: `1px solid ${alpha(ORANGE, 0.18)}`, borderRadius: '16px', textAlign: 'center' }}>
          <Typography fontSize={14} color="#475569">
            Vous êtes vendeur ? Contactez le support dédié à <strong style={{ color: ORANGE }}>sellers@dealpam.com</strong>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
