import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, Alert, CircularProgress, InputAdornment, IconButton, alpha } from '@mui/material';
import { EmailOutlined, LockOutlined, Visibility, VisibilityOff, AdminPanelSettings } from '@mui/icons-material';
import { useAdminStore } from '../store/admin.store';

export default function LoginPage() {
  const { login } = useAdminStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (e: any) {
      setError(e.message || 'Accès refusé');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#F1F5F9' }}>
      {/* Left decorative */}
      <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #0F172A 0%, #1E3A8A 100%)', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 25% 75%, rgba(37,99,235,0.25) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(99,102,241,0.15) 0%, transparent 50%)' }} />
        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', px: 5 }}>
          <Box sx={{ width: 72, height: 72, borderRadius: 4, background: 'linear-gradient(135deg, #2563EB, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3, boxShadow: '0 16px 48px rgba(37,99,235,0.4)' }}>
            <AdminPanelSettings sx={{ color: 'white', fontSize: 36 }} />
          </Box>
          <Typography variant="h3" fontWeight={900} color="white" sx={{ letterSpacing: '-1px', lineHeight: 1.2, mb: 2 }}>
            Administration<br />Dealpam
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.7 }}>
            Gérez la plateforme, les vendeurs,<br />les produits et les commandes.
          </Typography>
        </Box>
      </Box>

      {/* Right form */}
      <Box sx={{ width: { xs: '100%', md: 480 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: { xs: 3, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '12px', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 20, lineHeight: 1 }}>D</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.4px', lineHeight: 1 }}>
                deal<span style={{ color: '#2563EB' }}>pam</span>
              </Typography>
              <Typography variant="caption" color="text.secondary">Panel Administrateur</Typography>
            </Box>
          </Box>

          <Typography variant="h5" fontWeight={800} mb={0.5}>Connexion</Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>Accès réservé aux administrateurs</Typography>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField fullWidth label="Email administrateur" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus
              InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> }} />

            <TextField fullWidth label="Mot de passe" type={showPwd ? 'text' : 'password'} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockOutlined sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small">{showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>,
              }} />

            <Button fullWidth variant="contained" type="submit" disabled={loading} size="large"
              sx={{ py: 1.5, fontSize: 15, borderRadius: 3, mt: 0.5, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Accéder au panel'}
            </Button>
          </Box>

          <Box sx={{ mt: 4, p: 2, borderRadius: 2.5, bgcolor: alpha('#F59E0B', 0.08), border: '1px solid', borderColor: alpha('#F59E0B', 0.2) }}>
            <Typography variant="caption" color="warning.dark" fontWeight={500}>
              Acces sécurisé — Toutes les actions sont enregistrées et auditées.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
