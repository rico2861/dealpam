import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  Paper, InputAdornment,
} from '@mui/material';
import { EmailOutlined, ArrowBack, MarkEmailReadOutlined } from '@mui/icons-material';
import api from '../../api/axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (e: any) {
      // Don't reveal if email exists — show generic message
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

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

        {sent ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <MarkEmailReadOutlined sx={{ fontSize: 64, color: '#10B981', mb: 2 }} />
            <Typography variant="h6" fontWeight={800} mb={1.5}>Vérifiez votre boîte mail</Typography>
            <Typography variant="body2" color="text.secondary" mb={3} sx={{ lineHeight: 1.7 }}>
              Si un compte existe pour <strong>{email}</strong>, vous recevrez un email avec un lien de réinitialisation valable <strong>1 heure</strong>.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
              Vérifiez aussi vos spams si vous ne voyez rien dans 2 minutes.
            </Typography>
            <Button component={Link} to="/login" variant="outlined" startIcon={<ArrowBack />}
              sx={{ borderRadius: 2.5 }}>
              Retour à la connexion
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="h5" fontWeight={800} mb={0.5}>Mot de passe oublié ?</Typography>
            <Typography variant="body2" color="text.secondary" mb={3.5} sx={{ lineHeight: 1.7 }}>
              Entrez votre adresse email. Si un compte existe, nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField fullWidth label="Adresse email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoFocus
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> }} />

              <Button fullWidth variant="contained" type="submit" disabled={loading} size="large"
                sx={{ py: 1.5, fontSize: 15, borderRadius: 3, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Envoyer le lien de réinitialisation'}
              </Button>

              <Button component={Link} to="/login" startIcon={<ArrowBack />} size="small"
                sx={{ color: 'text.secondary', alignSelf: 'center' }}>
                Retour à la connexion
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
