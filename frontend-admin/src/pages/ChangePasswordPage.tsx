import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, CircularProgress, Alert, alpha, InputAdornment, IconButton, LinearProgress } from '@mui/material';
import { LockReset, Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material';
import { useAdminStore } from '../store/admin.store';
import api from '../api/axios';

const ORANGE = '#FF9900';

function strength(p: string): { score: number; label: string; color: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const labels = ['', 'Faible', 'Moyen', 'Bon', 'Fort', 'Excellent'];
  const colors = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#059669'];
  return { score: s, label: labels[s] || '', color: colors[s] || '' };
}

export default function ChangePasswordPage() {
  const { admin, clearMustChange } = useAdminStore();
  const navigate = useNavigate();
  const [pwd, setPwd]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);

  const str = strength(pwd);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pwd.length < 8) { setError('Minimum 8 caractères'); return; }
    if (pwd !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    try {
      await api.post('/auth/change-password-forced', { newPassword: pwd });
      clearMustChange();
      setDone(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur — réessayez');
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#060D1A', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 400 }}>

        {/* Icon */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '18px', bgcolor: alpha(ORANGE, 0.12), border: `1.5px solid ${alpha(ORANGE, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LockReset sx={{ fontSize: 30, color: ORANGE }} />
          </Box>
        </Box>

        <Typography variant="h5" fontWeight={900} color="white" textAlign="center" mb={0.8}>
          Changement de mot de passe requis
        </Typography>
        <Typography fontSize={13.5} color="rgba(255,255,255,0.5)" textAlign="center" lineHeight={1.7} mb={3.5}>
          Bonjour <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{admin?.firstName}</strong> — pour sécuriser votre compte,<br />
          vous devez définir un nouveau mot de passe avant de continuer.
        </Typography>

        {done ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircle sx={{ fontSize: 52, color: '#10B981', mb: 1 }} />
            <Typography color="#10B981" fontWeight={700} fontSize={15}>Mot de passe mis à jour ! Redirection…</Typography>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error" sx={{ borderRadius: 2, bgcolor: alpha('#EF4444', 0.1), color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, '& .MuiAlert-icon': { color: '#FCA5A5' } }}>{error}</Alert>}

            <Box>
              <TextField
                label="Nouveau mot de passe"
                type={show ? 'text' : 'password'}
                value={pwd} onChange={e => setPwd(e.target.value)}
                fullWidth required autoFocus
                InputProps={{ endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShow(p => !p)} edge="end" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                      {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )}}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' }, '&.Mui-focused fieldset': { borderColor: ORANGE } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)' }, '& .MuiInputLabel-root.Mui-focused': { color: ORANGE } }}
              />
              {pwd && (
                <Box sx={{ mt: 0.8, px: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={(str.score / 5) * 100}
                      sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: str.color, borderRadius: 2 } }} />
                    <Typography fontSize={11} fontWeight={700} color={str.color}>{str.label}</Typography>
                  </Box>
                </Box>
              )}
            </Box>

            <TextField
              label="Confirmer le mot de passe"
              type={show ? 'text' : 'password'}
              value={confirm} onChange={e => setConfirm(e.target.value)}
              fullWidth required
              error={!!confirm && confirm !== pwd}
              helperText={confirm && confirm !== pwd ? 'Ne correspond pas' : ''}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' }, '&.Mui-focused fieldset': { borderColor: ORANGE } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)' }, '& .MuiInputLabel-root.Mui-focused': { color: ORANGE }, '& .MuiFormHelperText-root': { color: '#EF4444' } }}
            />

            <Button type="submit" variant="contained" fullWidth disabled={loading || str.score < 2}
              sx={{ mt: 0.5, py: 1.5, borderRadius: 2.5, fontWeight: 800, fontSize: 14, bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' } }}>
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Définir mon mot de passe'}
            </Button>

            <Typography fontSize={11.5} color="rgba(255,255,255,0.3)" textAlign="center">
              Minimum 8 caractères · recommandé : majuscule, chiffre, symbole
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
