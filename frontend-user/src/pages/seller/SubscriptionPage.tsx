import { useState } from 'react';
import {
  Box, Typography, CircularProgress, TextField, InputAdornment,
  Dialog, DialogContent, Button, LinearProgress, alpha,
} from '@mui/material';
import { CheckCircle, Store, Star, WorkspacePremium, Diamond, AccountBalanceWallet, OpenInNew, LocalOffer, Bolt } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { SkelBox, SkelText } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const SUB2 = '#64748B';
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
  const { data: wallet }            = useQuery({ queryKey: ['seller-wallet'], queryFn: () => api.get('/wallet').then(r => r.data), enabled: hasToken });

  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [paymentPlan, setPaymentPlan] = useState<any | null>(null);

  const qc = useQueryClient();
  const walletBalance = Number(wallet?.balance ?? 0);

  const handlePaymentResult = (data: any) => {
    if (data?.redirect_url) {
      enqueueSnackbar(`Redirection MonCash pour ${data.plan}…`, { variant: 'info' });
      window.location.href = data.redirect_url;
    } else if (data?.type === 'subscription_scheduled') {
      const date = data.effective_date ? new Date(data.effective_date).toLocaleDateString('fr-FR') : '';
      enqueueSnackbar(`Changement de plan programmé — effectif le ${date}`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['sellerSub'] });
    } else {
      enqueueSnackbar('Abonnement activé !', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['seller-wallet'] });
      navigate('/seller');
    }
  };

  const subscribeMut = useMutation({
    mutationFn: (planId: string) => api.post('/payments/subscription/initiate', { planId, couponCode: couponCode || undefined }).then(r => r.data),
    onSettled: () => setLoadingPlanId(null),
    onSuccess: handlePaymentResult,
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const payWithWalletMut = useMutation({
    mutationFn: (planId: string) => api.post('/payments/subscription/pay-with-wallet', { planId, couponCode: couponCode || undefined }).then(r => r.data),
    onSuccess: (data: any) => { setPaymentPlan(null); handlePaymentResult(data); },
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

  const showSkel = useDelayedLoading(isLoading);

  if (isLoading) return showSkel ? (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>
      <Box sx={{ mb: 3 }}>
        <SkelText width={200} sx={{ height: 20, mb: 1 }} />
        <SkelText width={280} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} sx={{ borderRadius: '18px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <SkelBox sx={{ width: 36, height: 36, borderRadius: '10px' }} />
            <SkelText width={90} sx={{ height: 24 }} />
            {Array.from({ length: 4 }).map((__, j) => <SkelText key={j} width="90%" />)}
            <SkelBox sx={{ height: 40, borderRadius: '11px', mt: 1 }} />
          </Box>
        ))}
      </Box>
    </Box>
  ) : null;

  const daysLeft = currentSub ? Math.max(0, Math.ceil((new Date(currentSub.endDate).getTime() - Date.now()) / 86400000)) : 0;

  const statusColor = currentSub?.cancelAtPeriodEnd ? '#EF4444' : daysLeft < 7 ? YLW : GRN;
  const totalDays = 30;
  const pctLeft = Math.min(100, Math.max(0, (daysLeft / totalDays) * 100));

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>

      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: '13px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${OR}, #E05A00)`, boxShadow: `0 6px 18px ${alpha(OR, 0.35)}` }}>
          <Bolt sx={{ fontSize: 22, color: '#fff' }} />
        </Box>
        <Box>
          <Typography fontWeight={900} fontSize={{ xs: 20, md: 25 }} color={TXT} letterSpacing="-0.5px">Abonnements</Typography>
          <Typography fontSize={13} color={SUB}>Choisissez le plan adapté à votre activité — évoluez à tout moment</Typography>
        </Box>
      </Box>

      {/* Current plan banner */}
      {currentSub && (
        <Box sx={{ mb: 3, p: 2.5, borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`,
          boxShadow: '0 2px 12px rgba(15,23,42,0.05)', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: statusColor }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, bgcolor: statusColor,
              boxShadow: `0 0 0 4px ${alpha(statusColor, 0.15)}` }} />
            <Typography fontSize={13.5} color={SUB2} sx={{ flex: 1, minWidth: 200 }}>
              <strong style={{ color: TXT, fontSize: 14.5 }}>Plan actuel : {currentSub.plan?.name}</strong>
              {' — '}{daysLeft < 7 ? <span style={{ color: YLW, fontWeight: 700 }}>{daysLeft} jour{daysLeft !== 1 ? 's' : ''} restant{daysLeft !== 1 ? 's' : ''}</span>
                : <span style={{ color: GRN, fontWeight: 700 }}>{daysLeft} jours restants</span>}
            </Typography>
            {!currentSub.cancelAtPeriodEnd && !currentSub.scheduledPlan && (
              <Typography component="span" onClick={() => { if (!cancelMut.isPending) cancelMut.mutate(); }}
                sx={{ fontSize: 12, fontWeight: 700, color: SUB, cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.15s', '&:hover': { color: '#EF4444' } }}>
                {cancelMut.isPending ? 'Annulation…' : "Annuler l'abonnement"}
              </Typography>
            )}
          </Box>

          <LinearProgress variant="determinate" value={pctLeft} sx={{
            mt: 1.5, height: 5, borderRadius: 4, bgcolor: 'rgba(15,23,42,0.06)',
            '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: statusColor },
          }} />

          {/* Changement de plan programmé */}
          {currentSub.scheduledPlan && (
            <Typography fontSize={12.5} sx={{ mt: 1.5, color: '#3B82F6' }}>
              Passage au plan <strong>{currentSub.scheduledPlan.name}</strong> programmé pour le{' '}
              <strong>{new Date(currentSub.scheduledStartDate).toLocaleDateString('fr-FR')}</strong> (fin de la période en cours).
            </Typography>
          )}

          {/* Annulation en cours */}
          {currentSub.cancelAtPeriodEnd && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography fontSize={12.5} color="#EF4444">
                Abonnement annulé — reste actif jusqu'au <strong>{new Date(currentSub.endDate).toLocaleDateString('fr-FR')}</strong>, puis ne sera pas renouvelé. Aucun remboursement sur la période déjà payée.
              </Typography>
              <Typography component="span" onClick={() => { if (!undoCancelMut.isPending) undoCancelMut.mutate(); }}
                sx={{ fontSize: 12, fontWeight: 700, color: GRN, cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
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
            startAdornment: <InputAdornment position="start"><LocalOffer sx={{ fontSize: 16, color: OR }} /></InputAdornment>,
            sx: { bgcolor: CARD, color: TXT, borderRadius: '11px', '& fieldset': { borderColor: BORD },
              '&:hover fieldset': { borderColor: alpha(OR, 0.4) }, '&.Mui-focused fieldset': { borderColor: OR } },
          }}
        />
      </Box>

      {/* Plans grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2, mb: 2, alignItems: 'stretch' }}>
        {(plans || []).map((plan: any) => {
          const color   = PLAN_COLORS[plan.tier] ?? OR;
          const PlanIcon = PLAN_ICONS[plan.tier] ?? Store;
          const isCurrent   = currentSub?.plan?.tier === plan.tier;
          const isScheduled = currentSub?.scheduledPlan?.tier === plan.tier;
          const isPopular   = !!plan.isPopular;
          const highlighted = isPopular && !isCurrent;
          const features    = buildPlanFeatures(plan);

          return (
            <Box key={plan.id} sx={{
              borderRadius: '20px', overflow: 'hidden', position: 'relative',
              bgcolor: CARD, border: `1.5px solid ${isCurrent ? color : highlighted ? alpha('#3B82F6', 0.35) : BORD}`,
              boxShadow: isCurrent ? `0 0 0 1px ${alpha(color, 0.25)}, 0 16px 40px ${alpha(color, 0.15)}`
                : highlighted ? `0 16px 40px ${alpha('#3B82F6', 0.14)}` : '0 2px 10px rgba(15,23,42,0.04)',
              display: 'flex', flexDirection: 'column',
              transform: { lg: highlighted ? 'scale(1.03)' : 'scale(1)' },
              zIndex: highlighted ? 1 : 0,
              transition: 'transform 0.22s cubic-bezier(.2,.8,.2,1), box-shadow 0.22s, border-color 0.22s',
              '&:hover': {
                transform: { xs: 'translateY(-3px)', lg: highlighted ? 'scale(1.03) translateY(-3px)' : 'translateY(-3px)' },
                borderColor: isCurrent ? color : alpha(color, 0.45),
                boxShadow: `0 20px 48px ${alpha(color, 0.18)}`,
              },
            }}>
              {/* Accent top bar */}
              <Box sx={{ height: 4, background: `linear-gradient(90deg,${color},${alpha(color, 0.6)})` }} />

              {/* Badge */}
              {isPopular && !isCurrent && (
                <Box sx={{ position: 'absolute', top: 18, right: 14, px: 1, py: 0.3, borderRadius: '7px',
                  bgcolor: alpha('#3B82F6', 0.12), border: '1px solid rgba(59,130,246,0.35)' }}>
                  <Typography fontSize={9.5} fontWeight={800} color="#3B82F6" letterSpacing="0.4px">POPULAIRE</Typography>
                </Box>
              )}
              {isCurrent && (
                <Box sx={{ position: 'absolute', top: 18, right: 14, px: 1, py: 0.3, borderRadius: '7px',
                  bgcolor: alpha(color, 0.14), border: `1px solid ${alpha(color, 0.4)}` }}>
                  <Typography fontSize={9.5} fontWeight={800} color={color} letterSpacing="0.4px">✓ ACTUEL</Typography>
                </Box>
              )}
              {isScheduled && !isCurrent && (
                <Box sx={{ position: 'absolute', top: 18, right: 14, px: 1, py: 0.3, borderRadius: '7px',
                  bgcolor: 'rgba(147,197,253,0.15)', border: '1px solid rgba(147,197,253,0.4)' }}>
                  <Typography fontSize={9.5} fontWeight={800} color="#3B82F6" letterSpacing="0.4px">PROGRAMMÉ</Typography>
                </Box>
              )}

              <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Icon + name */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, mb: 2.2 }}>
                  <Box sx={{ width: 42, height: 42, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: alpha(color, 0.12), border: `1px solid ${alpha(color, 0.28)}` }}>
                    <PlanIcon sx={{ fontSize: 21, color }} />
                  </Box>
                  <Typography fontWeight={800} fontSize={16} color={TXT}>{plan.name}</Typography>
                </Box>

                {/* Price */}
                <Box sx={{ mb: 2.8 }}>
                  {plan.originalPriceHTG && Number(plan.originalPriceHTG) > Number(plan.priceHTG) && (
                    <Typography fontSize={13} color={SUB} sx={{ textDecoration: 'line-through' }}>
                      {Number(plan.originalPriceHTG).toLocaleString()} HTG
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.6 }}>
                    <Typography fontWeight={900} fontSize={32} color={color} letterSpacing="-1.2px">
                      {Number(plan.priceHTG) === 0 ? '0' : Number(plan.priceHTG).toLocaleString()}
                    </Typography>
                    <Typography fontSize={12.5} color={SUB} fontWeight={600}>HTG/mois</Typography>
                  </Box>
                </Box>

                {/* Features */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.1, mb: 2.8 }}>
                  {features.map((feat) => (
                    <Box key={feat} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ width: 17, height: 17, borderRadius: '50%', flexShrink: 0, mt: 0.1,
                        bgcolor: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle sx={{ fontSize: 12, color }} />
                      </Box>
                      <Typography fontSize={12.5} color={SUB2} lineHeight={1.45}>{feat}</Typography>
                    </Box>
                  ))}
                </Box>

                {/* CTA */}
                <Box onClick={() => {
                    if (isCurrent || isScheduled || subscribeMut.isPending) return;
                    if (Number(plan.priceHTG) === 0) { setLoadingPlanId(plan.id); subscribeMut.mutate(plan.id); return; }
                    setPaymentPlan(plan);
                  }}
                  sx={{
                    textAlign: 'center', py: 1.3, borderRadius: '12px', cursor: (isCurrent || isScheduled) ? 'default' : 'pointer',
                    bgcolor: (isCurrent || isScheduled) ? '#FFFFFF' : color,
                    border: `1.5px solid ${(isCurrent || isScheduled) ? BORD : 'transparent'}`,
                    boxShadow: (isCurrent || isScheduled) ? 'none' : `0 6px 16px ${alpha(color, 0.3)}`,
                    transition: 'all 0.18s',
                    '&:hover': {
                      bgcolor: (isCurrent || isScheduled) ? 'rgba(15,23,42,0.04)' : color,
                      boxShadow: (isCurrent || isScheduled) ? 'none' : `0 10px 24px ${alpha(color, 0.42)}`,
                      transform: (isCurrent || isScheduled) ? 'none' : 'translateY(-1px)',
                    },
                  }}>
                  {loadingPlanId === plan.id
                    ? <CircularProgress size={16} sx={{ color: (isCurrent || isScheduled) ? SUB : '#fff' }} />
                    : <Typography fontSize={13.5} fontWeight={800} color={(isCurrent || isScheduled) ? SUB : '#fff'}>
                        {isCurrent ? 'Plan actuel' : isScheduled ? 'Déjà programmé' : currentSub ? `Passer à ${plan.name}` : `Choisir ${plan.name}`}
                      </Typography>}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Choix du mode de paiement */}
      <Dialog open={!!paymentPlan} onClose={() => !subscribeMut.isPending && !payWithWalletMut.isPending && setPaymentPlan(null)}
        maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: '#F7F8FA', border: `1px solid ${BORD}`, borderRadius: '20px' } }}>
        <DialogContent sx={{ p: 3 }}>
          {paymentPlan && (
            <>
              <Typography fontWeight={900} fontSize={16} color={TXT} mb={0.3}>Payer {paymentPlan.name}</Typography>
              <Typography fontSize={13} color={SUB} mb={2.5}>
                {Number(paymentPlan.priceHTG).toLocaleString()} HTG — comment souhaitez-vous payer ?
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                <Button
                  fullWidth
                  onClick={() => payWithWalletMut.mutate(paymentPlan.id)}
                  disabled={payWithWalletMut.isPending || subscribeMut.isPending || walletBalance < Number(paymentPlan.priceHTG)}
                  startIcon={payWithWalletMut.isPending ? <CircularProgress size={16} color="inherit" /> : <AccountBalanceWallet sx={{ fontSize: 17 }} />}
                  sx={{ py: 1.3, borderRadius: '11px', fontWeight: 700, textTransform: 'none', justifyContent: 'flex-start', px: 2,
                    bgcolor: walletBalance >= Number(paymentPlan.priceHTG) ? OR : 'rgba(15,23,42,0.06)',
                    color: walletBalance >= Number(paymentPlan.priceHTG) ? '#fff' : SUB,
                    '&:hover': { bgcolor: walletBalance >= Number(paymentPlan.priceHTG) ? '#E05A00' : 'rgba(15,23,42,0.06)' } }}>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography fontSize={13.5} fontWeight={700} color="inherit">Payer avec le wallet</Typography>
                    <Typography fontSize={11} color="inherit" sx={{ opacity: 0.85 }}>
                      Solde disponible : {walletBalance.toLocaleString('fr-HT')} HTG
                      {walletBalance < Number(paymentPlan.priceHTG) ? ' — insuffisant' : ''}
                    </Typography>
                  </Box>
                </Button>

                <Button
                  fullWidth
                  onClick={() => { setLoadingPlanId(paymentPlan.id); subscribeMut.mutate(paymentPlan.id); }}
                  disabled={subscribeMut.isPending || payWithWalletMut.isPending}
                  startIcon={subscribeMut.isPending ? <CircularProgress size={16} color="inherit" /> : <OpenInNew sx={{ fontSize: 16 }} />}
                  sx={{ py: 1.3, borderRadius: '11px', fontWeight: 700, textTransform: 'none', justifyContent: 'flex-start', px: 2,
                    bgcolor: 'rgba(15,23,42,0.06)', color: TXT, '&:hover': { bgcolor: 'rgba(15,23,42,0.09)' } }}>
                  Payer avec MonCash
                </Button>

                <Button onClick={() => setPaymentPlan(null)} disabled={subscribeMut.isPending || payWithWalletMut.isPending}
                  sx={{ color: SUB, textTransform: 'none', fontWeight: 600 }}>
                  Annuler
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
