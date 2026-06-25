import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  InputAdornment, IconButton, alpha, Checkbox, FormControlLabel,
} from '@mui/material';
import {
  Visibility, VisibilityOff, EmailOutlined, LockOutlined,
  ArrowForward, Verified, LocalShipping, Headset,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

const FEATURES = [
  { icon: Verified, text: 'Vendeurs vérifiés & produits authentiques' },
  { icon: LocalShipping, text: 'Livraison dans tout Haïti' },
  { icon: Headset, text: 'Support client 7j/7' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [blobPos, setBlobPos] = useState({ x: 30, y: 60 });

  // Redirect if already logged in
  useEffect(() => { if (user) navigate('/', { replace: true }); }, [user]);

  // Animate background blobs
  useEffect(() => {
    const interval = setInterval(() => {
      setBlobPos({ x: 20 + Math.random() * 40, y: 40 + Math.random() * 35 });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      setUser(data.user, data.accessToken, data.refreshToken);
      enqueueSnackbar(`Bienvenue, ${data.user.firstName} !`, { variant: 'success' });
      if (data.user.role === 'SELLER') navigate('/seller');
      else if (['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(data.user.role)) navigate('/admin');
      else navigate('/account');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#F8FAFC' }}>

      {/* ── Left panel ── */}
      <Box sx={{
        flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #0A1628 0%, #0F2560 50%, #1D4ED8 100%)',
        position: 'relative', overflow: 'hidden', p: 6,
      }}>
        {/* Animated blobs */}
        <Box sx={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
          top: `${blobPos.y}%`, left: `${blobPos.x}%`, transform: 'translate(-50%,-50%)',
          transition: 'top 3.5s ease, left 3.5s ease', pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', width: 350, height: 350, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)',
          bottom: '10%', right: '5%', pointerEvents: 'none',
        }} />
        {/* Grid pattern */}
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'center', mb: 5 }}>
            <Box sx={{ width: 50, height: 50, borderRadius: 3, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 26, lineHeight: 1 }}>D</Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 28, color: 'white', letterSpacing: '-0.5px' }}>
              deal<span style={{ color: '#93C5FD' }}>pam</span>
            </Typography>
          </Box>

          <Typography variant="h2" fontWeight={900} color="white" sx={{ letterSpacing: '-2px', lineHeight: 1.1, mb: 2, fontSize: { md: 36, lg: 44 } }}>
            Achetez & vendez<br /><span style={{ color: '#93C5FD' }}>en toute confiance</span>
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 15.5, lineHeight: 1.8, mb: 5 }}>
            La plateforme e-commerce numéro 1 d'Haïti. Des milliers de produits, des vendeurs vérifiés.
          </Typography>

          {/* Feature list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
            {FEATURES.map(({ icon: Icon, text }) => (
              <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon sx={{ fontSize: 18, color: '#93C5FD' }} />
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'left' }}>{text}</Typography>
              </Box>
            ))}
          </Box>

          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 0, mt: 6, borderTop: '1px solid rgba(255,255,255,0.1)', pt: 4 }}>
            {[['5 000+', 'Vendeurs'], ['50 000+', 'Produits'], ['100 000+', 'Clients']].map(([val, label], i) => (
              <Box key={label} sx={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                <Typography fontWeight={900} color="white" fontSize={22} sx={{ letterSpacing: '-0.5px' }}>{val}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, mt: 0.3 }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── Right panel — form ── */}
      <Box sx={{
        width: { xs: '100%', md: 500 }, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        px: { xs: 3, sm: 5, md: 6 }, py: 5, bgcolor: 'white',
        boxShadow: { md: '-20px 0 60px rgba(0,0,0,0.08)' },
      }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <Box sx={{ display: { md: 'none' }, textAlign: 'center', mb: 4 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: 3, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5, boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}>
              <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 26 }}>D</Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 22 }}>deal<span style={{ color: '#2563EB' }}>pam</span></Typography>
          </Box>

          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.8px', mb: 0.8 }}>
            Connexion
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>
              Créer un compte gratuitement →
            </Link>
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5, fontSize: 13.5 }}
              onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.8, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 }}>
                Adresse email
              </Typography>
              <TextField fullWidth type="email" value={form.email} placeholder="votre@email.com"
                onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#F8FAFC', '&:hover': { bgcolor: 'white' }, '&.Mui-focused': { bgcolor: 'white' } } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined sx={{ color: 'text.disabled', fontSize: 19 }} /></InputAdornment> }} />
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 }}>
                  Mot de passe
                </Typography>
                <Link to="/forgot-password" style={{ color: '#2563EB', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>
                  Mot de passe oublié ?
                </Link>
              </Box>
              <TextField fullWidth type={showPwd ? 'text' : 'password'} value={form.password}
                placeholder="Votre mot de passe"
                onChange={(e) => setForm({ ...form, password: e.target.value })} required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#F8FAFC', '&:hover': { bgcolor: 'white' }, '&.Mui-focused': { bgcolor: 'white' } } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockOutlined sx={{ color: 'text.disabled', fontSize: 19 }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end">
                    <IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small" tabIndex={-1}>
                      {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>,
                }} />
            </Box>

            <FormControlLabel
              control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} size="small" sx={{ color: 'text.disabled' }} />}
              label={<Typography variant="body2" color="text.secondary" fontSize={13}>Se souvenir de moi</Typography>}
              sx={{ mt: -1 }}
            />

            <Button fullWidth variant="contained" type="submit" disabled={loading} size="large"
              endIcon={!loading && <ArrowForward />}
              sx={{
                py: 1.6, fontSize: 15, borderRadius: 2.5, fontWeight: 700, mt: 0.5,
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                boxShadow: '0 6px 20px rgba(37,99,235,0.35)',
                '&:hover': { boxShadow: '0 8px 28px rgba(37,99,235,0.45)', transform: 'translateY(-1px)' },
                '&:active': { transform: 'translateY(0)' },
                transition: 'all 0.2s',
              }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Se connecter'}
            </Button>
          </Box>

          {/* Divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 3.5 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(0,0,0,0.08)' }} />
            <Typography variant="caption" color="text.disabled" fontWeight={500}>Nouveau sur Dealpam ?</Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(0,0,0,0.08)' }} />
          </Box>

          <Button fullWidth variant="outlined" component={Link} to="/register"
            sx={{
              borderRadius: 2.5, py: 1.4, borderColor: 'rgba(0,0,0,0.12)', color: 'text.primary',
              fontWeight: 600, fontSize: 14,
              '&:hover': { borderColor: 'primary.main', bgcolor: alpha('#2563EB', 0.04), color: 'primary.main' },
              transition: 'all 0.2s',
            }}>
            Créer un compte gratuitement
          </Button>

          <Typography variant="caption" color="text.disabled" textAlign="center" display="block" mt={3} lineHeight={1.6}>
            En vous connectant, vous acceptez nos{' '}
            <Link to="/terms" style={{ color: '#94A3B8', textDecoration: 'none' }}>CGU</Link> et notre{' '}
            <Link to="/privacy" style={{ color: '#94A3B8', textDecoration: 'none' }}>Politique de confidentialité</Link>.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
