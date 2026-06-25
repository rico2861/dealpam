import { Container, Typography, Grid, Card, CardContent, Button, Box, Chip, List, ListItem, ListItemIcon, ListItemText, CircularProgress, Alert } from '@mui/material';
import { CheckCircle, Star, Diamond, WorkspacePremium, Store } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const PLAN_ICONS: Record<string, React.ReactNode> = {
  STARTER: <Store sx={{ fontSize: 40 }} />,
  BUSINESS: <Star sx={{ fontSize: 40 }} />,
  PREMIUM: <WorkspacePremium sx={{ fontSize: 40 }} />,
  ELITE: <Diamond sx={{ fontSize: 40 }} />,
};

const PLAN_COLORS: Record<string, string> = {
  STARTER: '#64748b',
  BUSINESS: '#3b82f6',
  PREMIUM: '#8b5cf6',
  ELITE: '#c41230',
};

const PLAN_FEATURES: Record<string, string[]> = {
  STARTER: ['50 produits maximum', '5 images par produit', 'Tableau de bord basique'],
  BUSINESS: ['130 produits maximum', '10 images par produit', 'Badge Vérifié ✓', 'Statistiques avancées'],
  PREMIUM: ['300 produits maximum', '10 images par produit', 'Badge Vérifié ✓', 'Priorité dans les recherches', 'Statistiques avancées'],
  ELITE: ['Produits illimités', '15 images par produit', 'Badge Elite 💎', 'Priorité maximale', 'Encart page accueil', 'Produits auto-sponsorisés', 'Statistiques complètes'],
};

export default function SellerSubscriptionPage() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const { data: plans, isLoading } = useQuery({ queryKey: ['plans'], queryFn: () => api.get('/subscriptions/plans').then(r => r.data) });
  const { data: currentSub } = useQuery({ queryKey: ['sellerSub'], queryFn: () => api.get('/subscriptions/me').then(r => r.data).catch(() => null) });

  const subscribeMutation = useMutation({
    mutationFn: (planId: string) => api.post('/subscriptions', { planId }),
    onSuccess: () => {
      enqueueSnackbar('Abonnement activé avec succès !', { variant: 'success' });
      navigate('/seller');
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur lors de l\'abonnement', { variant: 'error' }),
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const daysLeft = currentSub ? Math.max(0, Math.ceil((new Date(currentSub.endDate).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} mb={1}>Abonnements</Typography>
      <Typography color="text.secondary" mb={3}>Choisissez le plan adapté à votre activité</Typography>

      {currentSub && (
        <Alert severity={daysLeft < 7 ? 'warning' : 'success'} sx={{ mb: 3 }}>
          <strong>Abonnement actuel :</strong> {currentSub.plan?.name} — expire dans {daysLeft} jours
          {daysLeft < 7 && ' ⚠️ Pensez à renouveler !'}
        </Alert>
      )}

      <Grid container spacing={3} justifyContent="center">
        {(plans || []).map((plan: any) => {
          const color = PLAN_COLORS[plan.tier];
          const isCurrent = currentSub?.plan?.tier === plan.tier;
          const isPopular = plan.tier === 'PREMIUM';

          return (
            <Grid item xs={12} sm={6} lg={3} key={plan.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: isCurrent ? `2px solid ${color}` : '2px solid transparent', position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                {isPopular && !isCurrent && (
                  <Box sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}>
                    <Chip label="⭐ Populaire" color="primary" size="small" />
                  </Box>
                )}
                {isCurrent && (
                  <Box sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}>
                    <Chip label="✓ Actuel" sx={{ bgcolor: color, color: 'white' }} size="small" />
                  </Box>
                )}

                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ textAlign: 'center', mb: 2, color }}>
                    {PLAN_ICONS[plan.tier]}
                    <Typography variant="h6" fontWeight={800} mt={1}>{plan.name}</Typography>
                    <Typography variant="h4" fontWeight={900} color={color}>
                      {Number(plan.priceHTG).toLocaleString()}
                      <Typography component="span" variant="body2" color="text.secondary"> HTG/mois</Typography>
                    </Typography>
                  </Box>

                  <List dense sx={{ flex: 1 }}>
                    {(PLAN_FEATURES[plan.tier] || []).map((feat) => (
                      <ListItem key={feat} sx={{ px: 0, py: 0.3 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}><CheckCircle sx={{ fontSize: 18, color }} /></ListItemIcon>
                        <ListItemText primary={feat} primaryTypographyProps={{ fontSize: 13 }} />
                      </ListItem>
                    ))}
                  </List>

                  <Button
                    fullWidth
                    variant={isCurrent ? 'outlined' : 'contained'}
                    disabled={isCurrent || subscribeMutation.isPending}
                    onClick={() => subscribeMutation.mutate(plan.id)}
                    sx={{ mt: 2, bgcolor: isCurrent ? 'transparent' : color, borderColor: color, '&:hover': { bgcolor: `${color}dd` }, fontWeight: 700 }}
                  >
                    {isCurrent ? 'Plan actuel' : `Choisir ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mt: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} mb={1}>💳 Méthodes de paiement acceptées</Typography>
        <Typography variant="body2" color="text.secondary">MonCash · NatCash · Visa/Mastercard · PayPal</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Le paiement sera demandé après sélection du plan. L'abonnement est valable 30 jours.
        </Typography>
      </Box>
    </Container>
  );
}
