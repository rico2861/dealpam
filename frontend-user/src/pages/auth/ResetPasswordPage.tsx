import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  InputAdornment, IconButton, Paper,
} from '@mui/material';
import { LockOutlined, Visibility, VisibilityOff, CheckCircleOutline } from '@mui/icons-material';
import api from '../../api/axios';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordStrength = (): { label: string; color: string; width: string } => {
    const len = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z\d]/.test(password);
    const score = [len >= 8, hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
    if (score <= 2) return { label: 'Faible', color: '#EF4444', width: '25%' };
    if (score === 3) return { label: 'Moyen', color: '#F59E0B', width: '55%' };
    if (score === 4) return { label: 'Fort', color: '#3B82F6', width: '75%' };
    return { label: 'Très fort', color: '#10B981', width: '100%' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas');
    if (password.length < 8) return setError('Mot de passe trop court (min 8 caractères)');
    if (!token) return setError('Lien invalide ou expiré. Faites une nouvelle demande.');

    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Lien invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  const strength = password ? passwordStrength() : null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 440, p: { xs: 3, sm: 5 }, borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)' }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '11px', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 20, lineHeight: 1 }}>D</Typography>
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px' }}>
            deal<span style={{ color: '#2563EB' }}>pam</span>
          </Typography>
        </Box>

        {success ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleOutline sx={{ fontSize: 64, color: '#10B981', mb: 2 }} />
            <Typography variant="h6" fontWeight={800} mb={1}>Mot de passe réinitialisé !</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Vous allez être redirigé vers la page de connexion dans quelques secondes…
            </Typography>
            <Button variant="contained" onClick={() => navigate('/login')} sx={{ borderRadius: 2.5 }}>
              Se connecter maintenant
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="h5" fontWeight={800} mb={0.5}>Nouveau mot de passe</Typography>
            <Typography variant="body2" color="text.secondary" mb={3.5}>
              Choisissez un mot de passe sécurisé pour votre compte.
            </Typography>

            {!token && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>
                Lien invalide. Retournez sur la page de connexion et faites une nouvelle demande.
              </Alert>
            )}

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box>
                <TextField fullWidth label="Nouveau mot de passe" type={showPwd ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockOutlined sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
                    endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small">{showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>,
                  }} />
                {strength && (
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ height: 4, borderRadius: 2, bgcolor: '#E2E8F0', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: strength.width, bgcolor: strength.color, transition: 'all 0.3s', borderRadius: 2 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: strength.color, fontWeight: 600, mt: 0.5, display: 'block' }}>
                      {strength.label}
                    </Typography>
                  </Box>
                )}
              </Box>

              <TextField fullWidth label="Confirmer le mot de passe" type={showPwd ? 'text' : 'password'}
                value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                error={confirm.length > 0 && confirm !== password}
                helperText={confirm.length > 0 && confirm !== password ? 'Les mots de passe ne correspondent pas' : ''}
                InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlined sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> }} />

              <Button fullWidth variant="contained" type="submit" disabled={loading || !token} size="large"
                sx={{ py: 1.5, fontSize: 15, borderRadius: 3, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Enregistrer le nouveau mot de passe'}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
