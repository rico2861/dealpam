import { useState } from 'react';
import { Box, Container, Typography, IconButton, TextField, Button, alpha, Divider } from '@mui/material';
import { useAuthStore } from '../../store/auth.store';
import api from '../../api/axios';
import { Link } from 'react-router-dom';
import {
  Facebook, Instagram, Twitter, YouTube,
  LocationOn, Phone, Email,
  Verified, Handshake, StorefrontOutlined, SupportAgent,
  ArrowForward, CheckCircle,
} from '@mui/icons-material';

const ORANGE   = '#FF6B00';
const ORANGE_D = '#E05A00';
const BG       = '#0B1120';
const BG2      = '#111827';
const BORDER   = 'rgba(255,255,255,0.07)';

const TRUST = [
  { icon: Verified,           title: 'Vendeurs vérifiés',   sub: 'Profils certifiés par DealPam',    color: '#FF6B00' },
  { icon: Handshake,          title: 'Mise en relation',    sub: 'Contact direct acheteur-vendeur',  color: '#FF6B00' },
  { icon: StorefrontOutlined, title: '100% haïtien',        sub: 'Produits et boutiques locaux',     color: '#FF6B00' },
  { icon: SupportAgent,       title: 'Support 7j/7',        sub: 'Aide acheteurs et vendeurs',       color: '#FF6B00' },
];

const PAYMENT_METHODS = [
  { name: 'MonCash',    color: '#E8A000', bg: '#2D2100' },
  { name: 'NatCash',    color: '#60A5FA', bg: '#1B2440' },
  { name: 'Visa',       color: '#FFFFFF', bg: '#1A1F71' },
  { name: 'MasterCard', color: '#FF5F00', bg: '#2D1100' },
  { name: 'Cash',       color: '#34D399', bg: '#0E2D1E' },
];

const SOCIALS = [
  { icon: Facebook,  color: '#1877F2', href: '#' },
  { icon: Instagram, color: '#E1306C', href: '#' },
  { icon: Twitter,   color: '#1DA1F2', href: '#' },
  { icon: YouTube,   color: '#FF0000', href: '#' },
];

const LINKS_ACHETER = [
  { label: 'Tous les produits',  to: '/products' },
  { label: 'Catégories',         to: '/categories' },
  { label: 'Boutiques',          to: '/stores' },
  { label: 'Ventes Flash',       to: '/ventes-flash' },
  { label: 'Nouveautés',         to: '/products?sort=latest' },
];

const LINKS_VENDRE_GUEST = [
  { label: 'Vendre sur DealPam', to: '/register?role=SELLER' },
  { label: 'Comment ça marche',  to: '/support' },
];

const LINKS_VENDRE_SELLER = [
  { label: 'Mon espace vendeur', to: '/seller' },
  { label: 'Mes produits',       to: '/seller/products' },
  { label: 'Mes commandes',      to: '/seller/orders' },
  { label: 'Publicités',         to: '/seller/ads' },
  { label: 'Support',            to: '/support' },
];

const LINKS_LEGAL = [
  { label: 'Confidentialité',  to: '/privacy' },
  { label: 'CGU',              to: '/terms' },
  { label: 'Cookies',          to: '/cookies' },
  { label: 'Mentions légales', to: '/legal' },
];

export default function Footer() {
  const { user } = useAuthStore();
  const isSeller = user?.role === 'SELLER';
  const linksVendre = isSeller ? LINKS_VENDRE_SELLER : user
    ? [{ label: 'Vendre sur DealPam', to: '/become-seller' }, ...LINKS_VENDRE_GUEST.slice(1)]
    : LINKS_VENDRE_GUEST;

  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');

  const handleSubscribe = async () => {
    if (!email.includes('@')) { setSubError('Email invalide'); return; }
    setSubLoading(true);
    setSubError('');
    try {
      await api.post('/newsletter/subscribe', { email });
      setSubscribed(true);
      setEmail('');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      if (msg?.includes('déjà inscrit')) { setSubscribed(true); }
      else setSubError(msg || 'Une erreur est survenue');
    } finally {
      setSubLoading(false);
    }
  };

  return (
    <Box component="footer" sx={{ bgcolor: BG, color: 'white', mt: 'auto' }}>

      {/* ── Trust strip ───────────────────────────────────────────── */}
      <Box sx={{ bgcolor: BG2, borderBottom: `1px solid ${BORDER}` }}>
        <Container maxWidth="lg">
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          }}>
            {TRUST.map(({ icon: Icon, title, sub, color }, i) => (
              <Box key={i} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                py: 2.5, px: { xs: 2, md: 3 },
                borderRight: { xs: i % 2 === 0 ? `1px solid ${BORDER}` : 'none', lg: i < 3 ? `1px solid ${BORDER}` : 'none' },
                borderBottom: { xs: i < 2 ? `1px solid ${BORDER}` : 'none', lg: 'none' },
              }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${alpha(color, 0.2)}` }}>
                  <Icon sx={{ fontSize: 19, color }} />
                </Box>
                <Box>
                  <Typography fontSize={{ xs: 12.5, md: 13 }} fontWeight={700} color="white" lineHeight={1.3}>{title}</Typography>
                  <Typography fontSize={{ xs: 11, md: 11.5 }} color="rgba(255,255,255,0.38)" lineHeight={1.3}>{sub}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── Main footer ───────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ pt: { xs: 5, md: 7 }, pb: { xs: 4, md: 6 } }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr 1.6fr' },
          gap: { xs: 5, md: 4 },
        }}>

          {/* Brand column */}
          <Box>
            {/* Logo */}
            <Box component={Link} to="/home" sx={{ textDecoration: 'none', display: 'inline-block', mb: 1.5 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 30, letterSpacing: '-1px', lineHeight: 1, color: 'white' }}>
                Deal<span style={{ color: ORANGE }}>Pam</span>
              </Typography>
              <Typography fontSize={11.5} color="rgba(255,255,255,0.3)" letterSpacing={0.4} mt={0.3}>
                La marketplace haïtienne
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.9, maxWidth: 310, mb: 3.5, fontSize: 13.5 }}>
              La plateforme e-commerce moderne d'Haïti. Achetez et vendez en toute confiance avec les meilleurs vendeurs du pays.
            </Typography>

            {/* Newsletter */}
            <Typography fontSize={11} fontWeight={700} color="rgba(255,255,255,0.6)" mb={1.2} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Newsletter
            </Typography>
            {subscribed ? (
              <Box sx={{ mb: 3.5 }}>
                <Box sx={{
                  display: 'flex', flexDirection: 'column', gap: 0.6,
                  px: 2, py: 1.6, borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(255,107,0,0.12) 0%, rgba(255,107,0,0.04) 100%)',
                  border: `1px solid ${alpha(ORANGE, 0.25)}`,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ORANGE, flexShrink: 0 }} />
                    <Typography fontSize={13} fontWeight={700} color="white" letterSpacing={0.1}>
                      Vous êtes abonné
                    </Typography>
                  </Box>
                  <Typography fontSize={11.5} color="rgba(255,255,255,0.4)" lineHeight={1.5}>
                    Vérifiez votre boîte mail pour confirmer.
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ mb: 3.5 }}>
                <Box sx={{ display: 'flex', gap: 0.8 }}>
                  <TextField
                    size="small"
                    placeholder="Votre email..."
                    value={email}
                    onChange={e => { setEmail(e.target.value); setSubError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
                    error={!!subError}
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '10px',
                        '& fieldset': { borderColor: subError ? '#EF4444' : BORDER },
                        '&:hover fieldset': { borderColor: subError ? '#EF4444' : 'rgba(255,255,255,0.2)' },
                        '&.Mui-focused fieldset': { borderColor: subError ? '#EF4444' : ORANGE },
                      },
                      '& input': { color: 'white', fontSize: 13, py: '9px' },
                      '& input::placeholder': { color: 'rgba(255,255,255,0.3)', opacity: 1 },
                    }}
                  />
                  <Button variant="contained" disableElevation onClick={handleSubscribe} disabled={subLoading} sx={{
                    bgcolor: ORANGE, color: 'white', borderRadius: '10px', fontWeight: 700, fontSize: 12.5, px: 2,
                    minWidth: 44, '&:hover': { bgcolor: ORANGE_D }, '&:disabled': { bgcolor: 'rgba(255,107,0,0.5)' }, flexShrink: 0,
                  }}>
                    <ArrowForward sx={{ fontSize: 17 }} />
                  </Button>
                </Box>
                {subError && (
                  <Typography fontSize={11.5} color="#F87171" mt={0.8}>{subError}</Typography>
                )}
              </Box>
            )}

            {/* Social */}
            <Box sx={{ display: 'flex', gap: 0.8, mt: subscribed ? 2 : 0 }}>
              {SOCIALS.map(({ icon: Icon, color, href }, i) => (
                <IconButton key={i} component="a" href={href} target="_blank" size="small" sx={{
                  bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)',
                  borderRadius: '10px', width: 36, height: 36, border: `1px solid ${BORDER}`,
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: color, color: 'white', borderColor: color, transform: 'translateY(-2px)', boxShadow: `0 4px 14px ${alpha(color, 0.45)}` },
                }}>
                  <Icon sx={{ fontSize: 17 }} />
                </IconButton>
              ))}
            </Box>
          </Box>

          {/* Acheter column */}
          <Box>
            <Typography fontSize={11} fontWeight={800} mb={2.5} sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Acheter
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {LINKS_ACHETER.map(({ label, to }) => (
                <Box key={to} component={Link} to={to} sx={{
                  fontSize: 13.5, color: 'rgba(255,255,255,0.42)', textDecoration: 'none',
                  transition: 'color 0.18s', '&:hover': { color: 'white' },
                  display: 'inline-flex', alignItems: 'center', gap: 0.5,
                  '&:hover .arrow': { opacity: 1, transform: 'translateX(3px)' },
                }}>
                  {label}
                  <ArrowForward className="arrow" sx={{ fontSize: 12, opacity: 0, transition: 'all 0.18s', color: ORANGE }} />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Vendre column */}
          <Box>
            <Typography fontSize={11} fontWeight={800} mb={2.5} sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Vendre
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {linksVendre.map(({ label, to }) => (
                <Box key={label} component={Link} to={to} sx={{
                  fontSize: 13.5, color: 'rgba(255,255,255,0.42)', textDecoration: 'none',
                  transition: 'color 0.18s', '&:hover': { color: 'white' },
                  display: 'inline-flex', alignItems: 'center', gap: 0.5,
                  '&:hover .arrow': { opacity: 1, transform: 'translateX(3px)' },
                }}>
                  {label}
                  <ArrowForward className="arrow" sx={{ fontSize: 12, opacity: 0, transition: 'all 0.18s', color: ORANGE }} />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Contact + Paiements */}
          <Box>
            <Typography fontSize={11} fontWeight={800} mb={2.5} sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Contact
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8, mb: 3.5 }}>
              {[
                { icon: LocationOn, text: 'Port-au-Prince, Haïti' },
                { icon: Phone,      text: '+509 34 54 6896' },
                { icon: Email,      text: 'support@dealpam.com' },
              ].map(({ icon: Icon, text }, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon sx={{ fontSize: 14, color: ORANGE }} />
                  </Box>
                  <Typography fontSize={13.5} color="rgba(255,255,255,0.45)">{text}</Typography>
                </Box>
              ))}
            </Box>

            <Typography fontSize={10.5} fontWeight={700} color="rgba(255,255,255,0.35)" mb={1.4} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Paiements acceptés
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap' }}>
              {PAYMENT_METHODS.map(({ name, color, bg }) => (
                <Box key={name} sx={{
                  px: 1.4, py: 0.5, borderRadius: '8px',
                  border: `1px solid ${alpha(color, 0.25)}`,
                  bgcolor: bg,
                }}>
                  <Typography fontSize={11} fontWeight={700} sx={{ color }}>{name}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>

      {/* ── Bottom bar ────────────────────────────────────────────── */}
      <Box sx={{ borderTop: `1px solid ${BORDER}` }}>
        <Container maxWidth="lg">
          <Box sx={{
            py: { xs: 2.5, md: 3 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}>
            <Typography fontSize={12.5} sx={{ color: 'rgba(255,255,255,0.25)' }}>
              © {new Date().getFullYear()} DealPam. Tous droits réservés.
            </Typography>

            <Box sx={{ display: 'flex', gap: { xs: 2.5, md: 3.5 }, flexWrap: 'wrap' }}>
              {LINKS_LEGAL.map(({ label, to }) => (
                <Box key={to} component={Link} to={to} sx={{
                  fontSize: 12.5, color: 'rgba(255,255,255,0.28)', textDecoration: 'none',
                  transition: 'color 0.18s', '&:hover': { color: 'rgba(255,255,255,0.72)' },
                }}>
                  {label}
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
