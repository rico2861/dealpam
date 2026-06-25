import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Button, Paper, Divider,
  CircularProgress, Alert, Chip,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useMoncashPayment } from '../../hooks/useMoncashPayment';

// MonCash logo inline SVG (orange M)
function MoncashLogo() {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: '50%',
        background: '#FF6B00', color: '#fff', fontWeight: 900, fontSize: 16, mr: 1,
      }}
    >
      M
    </Box>
  );
}

export default function CheckoutPage() {
  const location = useLocation();
  const navigate  = useNavigate();

  // L'orderId est passé via location.state depuis la page commande
  const orderId: string | null = (location.state as any)?.orderId ?? null;
  const orderTotal: number     = (location.state as any)?.totalHTG ?? 0;

  const { preResult, loading, error, pay, ready } = useMoncashPayment(orderId);

  if (!orderId) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">Aucune commande sélectionnée — retourne au panier.</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/cart')}>Retour au panier</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Pèman — Checkout
      </Typography>

      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        {/* Récap commande */}
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography color="text.secondary">Nimewo kòmand</Typography>
          <Typography fontWeight={600} fontSize={13} sx={{ fontFamily: 'monospace' }}>
            {orderId.slice(0, 8).toUpperCase()}
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography color="text.secondary">Metòd pèman</Typography>
          <Chip
            icon={<MoncashLogo />}
            label="MonCash"
            size="small"
            sx={{ fontWeight: 700, bgcolor: '#fff3e0' }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" justifyContent="space-between" mb={3}>
          <Typography fontWeight={700} fontSize={18}>Total</Typography>
          <Typography fontWeight={700} fontSize={18} color="primary">
            {orderTotal.toLocaleString()} HTG
          </Typography>
        </Box>

        {/* Erreur */}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Statut pre-initiation */}
        {loading && (
          <Box display="flex" alignItems="center" gap={1} mb={2} color="text.secondary">
            <CircularProgress size={16} />
            <Typography fontSize={13}>Preparasyon pèman MonCash…</Typography>
          </Box>
        )}
        {ready && !error && (
          <Box display="flex" alignItems="center" gap={1} mb={2} color="success.main">
            <CheckCircleIcon sx={{ fontSize: 18 }} />
            <Typography fontSize={13} fontWeight={600}>MonCash prèt — klike pou peye</Typography>
          </Box>
        )}

        {/* Bouton paiement */}
        <Button
          fullWidth
          size="large"
          variant="contained"
          disabled={!ready}
          onClick={pay}
          startIcon={<PaymentIcon />}
          sx={{
            bgcolor: '#FF6B00', '&:hover': { bgcolor: '#e55f00' },
            color: '#fff', fontWeight: 700, py: 1.5, fontSize: 16,
            borderRadius: 2,
          }}
        >
          {loading ? 'Chajman…' : ready ? 'Peye ak MonCash' : 'Prepare pèman…'}
        </Button>

        <Typography
          variant="caption"
          display="block"
          textAlign="center"
          mt={2}
          color="text.secondary"
        >
          Ou pral redirijé vè paj pèman MonCash (Digicel).<br />
          Apre pèman, ou retounen otomatikman.
        </Typography>
      </Paper>

      <Button
        fullWidth
        variant="text"
        sx={{ mt: 2, color: 'text.secondary' }}
        onClick={() => navigate(-1)}
      >
        Annile — Retounen
      </Button>
    </Container>
  );
}
