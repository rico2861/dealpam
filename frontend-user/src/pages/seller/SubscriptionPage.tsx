import { useState } from 'react';
import { Box, Typography, CircularProgress, TextField, InputAdornment } from '@mui/material';
import { CheckCircle, Store, Star, WorkspacePremium, Diamond, CreditCard } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#94A3B8';
const SUB2 = '#94A3B8';
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

// Fonctionnalités générées dynamiquement depuis les vraies données du plan
// (jamais de texte codé en dur qui pourrait se désynchroniser des valeurs admin)
function buildPlanFeatures(plan: any): string[] {
  const f: string[] = [];
  f.push(plan.maxProducts ? `${plan.maxProducts} produits maximum` : 'Produits illimités');
  if (plan.maxServices !== null && plan.maxServices !== undefined) {
    f.push(plan.maxServices === 0 ? 'Services non inclus' : `${plan.maxServices} services maximum`);
  } else {
    f.push('Services illimités');
  }
  f.push(`${plan.maxImages} image${plan.maxImages > 1 ? 's' : ''} par produit`);
  if (plan.maxStores > 1) f.push(`Jusqu'à ${plan.maxStores} boutiques`);
  if (plan.hasEliteBadge) f.push('Badge Elite 💎');
  else if (plan.hasVerifiedBadge) f.push('Badge vendeur vérifié ✓');
  if (plan.hasPrioritySearch) f.push('Priorité dans les résultats de recherche');
  if (plan.hasKeywordTargeting) f.push('Mots-clés ciblés pour plus de visibilité');
  if (plan.hasHomepageAd) f.push('Encart mis en avant sur la page d\'accueil');
  if (plan.hasAutoSponsored) f.push('Produits sponsorisés automatiquement');
  if (plan.maxPromoProducts > 0) {
    f.push(plan.maxCarouselProducts > 0
      ? `${plan.maxPromoProducts} produits en publicité, dont ${plan.maxCarouselProducts} sur le carousel homepage`
      : `${plan.maxPromoProducts} produits publiables en publicité`);
  }
  f.push(plan.hasAdvancedStats ? 'Statistiques de vente avancées' : 'Tableau de bord basique');
  return f;
}

export default function SellerSubscriptionPage() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const hasToken = !!localStorage.getItem('accessToken');
  const { data: plans, isLoading }  = useQuery({ queryKey: ['plans'],     queryFn: () => api.get('/subscriptions/plans').then(r => r.data) });
  const { data: currentSub }        = useQuery({ queryKey: ['sellerSub'], queryFn: () => api.get('/subscriptions/me').then(r => r.data).catch(() => null), enabled: hasToken });

  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');

  const qc = useQueryClient();

  const subscribeMut = useMutation({
    mutationFn: (planId: string) => api.post('/payments/subscription/initiate', { planId, couponCode: couponCode || undefined }).then(r => r.data),
    onSettled: () => setLoadingPlanId(null),
    onSuccess: (data: any) => {
      if (data?.redirect_url) {
        enqueueSnackbar(`Redirection MonCash pour ${data.plan}…`, { variant: 'info' });
        window.location.href = data.redirect_url;
      } else if (data?.type === 'subscription_scheduled') {
        const date = data.effective_date ? new Date(data.effective_date).toLocaleDateString('fr-FR') : '';
        enqueueSnackbar(`Changement de plan programmé — effectif le ${date}`, { variant: 'success' });
        qc.invalidateQueries({ queryKey: ['sellerSub'] });
      } else {
        enqueueSnackbar('Abonnement activé !', { variant: 'success' });
        navigate('/seller');
      }
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const cancelMut = useMutation({
    mutationFn: () => api.post('/subscriptions/cancel').then(r => r.data),
    onSuccess: (data: any) => {
      const date = data.endDate ? new Date(data.endDate).toLocaleDateString('fr-FR') : '';
      enqueueSnackbar(`Abonnement annulé — actif jusqu'au ${date}`, { variant: 'info' });
      qc.invalidateQueries({ queryKey: ['sellerSub'] });
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const undoCancelMut = useMutation({
    mutationFn: () => api.post('/subscriptions/cancel/undo').then(r => r.data),
    onSuccess: () => {
      enqueueSnackbar('Annulation annulée — votre abonnement continue normalement.', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['sellerSub'] });
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
        <Box sx={{ mb: 3, p: 2, borderRadius: '14px',
          bgcolor: currentSub.cancelAtPeriodEnd ? 'rgba(239,68,68,0.08)' : daysLeft < 7 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.08)',
          border: `1px solid ${currentSub.cancelAtPeriodEnd ? 'rgba(239,68,68,0.3)' : daysLeft < 7 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.25)'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              bgcolor: currentSub.cancelAtPeriodEnd ? '#EF4444' : daysLeft < 7 ? YLW : GRN }} />
            <Typography fontSize={13} color={SUB2} sx={{ flex: 1, minWidth: 200 }}>
              <strong style={{ color: TXT }}>Plan actuel : {currentSub.plan?.name}</strong>
              {' — '}{daysLeft < 7 ? <span style={{ color: YLW }}>⚠ {daysLeft} jour{daysLeft !== 1 ? 's' : ''} restant{daysLeft !== 1 ? 's' : ''}</span>
                : <span style={{ color: GRN }}>{daysLeft} jours restants</span>}
            </Typography>
            {!currentSub.cancelAtPeriodEnd && !currentSub.scheduledPlan && (
              <Typography component="span" onClick={() => { if (!cancelMut.isPending) cancelMut.mutate(); }}
                sx={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', cursor: 'pointer', textDecoration: 'underline', '&:hover': { color: '#EF4444' } }}>
                {cancelMut.isPending ? 'Annulation…' : "Annuler l'abonnement"}
              </Typography>
            )}
          </Box>

          {/* Changement de plan programmé */}
          {currentSub.scheduledPlan && (
            <Typography fontSize={12.5} sx={{ mt: 1, color: '#93C5FD' }}>
              Passage au plan <strong>{currentSub.scheduledPlan.name}</strong> programmé pour le{' '}
              <strong>{new Date(currentSub.scheduledStartDate).toLocaleDateString('fr-FR')}</strong> (fin de la période en cours).
            </Typography>
          )}

          {/* Annulation en cours */}
          {currentSub.cancelAtPeriodEnd && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography fontSize={12.5} color="#FCA5A5">
                Abonnement annulé — reste actif jusqu'au <strong>{new Date(currentSub.endDate).toLocaleDateString('fr-FR')}</strong>, puis ne sera pas renouvelé. Aucun remboursement sur la période déjà payée.
              </Typography>
              <Typography component="span" onClick={() => { if (!undoCancelMut.isPending) undoCancelMut.mutate(); }}
                sx={{ fontSize: 12, fontWeight: 700, color: '#34D399', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                {undoCancelMut.isPending ? '…' : "Annuler la résiliation"}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Code promo */}
      <Box sx={{ mb: 3, maxWidth: 340 }}>
        <TextField
          size="small" fullWidth value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="Code promo (optionnel)"
          InputProps={{
            startAdornment: <InputAdornment position="start"><Typography fontSize={14}>🎟️</Typography></InputAdornment>,
            sx: { bgcolor: CARD, color: TXT, borderRadius: '10px', '& fieldset': { borderColor: BORD } },
          }}
        />
      </Box>

      {/* Plans grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2 }}>
        {(plans || []).map((plan: any) => {
          const color   = PLAN_COLORS[plan.tier] ?? OR;
          const PlanIcon = PLAN_ICONS[plan.tier] ?? Store;
          const isCurrent   = currentSub?.plan?.tier === plan.tier;
          const isScheduled = currentSub?.scheduledPlan?.tier === plan.tier;
          const isPopular   = !!plan.isPopular;
          const features    = buildPlanFeatures(plan);

          return (
            <Box key={plan.id} sx={{
              borderRadius: '18px', overflow: 'hidden', position: 'relative',
              bgcolor: CARD, border: `1px solid ${isCurrent ? color : BORD}`,
              boxShadow: isCurrent ? `0 0 0 1px ${color}40, 0 12px 40px ${color}18` : 'none',
              display: 'flex', flexDirection: 'column',
              transition: 'transform 0.18s, border-color 0.18s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: isCurrent ? color : 'rgba(15,23,42,0.09)' },
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
              {isScheduled && !isCurrent && (
                <Box sx={{ position: 'absolute', top: 16, right: 12, px: 0.9, py: 0.2, borderRadius: '6px',
                  bgcolor: 'rgba(147,197,253,0.15)', border: '1px solid rgba(147,197,253,0.4)' }}>
                  <Typography fontSize={9} fontWeight={800} color="#93C5FD">PROGRAMMÉ</Typography>
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
                  {plan.originalPriceHTG && Number(plan.originalPriceHTG) > Number(plan.priceHTG) && (
                    <Typography fontSize={13} color={SUB} sx={{ textDecoration: 'line-through' }}>
                      {Number(plan.originalPriceHTG).toLocaleString()} HTG
                    </Typography>
                  )}
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
                <Box onClick={() => {
                    if (isCurrent || isScheduled || subscribeMut.isPending) return;
                    setLoadingPlanId(plan.id);
                    subscribeMut.mutate(plan.id);
                  }}
                  sx={{
                    textAlign: 'center', py: 1.2, borderRadius: '11px', cursor: (isCurrent || isScheduled) ? 'default' : 'pointer',
                    bgcolor: (isCurrent || isScheduled) ? '#FFFFFF' : color,
                    border: `1px solid ${(isCurrent || isScheduled) ? BORD : 'transparent'}`,
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: (isCurrent || isScheduled) ? 'rgba(15,23,42,0.04)' : `${color}dd`, filter: (isCurrent || isScheduled) ? 'none' : 'brightness(0.95)' },
                  }}>
                  {loadingPlanId === plan.id
                    ? <CircularProgress size={16} sx={{ color: (isCurrent || isScheduled) ? SUB : '#fff' }} />
                    : <Typography fontSize={13} fontWeight={800} color={(isCurrent || isScheduled) ? SUB : '#fff'}>
                        {isCurrent ? 'Plan actuel' : isScheduled ? 'Déjà programmé' : currentSub ? `Passer à ${plan.name}` : `Choisir ${plan.name}`}
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
          {currentSub && (
            <Typography fontSize={12} color={SUB} sx={{ mt: 0.3 }}>
              Un changement de plan ne prend effet qu'à la fin de la période déjà payée — jamais immédiatement, jamais de remboursement rétroactif.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
