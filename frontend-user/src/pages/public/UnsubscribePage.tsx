import { useEffect, useState } from 'react';
import { Box, Container, Typography, CircularProgress, Button } from '@mui/material';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const ORANGE = '#FF6B00';
const BG = '#0F172A';

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Lien invalide.'); return; }
    api.get(`/newsletter/unsubscribe?token=${token}`)
      .then(r => { setStatus('success'); setMessage(r.data?.message || 'Désabonnement effectué.'); })
      .catch(e => { setStatus('error'); setMessage(e?.response?.data?.message || 'Lien invalide ou déjà utilisé.'); });
  }, [token]);

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="sm">
        <Box sx={{ bgcolor: 'white', borderRadius: '24px', p: { xs: 4, md: 6 }, textAlign: 'center', boxShadow: '0 4px 32px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0' }}>
          {status === 'loading' && (
            <>
              <CircularProgress sx={{ color: ORANGE, mb: 3 }} size={52} />
              <Typography fontSize={16} color="#64748B">Traitement en cours...</Typography>
            </>
          )}
          {status === 'success' && (
            <>
              <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                <CheckCircle sx={{ fontSize: 36, color: '#10B981' }} />
              </Box>
              <Typography fontWeight={900} fontSize={22} color="#0F172A" mb={1}>Désabonné avec succès</Typography>
              <Typography fontSize={15} color="#64748B" lineHeight={1.7} mb={4}>{message}<br/>Vous ne recevrez plus nos emails newsletter.</Typography>
              <Button component={Link} to="/home" sx={{ bgcolor: ORANGE, color: 'white', borderRadius: '12px', px: 4, py: 1.2, fontWeight: 700, fontSize: 14, '&:hover': { bgcolor: '#E05A00' } }}>
                Retour à l'accueil
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                <ErrorOutline sx={{ fontSize: 36, color: '#EF4444' }} />
              </Box>
              <Typography fontWeight={900} fontSize={22} color="#0F172A" mb={1}>Lien invalide</Typography>
              <Typography fontSize={15} color="#64748B" lineHeight={1.7} mb={4}>{message}</Typography>
              <Button component={Link} to="/home" sx={{ bgcolor: ORANGE, color: 'white', borderRadius: '12px', px: 4, py: 1.2, fontWeight: 700, fontSize: 14, '&:hover': { bgcolor: '#E05A00' } }}>
                Retour à l'accueil
              </Button>
            </>
          )}
        </Box>
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography fontWeight={900} fontSize={20} color={BG}>Deal<span style={{ color: ORANGE }}>Pam</span></Typography>
          <Typography fontSize={12} color="#64748B" mt={0.5}>La marketplace haïtienne</Typography>
        </Box>
      </Container>
    </Box>
  );
}
