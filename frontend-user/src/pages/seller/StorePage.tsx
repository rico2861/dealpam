import { useState, useEffect } from 'react';
import { Container, Typography, Card, CardContent, TextField, Button, Grid, Box, Alert, CircularProgress, Divider } from '@mui/material';
import { Save, Store } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

export default function SellerStorePage() {
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({ name: '', description: '', city: '', address: '', phone: '', email: '' });

  const { data: sellerData, isLoading } = useQuery({
    queryKey: ['sellerMe'],
    queryFn: () => api.get('/sellers/me').then(r => r.data),
  });

  useEffect(() => {
    if (sellerData?.store) {
      const s = sellerData.store;
      setForm({
        name: s.name || '',
        description: s.description || '',
        city: s.city || '',
        address: s.address || '',
        phone: s.phone || '',
        email: s.email || '',
      });
    }
  }, [sellerData]);

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/stores/me', form),
    onSuccess: () => enqueueSnackbar('Boutique mise à jour !', { variant: 'success' }),
    onError: () => enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' }),
  });

  const f = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} mb={3}><Store sx={{ mr: 1, verticalAlign: 'middle' }} />Ma boutique</Typography>

      {sellerData?.status === 'PENDING' && (
        <Alert severity="warning" sx={{ mb: 3 }}>Votre boutique est en cours de validation par notre équipe. Vous serez notifié par email.</Alert>
      )}
      {sellerData?.status === 'REJECTED' && (
        <Alert severity="error" sx={{ mb: 3 }}>Votre boutique a été rejetée : {sellerData.rejectionReason}</Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Informations de la boutique</Typography>
              <TextField fullWidth label="Nom de la boutique" value={form.name} onChange={f('name')} margin="dense" />
              <TextField fullWidth label="Description" value={form.description} onChange={f('description')} margin="dense" multiline rows={4} helperText="Décrivez votre boutique, vos produits, votre histoire..." />
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" mb={1} color="text.secondary">Coordonnées publiques</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Ville" value={form.city} onChange={f('city')} margin="dense" /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Téléphone" value={form.phone} onChange={f('phone')} margin="dense" /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Adresse" value={form.address} onChange={f('address')} margin="dense" /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Email boutique" type="email" value={form.email} onChange={f('email')} margin="dense" /></Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>Lien de votre boutique</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1, fontSize: 13 }}>
                dealpam.com/store/{sellerData?.store?.slug}
              </Typography>
              <Button fullWidth variant="contained" startIcon={<Save />} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} sx={{ mt: 3, py: 1.5, fontWeight: 700 }}>
                {saveMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
