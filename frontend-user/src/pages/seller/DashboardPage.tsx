import { Container, Grid, Card, CardContent, Typography, Box, CircularProgress, Chip, Button, alpha, LinearProgress } from '@mui/material';
import { Inventory, ShoppingBag, AttachMoney, Star, ArrowForward, WarningAmber, CheckCircle } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: any; color: string; sub?: string }) {
  return (
    <Card sx={{ '&:hover': { transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: alpha(color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon sx={{ color, fontSize: 22 }} />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-1px', mt: 0.5 }}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

export default function SellerDashboard() {
  const { data: stats } = useQuery({ queryKey: ['sellerStats'], queryFn: () => api.get('/dashboard/seller').then(r => r.data) });
  const { data: sub } = useQuery({ queryKey: ['sellerSub'], queryFn: () => api.get('/subscriptions/me').then(r => r.data) });

  const daysLeft = sub ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000)) : 0;
  const daysTotal = 30;
  const progress = Math.min(100, Math.round((daysLeft / daysTotal) * 100));
  const isExpiringSoon = daysLeft < 7;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>Tableau de bord</Typography>
          <Typography variant="body2" color="text.secondary">Bienvenue sur votre espace vendeur</Typography>
        </Box>
        <Button component={Link} to="/seller/products/new" variant="contained" size="small" sx={{ borderRadius: 2.5 }}>
          Ajouter un produit
        </Button>
      </Box>

      {/* Subscription Banner */}
      {sub ? (
        <Card sx={{ mb: 3, background: isExpiringSoon
          ? `linear-gradient(135deg, ${alpha('#F59E0B', 0.12)}, ${alpha('#EF4444', 0.08)})`
          : 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
          border: isExpiringSoon ? `1px solid ${alpha('#F59E0B', 0.3)}` : 'none',
          color: isExpiringSoon ? 'inherit' : 'white',
        }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {isExpiringSoon
                  ? <WarningAmber sx={{ color: '#F59E0B', fontSize: 28 }} />
                  : <CheckCircle sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 28 }} />}
                <Box>
                  <Typography variant="h6" fontWeight={700} color={isExpiringSoon ? 'text.primary' : 'white'}>
                    {sub.plan?.name}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, color: isExpiringSoon ? 'text.secondary' : 'rgba(255,255,255,0.8)' }}>
                    {sub.plan?.maxProducts || 'Illimité'} produits max
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={isExpiringSoon ? `${daysLeft}j restants` : `Actif — ${daysLeft}j`}
                sx={{ bgcolor: isExpiringSoon ? alpha('#F59E0B', 0.15) : 'rgba(255,255,255,0.2)',
                      color: isExpiringSoon ? '#B45309' : 'white', fontWeight: 700 }} />
            </Box>
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={progress}
                sx={{ height: 6, borderRadius: 3,
                  bgcolor: isExpiringSoon ? alpha('#F59E0B', 0.2) : 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': { bgcolor: isExpiringSoon ? '#F59E0B' : 'rgba(255,255,255,0.9)', borderRadius: 3 } }} />
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mb: 3, border: '1.5px dashed', borderColor: alpha('#F59E0B', 0.5), bgcolor: alpha('#FEF3C7', 0.5) }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <WarningAmber sx={{ color: '#F59E0B', fontSize: 26 }} />
              <Box>
                <Typography fontWeight={700} color="warning.dark">Aucun abonnement actif</Typography>
                <Typography variant="body2" color="text.secondary">Abonnez-vous pour publier vos produits</Typography>
              </Box>
            </Box>
            <Button component={Link} to="/seller/subscription" variant="contained" color="warning" size="small"
              endIcon={<ArrowForward />} sx={{ borderRadius: 2.5, color: 'white' }}>
              Voir les plans
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2.5}>
        <Grid item xs={6} md={3}>
          <StatCard icon={Inventory}    label="Produits"       value={stats?.products || 0}   color="#2563EB" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={ShoppingBag}  label="Commandes"      value={stats?.orders || 0}     color="#8B5CF6" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={AttachMoney}  label="Revenus (HTG)"  value={Number(stats?.revenue || 0).toLocaleString()} color="#10B981" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={Star}         label="Note boutique"  value="4.5 / 5"               color="#F59E0B" sub="Basé sur les avis" />
        </Grid>
      </Grid>
    </Box>
  );
}
