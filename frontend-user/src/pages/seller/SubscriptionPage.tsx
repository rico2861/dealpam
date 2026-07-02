import { Box, Typography, CircularProgress } from '@mui/material';
import { CheckCircle, Store, Star, WorkspacePremium, Diamond, CreditCard } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const OR   = '#FF6B00';
const BG   = '#060B14';
const CARD = '#0D1424';
const BORD = 'rgba(255,255,255,0.08)';
const TXT  = 'rgba(255,255,255,0.92)';
const SUB  = 'rgba(255,255,255,0.42)';
const SUB2 = 'rgba(255,255,255,0.65)';
const GRN  = '#10B981';
const YLW  = '#F59E0B';

const PLAN_COLORS: Record<string, string> = {
  FREE:     OR,
  STARTER:  '#64748B',
  BUSINESS: '#3B82F6',
  PREMIUM:  '#8B5CF6',
  ELITE:    '#E11D48',
};

const PLAN_ICONS: Record<string, any> = {
  FREE:     Store,
  STARTER:  Store,
  BUSINESS: Star,
  PREMIUM:  WorkspacePremium,
  ELITE:    Diamond,
};

const PLAN_FEATURES: Record<string, string[]> = {
  FREE:     ['10 produits maximum', '3 images par produit', 'Tableau de bord basique'],
  STARTER:  ['50 produits maximum', '5 images par produit', 'Tableau de bord basique'],
  BUSINESS: ['130 produits maximum', '10 images par produit', 'Badge Vérifié ✓', 'Statistiques avancées'],
  PREMIUM:  ['300 produits maximum', '10 images par produit', 'Badge Vérifié ✓', 'Priorité dans les recherches', 'Statistiques avancées'],
  ELITE:    ['Produits illimités', '15 images par produit', 'Badge Elite 💎', 'Priorité maximale', 'Encart page accueil', 'Produits auto-sponsorisés', 'Statistiques complètes'],
};

export default function SellerSubscriptionPage() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const hasToken = !!localStorage.getItem('accessToken');
  const { data: plans, isLoading }  = useQuery({ queryKey: ['plans'],     queryFn: () => api.get('/subscriptions/plans').then(r => r.data) });
  const { data: currentSub }        = useQuery({ queryKey: ['sellerSub'], queryFn: () => api.get('/subscriptions/me').then(r => r.data).catch(() => null), enabled: hasToken });

  const subscribeMut = useMutation({
    mutationFn: (planId: string) => api.post('/payments/subscription/initiate', { planId }).then(r => r.data),
    onSuccess: (data: any) => {
      if (data?.redirect_url) {
        enqueueSnackbar(`Redirection MonCash pour ${data.plan}…`, { variant: 'info' });
        window.location.href = data.redirect_url;
      } else {
        enqueueSnackbar('Abonnement activé !', { variant: 'success' });
        navigate('/seller');
      }
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress sx={{ color: OR }} /></Box>;

  const daysLeft = currentSub ? Math.max(0, Math.ceil((new Date(currentSub.endDate).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography fontWeight={900} fontSize={{ xs: 20, md: 24 }} color={TXT} letterSpacing="-0.5px">Abonnements</Typography>
        <Typography fontSize={13} color={SUB}>Choisissez le plan adapté à votre activité</Typography>
      </Box>

      {/* Current plan banner */}
      {currentSub && (
        <Box sx={{ mb: 3, p: 2, borderRadius: '14px', display: 'flex', alignItems: 'center', gap: 1.5,
          bgcolor: daysLeft < 7 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.08)',
          border: `1px solid ${daysLeft < 7 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.25)'}` }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: daysLeft < 7 ? YLW : GRN, flexShrink: 0 }} />
          <Typography fontSize={13} color={SUB2}>
            <strong style={{ color: TXT }}>Plan actuel : {currentSub.plan?.name}</strong>
            {' — '}{daysLeft < 7 ? <span style={{ color: YLW }}>⚠ {daysLeft} jour{daysLeft !== 1 ? 's' : ''} restant{daysLeft !== 1 ? 's' : ''} — Pensez à renouveler !</span>
              : <span style={{ color: GRN }}>{daysLeft} jours restants</span>}
          </Typography>
        </Box>
      )}

      {/* Plans grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2 }}>
        {(plans || []).map((plan: any) => {
          const color   = PLAN_COLORS[plan.tier] ?? OR;
          const PlanIcon = PLAN_ICONS[plan.tier] ?? Store;
          const isCurrent = currentSub?.plan?.tier === plan.tier;
          const isPopular = plan.tier === 'BUSINESS';
          const features  = PLAN_FEATURES[plan.tier] || [];

          return (
            <Box key={plan.id} sx={{
              borderRadius: '18px', overflow: 'hidden', position: 'relative',
              bgcolor: CARD, border: `1px solid ${isCurrent ? color : BORD}`,
              boxShadow: isCurrent ? `0 0 0 1px ${color}40, 0 12px 40px ${color}18` : 'none',
              display: 'flex', flexDirection: 'column',
              transition: 'transform 0.18s, border-color 0.18s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: isCurrent ? color : 'rgba(255,255,255,0.15)' },
            }}>
              {/* Accent top bar */}
              <Box sx={{ height: 3, background: `linear-gradient(90deg,${color},${color}99)` }} />

              {/* Popular badge */}
              {isPopular && !isCurrent && (
                <Box sx={{ position: 'absolute', top: 16, right: 12, px: 0.9, py: 0.2, borderRadius: '6px',
                  bgcolor: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)' }}>
                  <Typography fontSize={9} fontWeight={800} color="#3B82F6">POPULAIRE</Typography>
                </Box>
              )}
              {isCurrent && (
                <Box sx={{ position: 'absolute', top: 16, right: 12, px: 0.9, py: 0.2, borderRadius: '6px',
                  bgcolor: `${color}22`, border: `1px solid ${color}55` }}>
                  <Typography fontSize={9} fontWeight={800} color={color}>✓ ACTUEL</Typography>
                </Box>
              )}

              <Box sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Icon + name */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: `${color}18`, border: `1px solid ${color}30` }}>
                    <PlanIcon sx={{ fontSize: 19, color }} />
                  </Box>
                  <Typography fontWeight={800} fontSize={15} color={TXT}>{plan.name}</Typography>
                </Box>

                {/* Price */}
                <Box sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography fontWeight={900} fontSize={28} color={color} letterSpacing="-1px">
                      {Number(plan.priceHTG) === 0 ? '0' : Number(plan.priceHTG).toLocaleString()}
                    </Typography>
                    <Typography fontSize={12} color={SUB}>HTG/mois</Typography>
                  </Box>
                </Box>

                {/* Features */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.9, mb: 2.5 }}>
                  {features.map((feat) => (
                    <Box key={feat} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <CheckCircle sx={{ fontSize: 14, color, flexShrink: 0, mt: 0.15 }} />
                      <Typography fontSize={12.5} color={SUB2} lineHeight={1.4}>{feat}</Typography>
                    </Box>
                  ))}
                </Box>

                {/* CTA */}
                <Box onClick={() => !isCurrent && !subscribeMut.isPending && subscribeMut.mutate(plan.id)}
                  sx={{
                    textAlign: 'center', py: 1.2, borderRadius: '11px', cursor: isCurrent ? 'default' : 'pointer',
                    bgcolor: isCurrent ? 'rgba(255,255,255,0.04)' : color,
                    border: `1px solid ${isCurrent ? BORD : 'transparent'}`,
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: isCurrent ? 'rgba(255,255,255,0.04)' : `${color}dd`, filter: isCurrent ? 'none' : 'brightness(0.95)' },
                  }}>
                  {subscribeMut.isPending
                    ? <CircularProgress size={16} sx={{ color: isCurrent ? SUB : '#fff' }} />
                    : <Typography fontSize={13} fontWeight={800} color={isCurrent ? SUB : '#fff'}>
                        {isCurrent ? 'Plan actuel' : `Choisir ${plan.name}`}
                      </Typography>}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Payment methods */}
      <Box sx={{ p: 2.5, borderRadius: '14px', bgcolor: CARD, border: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CreditCard sx={{ fontSize: 17, color: OR }} />
        </Box>
        <Box>
          <Typography fontSize={13} fontWeight={700} color={TXT}>Méthodes de paiement acceptées</Typography>
          <Typography fontSize={12} color={SUB}>MonCash · NatCash · Visa/Mastercard · PayPal — L'abonnement est valable 30 jours</Typography>
        </Box>
      </Box>
    </Box>
  );
}
