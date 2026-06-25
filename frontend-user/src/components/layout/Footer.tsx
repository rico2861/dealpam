import { Box, Container, Grid, Typography, IconButton, Divider, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, LocationOn, Phone, Email } from '@mui/icons-material';

const Logo = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
    <Typography sx={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.5px', lineHeight: 1, color: 'white' }}>
      Deal<span style={{ color: '#FF9900' }}>Pam</span>
    </Typography>
    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.3, lineHeight: 1, alignSelf: 'flex-end', pb: 0.3 }}>
      .com
    </Typography>
  </Box>
);

export default function Footer() {
  return (
    <Box sx={{ bgcolor: '#0F172A', color: 'white', pt: 6, pb: 3, mt: 'auto' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Logo />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, maxWidth: 280 }}>
              La plateforme e-commerce moderne d'Haïti. Achetez et vendez en toute confiance avec les meilleurs vendeurs du pays.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 2.5 }}>
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <IconButton key={i} size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', borderRadius: 2,
                    '&:hover': { bgcolor: 'primary.main', color: 'white', transform: 'translateY(-2px)', transition: 'all 0.2s' } }}>
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Box>
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle2" fontWeight={700} mb={2} sx={{ color: 'rgba(255,255,255,0.9)' }}>Acheter</Typography>
            <Stack spacing={1.2}>
              {[['Tous les produits', '/products'], ['Catégories', '/categories'], ['Boutiques', '/stores'], ['Promotions', '/products?promo=true']].map(([label, to]) => (
                <Typography key={label} component={Link} to={to} variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s', '&:hover': { color: 'white' } }}>
                  {label}
                </Typography>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle2" fontWeight={700} mb={2} sx={{ color: 'rgba(255,255,255,0.9)' }}>Vendre</Typography>
            <Stack spacing={1.2}>
              {[["Créer un compte", '/register?role=SELLER'], ['Abonnements', '/seller/subscription'], ['Mon espace', '/seller'], ['Support', '/support']].map(([label, to]) => (
                <Typography key={label} component={Link} to={to} variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s', '&:hover': { color: 'white' } }}>
                  {label}
                </Typography>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} sm={4} md={4}>
            <Typography variant="subtitle2" fontWeight={700} mb={2} sx={{ color: 'rgba(255,255,255,0.9)' }}>Contact</Typography>
            <Stack spacing={1.5}>
              {[
                [LocationOn, 'Port-au-Prince, Haïti'],
                [Phone, '+509 XXXX-XXXX'],
                [Email, 'support@dealpam.com'],
              ].map(([Icon, text], i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon fontSize="small" sx={{ color: 'primary.light', flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>{text as string}</Typography>
                </Box>
              ))}
            </Stack>
            <Box sx={{ mt: 2.5 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mb: 1 }}>Paiements acceptés</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['MonCash', 'NatCash', 'Visa', 'MasterCard'].map((p) => (
                  <Box key={p} sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.12)', bgcolor: 'rgba(255,255,255,0.05)' }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: 10 }}>{p}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 3 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
            © {new Date().getFullYear()} Dealpam. Tous droits réservés.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            {['Confidentialité', 'CGU', 'Cookies'].map((t) => (
              <Typography key={t} variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer', '&:hover': { color: 'white' }, transition: 'color 0.2s' }}>{t}</Typography>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
