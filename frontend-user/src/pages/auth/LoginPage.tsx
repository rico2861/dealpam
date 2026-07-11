import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  InputAdornment, IconButton, Checkbox, FormControlLabel, alpha, Chip,
} from '@mui/material';
import {
  Visibility, VisibilityOff, LockOutlined, AlternateEmail, Person,
  ArrowForward, ShieldOutlined, VerifiedOutlined, SupportAgentOutlined,
  LocalShippingOutlined, StarOutlined,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

const ORANGE = '#FF6B00';

function detectType(v: string) { return v.includes('@') ? 'email' : v ? 'username' : null; }

// Codes courts échangés via ?reason= — jamais de texte brut dans l'URL,
// le libellé humain est résolu ici uniquement pour l'affichage.
const LOGOUT_REASON_LABELS: Record<string, string> = {
  session_expired: 'Votre session a expiré, veuillez vous reconnecter.',
};

const STATS = [
  { value: '5 000+', label: 'Vendeurs actifs' },
  { value: '50 000+', label: 'Produits listés' },
  { value: '100k+', label: 'Membres' },
];

const PERKS = [
  { icon: VerifiedOutlined,     text: 'Vendeurs vérifiés & produits authentiques' },
  { icon: LocalShippingOutlined, text: 'Livraison dans tout Haïti' },
  { icon: SupportAgentOutlined,  text: 'Support client 7j/7' },
  { icon: ShieldOutlined,        text: 'Paiements 100 % sécurisés' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/account';

  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);
  // Le backend (plan gratuit) se met en veille apres inactivite et peut mettre
  // 20-60s a redemarrer sur la premiere requete — sans indice, le bouton qui
  // tourne longtemps donne l'impression d'etre bloque/casse.
  const [slowServer, setSlowServer] = useState(false);
  const [error,      setError]      = useState('');
  const [errorType,  setErrorType]  = useState<'banned' | 'locked' | 'generic'>('generic');
  const [showPwd,    setShowPwd]    = useState(false);
  const [remember,   setRemember]   = useState(false);

  const idType = detectType(identifier);

  // Déconnexion silencieuse : on nettoie la trace de la raison sans l'afficher.
  useEffect(() => {
    sessionStorage.removeItem('logout_reason');
  }, []);

  // reason=<code> vient d'une déconnexion automatique (inactivité, session
  // expirée...) — on affiche un libellé humain dans l'UI puis on nettoie
  // l'URL tout de suite pour ne pas laisser de message brut dans la barre d'adresse.
  const [logoutBanner, setLogoutBanner] = useState('');
  useEffect(() => {
    const code = searchParams.get('reason');
    if (code) {
      setLogoutBanner(LOGOUT_REASON_LABELS[code] || '');
      navigate('/login', { replace: true });
    }
  }, []); // eslint-disable-line

  // Navigation after login is handled in handleSubmit.
  // Do NOT redirect based on user alone — tokens may be expired even if user is persisted.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSlowServer(false);
    const slowTimer = setTimeout(() => setSlowServer(true), 6000);
    try {
      const { data } = await api.post('/auth/login', { identifier, password, clientType: 'user' });
      setUser(data.user, data.accessToken, data.refreshToken);
      enqueueSnackbar(`Bienvenue, ${data.user.firstName} !`, { variant: 'success' });
      if (data.user.role === 'SELLER') navigate('/seller');
      else if (['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(data.user.role)) navigate('/admin');
      else navigate(nextPath, { replace: true });
    } catch (err: any) {
      const net = !err.response || err.code === 'ERR_NETWORK';
      if (net) { setError('Serveur inaccessible — vérifiez votre connexion'); setErrorType('generic'); }
      else {
        const msg: string = err.response?.data?.message || 'Email ou mot de passe incorrect';
        const isBanned  = /désactivé|banni|banned|suspended|suspendu|disabled/i.test(msg);
        const isLocked  = /bloqué|bloqu/i.test(msg) && !isBanned;
        setError(msg);
        setErrorType(isBanned ? 'banned' : isLocked ? 'locked' : 'generic');
      }
    } finally { clearTimeout(slowTimer); setSlowServer(false); setLoading(false); }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F7F8FA' }}>

      {/* ── LEFT — branding (hidden on mobile) ── */}
      <Box sx={{
        flex: 1, display: { xs: 'none', lg: 'flex' }, flexDirection: 'column',
        justifyContent: 'center', p: { lg: 7, xl: 10 },
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(155deg, #FFF4EB 0%, #FFF8F2 40%, #FDF3E7 100%)',
      }}>
        {/* Glows */}
        <Box sx={{ position: 'absolute', width: 700, height: 700, top: '-15%', left: '-15%', borderRadius: '50%', pointerEvents: 'none',
          background: `radial-gradient(circle, ${alpha(ORANGE, 0.1)} 0%, transparent 60%)` }} />
        <Box sx={{ position: 'absolute', width: 500, height: 500, bottom: '-10%', right: '-10%', borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 60%)' }} />
        {/* Grid */}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.035,
          backgroundImage: 'linear-gradient(rgba(15,23,42,1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,1) 1px, transparent 1px)',
          backgroundSize: '52px 52px' }} />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 440 }}>
          {/* Headline */}
          <Typography sx={{ fontWeight: 900, fontSize: { lg: 42, xl: 52 }, color: '#0F172A', lineHeight: 1.08, letterSpacing: '-2px', mb: 2.5 }}>
            Achetez & vendez<br />
            <Box component="span" sx={{ color: ORANGE }}>en toute confiance</Box>
          </Typography>
          <Typography sx={{ color: '#475569', fontSize: 16, lineHeight: 1.75, mb: 6 }}>
            La plateforme e-commerce numéro&nbsp;1 d'Haïti.
          </Typography>

          {/* Perks */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 7 }}>
            {PERKS.map(({ icon: Icon, text }) => (
              <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                  bgcolor: alpha(ORANGE, 0.12), border: `1px solid ${alpha(ORANGE, 0.2)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon sx={{ color: ORANGE, fontSize: 19 }} />
                </Box>
                <Typography sx={{ color: '#334155', fontSize: 14.5 }}>{text}</Typography>
              </Box>
            ))}
          </Box>

          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 0, borderTop: '1px solid rgba(15,23,42,0.09)', pt: 4 }}>
            {STATS.map(({ value, label }, i) => (
              <Box key={label} sx={{ flex: 1, pl: i > 0 ? 3 : 0, borderLeft: i > 0 ? '1px solid rgba(15,23,42,0.09)' : 'none', ml: i > 0 ? 3 : 0 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 22, color: '#0F172A', letterSpacing: '-0.5px' }}>{value}</Typography>
                <Typography sx={{ color: '#64748B', fontSize: 12, mt: 0.3 }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── RIGHT — form ── */}
      <Box sx={{
        width: { xs: '100%', lg: 480 }, flexShrink: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 3, sm: 6, lg: 6 }, py: { xs: 5, lg: 4 },
        bgcolor: '#FFFFFF',
        borderLeft: '1px solid rgba(15,23,42,0.09)',
        position: 'relative',
      }}>
        {/* Subtle top glow */}
        <Box sx={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px',
          background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)`, opacity: 0.6 }} />


        <Box sx={{ maxWidth: 380, width: '100%', mx: 'auto' }}>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: 26, sm: 30 }, color: '#0F172A', letterSpacing: '-0.8px', mb: 0.8 }}>
            Connexion
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#64748B', mb: 4 }}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{ color: ORANGE, fontWeight: 700, textDecoration: 'none' }}>Créer un compte →</Link>
          </Typography>

          {logoutBanner && (
            <Alert severity="info" onClose={() => setLogoutBanner('')}
              sx={{ mb: 3, borderRadius: '12px', bgcolor: 'rgba(59,130,246,0.08)', color: '#1D4ED8', border: '1px solid rgba(59,130,246,0.2)', fontSize: 13, '& .MuiAlert-icon': { color: '#3B82F6' } }}>
              {logoutBanner}
            </Alert>
          )}

          {error && errorType === 'banned' && (
            <Box sx={{ mb: 3, p: 2.5, borderRadius: '14px', bgcolor: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.35)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <LockOutlined sx={{ fontSize: 16, color: '#EF4444' }} />
                </Box>
                <Typography fontSize={14} fontWeight={800} color="#EF4444">Compte désactivé</Typography>
              </Box>
              <Typography fontSize={13} color="#475569" lineHeight={1.6} mb={1.5}>
                Votre compte a été désactivé par l'équipe DealPam. Vous ne pouvez plus accéder à la plateforme.
              </Typography>
              <Button component="a" href="mailto:support@dealpam.com" target="_blank"
                variant="outlined" size="small" startIcon={<SupportAgentOutlined sx={{ fontSize: 15 }} />}
                sx={{ borderColor: 'rgba(239,68,68,0.5)', color: '#FCA5A5', borderRadius: '8px', textTransform: 'none', fontSize: 12.5, fontWeight: 600, '&:hover': { bgcolor: 'rgba(239,68,68,0.1)', borderColor: '#EF4444' } }}>
                Contacter le support — support@dealpam.com
              </Button>
            </Box>
          )}

          {error && errorType === 'locked' && (
            <Alert severity="warning" onClose={() => setError('')}
              sx={{ mb: 3, borderRadius: '12px', bgcolor: 'rgba(245,158,11,0.08)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.25)', fontSize: 13, '& .MuiAlert-icon': { color: '#FCD34D' } }}>
              {error}
            </Alert>
          )}

          {error && errorType === 'generic' && (
            <Alert severity="error" onClose={() => setError('')}
              sx={{ mb: 3, borderRadius: '12px', bgcolor: alpha('#EF4444', 0.1), color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, '& .MuiAlert-icon': { color: '#FCA5A5' } }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Identifier */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Email ou nom d'utilisateur
                </Typography>
                {idType && (
                  <Chip label={idType === 'email' ? '@ Email' : '# Username'} size="small"
                    sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: alpha(ORANGE, 0.12),
                      color: ORANGE, border: `1px solid ${alpha(ORANGE, 0.25)}` }} />
                )}
              </Box>
              <TextField fullWidth value={identifier} placeholder="votre@email.com ou username" required autoFocus autoComplete="username"
                onChange={e => setIdentifier(e.target.value)} sx={fieldSx}
                InputProps={{ startAdornment: (
                  <InputAdornment position="start">
                    {idType === 'username'
                      ? <Person sx={{ color: '#64748B', fontSize: 18 }} />
                      : <AlternateEmail sx={{ color: '#64748B', fontSize: 18 }} />}
                  </InputAdornment>
                ) }}
              />
            </Box>

            {/* Password */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Mot de passe
                </Typography>
                <Link to="/forgot-password" style={{ color: ORANGE, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>
                  Oublié ?
                </Link>
              </Box>
              <TextField fullWidth type={showPwd ? 'text' : 'password'} value={password} required
                placeholder="••••••••••••" autoComplete="current-password"
                onChange={e => setPassword(e.target.value)} sx={fieldSx}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockOutlined sx={{ color: '#64748B', fontSize: 18 }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small" tabIndex={-1}
                        sx={{ color: '#64748B', '&:hover': { color: ORANGE, bgcolor: 'transparent' } }}>
                        {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <FormControlLabel
              control={<Checkbox checked={remember} onChange={e => setRemember(e.target.checked)} size="small"
                sx={{ color: 'rgba(15,23,42,0.25)', '&.Mui-checked': { color: ORANGE } }} />}
              label={<Typography sx={{ fontSize: 13, color: '#64748B' }}>Se souvenir de moi</Typography>}
              sx={{ mt: -0.5 }}
            />

            <Button fullWidth type="submit" variant="contained" disabled={loading} size="large"
              endIcon={!loading && <ArrowForward sx={{ fontSize: 18 }} />}
              sx={{
                py: 1.65, fontWeight: 800, fontSize: 15, borderRadius: '14px', textTransform: 'none',
                background: loading ? alpha(ORANGE, 0.7) : `linear-gradient(135deg, ${ORANGE} 0%, #d45800 100%)`,
                color: '#fff',
                boxShadow: loading ? 'none' : `0 8px 28px ${alpha(ORANGE, 0.45)}`,
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 14px 36px ${alpha(ORANGE, 0.55)}` },
                '&:active': { transform: 'translateY(0)' },
                // Fond bien visible pendant le chargement — pas un orange presque
                // transparent avec un spinner quasi invisible dessus (illisible signalé).
                '&.Mui-disabled': { background: alpha(ORANGE, 0.7), color: '#fff' },
              }}>
              {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Se connecter'}
            </Button>
            {slowServer && (
              <Typography sx={{ fontSize: 12.5, color: '#64748B', textAlign: 'center', mt: -1 }}>
                Le serveur se réveille après une période d'inactivité — encore quelques secondes…
              </Typography>
            )}
          </Box>

          {/* Divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 3.5 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(15,23,42,0.09)' }} />
            <Typography sx={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Nouveau sur DealPam ?</Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(15,23,42,0.09)' }} />
          </Box>

          <Button fullWidth component={Link} to="/register" variant="outlined"
            sx={{
              py: 1.5, fontWeight: 700, fontSize: 14, borderRadius: '14px', textTransform: 'none',
              borderColor: 'rgba(15,23,42,0.15)', color: '#475569',
              '&:hover': { borderColor: alpha(ORANGE, 0.5), color: ORANGE, bgcolor: alpha(ORANGE, 0.05) },
              transition: 'all 0.2s',
            }}>
            Créer un compte gratuitement
          </Button>

          <Typography sx={{ mt: 3, fontSize: 11, color: '#64748B', textAlign: 'center', lineHeight: 1.7 }}>
            En vous connectant, vous acceptez nos{' '}
            <Link to="/terms" style={{ color: '#64748B', textDecoration: 'none' }}>CGU</Link> et notre{' '}
            <Link to="/privacy" style={{ color: '#64748B', textDecoration: 'none' }}>Politique de confidentialité</Link>.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#FFFFFF', borderRadius: '12px', color: '#0F172A',
    '& fieldset': { borderColor: 'rgba(15,23,42,0.15)' },
    '&:hover fieldset': { borderColor: `rgba(255,107,0,0.35)` },
    '&.Mui-focused fieldset': { borderColor: '#FF6B00', boxShadow: '0 0 0 3px rgba(255,107,0,0.1)' },
  },
  '& .MuiInputBase-input': {
    color: '#0F172A !important', WebkitTextFillColor: '#0F172A', fontSize: 14.5, caretColor: '#0F172A',
    '&::placeholder': { color: '#64748B', opacity: 1 },
    '&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus': {
      WebkitBoxShadow: '0 0 0 100px #FFFFFF inset',
      WebkitTextFillColor: '#0F172A',
      caretColor: '#0F172A',
      transition: 'background-color 9999s ease-in-out 0s',
    },
  },
};
