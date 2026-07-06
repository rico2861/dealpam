import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Button, Grid, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Skeleton, Avatar, Collapse, CircularProgress,
} from '@mui/material';
import {
  Add, Campaign, TrendingUp, Visibility, TouchApp, ShoppingCart,
  Pause, PlayArrow, Cancel, BarChart, FlashOn, LocationOn,
  AutoAwesome, Tune, AccountBalanceWallet, Store, Inventory,
  Search, CheckCircle, OpenInNew,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#94A3B8';
const SUB2 = '#94A3B8';
const GRN  = '#10B981';
const RED  = '#EF4444';
const BLU  = '#3B82F6';
const PUR  = '#8B5CF6';
const YLW  = '#F59E0B';

function Pill({ children, active, onClick, color = OR }: { children: React.ReactNode; active: boolean; onClick: () => void; color?: string }) {
  return (
    <Box onClick={onClick} sx={{
      px: 1.4, py: 0.6, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.14s',
      bgcolor: active ? `${color}22` : '#FFFFFF',
      border: '1px solid', borderColor: active ? `${color}55` : BORD,
      '&:hover': { borderColor: active ? `${color}77` : 'rgba(15,23,42,0.09)' },
    }}>
      <Typography fontSize={12} fontWeight={700} color={active ? color : SUB}>{children}</Typography>
    </Box>
  );
}

const DEPTS = ['Ouest', 'Nord', 'Nord-Est', 'Nord-Ouest', 'Artibonite', 'Centre', 'Sud', 'Sud-Est', 'Grande-Anse', 'Nippes'];
const CATEGORIES = [
  { slug: 'mode', name: 'Mode' }, { slug: 'electronique', name: 'Électronique' },
  { slug: 'maison', name: 'Maison' }, { slug: 'beaute', name: 'Beauté' },
  { slug: 'bijoux', name: 'Bijoux' }, { slug: 'sport', name: 'Sport' },
  { slug: 'alimentaire', name: 'Alimentation' }, { slug: 'chaussures', name: 'Chaussures' },
  { slug: 'vehicules', name: 'Véhicules' }, { slug: 'smartphones', name: 'Smartphones' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ACTIVE:          { label: 'Active',          color: GRN },
  PAUSED:          { label: 'En pause',        color: YLW },
  PENDING_REVIEW:  { label: 'En revue',        color: PUR },
  PENDING_PAYMENT: { label: 'Paiement requis', color: BLU },
  COMPLETED:       { label: 'Terminée',        color: SUB },
  REJECTED:        { label: 'Rejetée',         color: RED },
  CANCELLED:       { label: 'Annulée',         color: SUB },
  DRAFT:           { label: 'Brouillon',       color: SUB },
};
const statusColor = (s: string) => STATUS_MAP[s]?.color || SUB;
const statusLabel = (s: string) => STATUS_MAP[s]?.label || s;

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: TXT, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)',
    '& fieldset': { borderColor: BORD },
    '&:hover fieldset': { borderColor: 'rgba(15,23,42,0.09)' },
    '&.Mui-focused fieldset': { borderColor: OR },
  },
  '& .MuiInputLabel-root': { color: SUB },
  '& .MuiInputLabel-root.Mui-focused': { color: OR },
  '& .MuiFormHelperText-root': { color: SUB },
  '& .MuiSelect-icon': { color: SUB },
};

// ── Searchable item selector (product or store) ─────────────────────────────

interface SelectorItem { id: string; name: string; sub?: string; img?: string }

function SearchableSelector({
  items, value, onChange, placeholder,
}: { items: SelectorItem[]; value: string; onChange: (id: string) => void; placeholder: string }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() =>
    q.trim() ? items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()) || (i.sub ?? '').toLowerCase().includes(q.toLowerCase())) : items,
    [q, items]);

  const selected = items.find(i => i.id === value);

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Trigger */}
      <Box onClick={() => setOpen(p => !p)}
        sx={{ p: '10px 14px', borderRadius: '12px', cursor: 'pointer', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${open ? OR : BORD}`, display: 'flex', alignItems: 'center', gap: 1.2, transition: 'all 0.15s', '&:hover': { borderColor: 'rgba(15,23,42,0.09)' } }}>
        {selected ? (
          <>
            {selected.img
              ? <Avatar src={selected.img} variant="rounded" sx={{ width: 30, height: 30, borderRadius: '7px', flexShrink: 0 }} />
              : <Box sx={{ width: 30, height: 30, borderRadius: '7px', bgcolor: `${OR}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Inventory sx={{ fontSize: 14, color: OR }} /></Box>
            }
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontSize={13.5} fontWeight={600} color={TXT} noWrap>{selected.name}</Typography>
              {selected.sub && <Typography fontSize={11} color={SUB} noWrap>{selected.sub}</Typography>}
            </Box>
            <CheckCircle sx={{ fontSize: 16, color: GRN, flexShrink: 0 }} />
          </>
        ) : (
          <>
            <Search sx={{ fontSize: 16, color: SUB, flexShrink: 0 }} />
            <Typography fontSize={13} color={SUB}>{placeholder}</Typography>
          </>
        )}
      </Box>

      {/* Dropdown */}
      <Collapse in={open}>
        <Box sx={{ mt: 0.5, borderRadius: '12px', bgcolor: '#F7F8FA', border: `1px solid ${BORD}`, overflow: 'hidden', boxShadow: '0 8px 30px rgba(15,23,42,0.15)' }}>
          {/* Search input */}
          <Box sx={{ p: 1.2, borderBottom: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Search sx={{ fontSize: 15, color: SUB, flexShrink: 0 }} />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Rechercher…" autoFocus
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: TXT, padding: '2px 0' }} />
          </Box>
          {/* List */}
          <Box sx={{ maxHeight: 220, overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(15,23,42,0.09)', borderRadius: 2 } }}>
            {filtered.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}><Typography fontSize={13} color={SUB}>Aucun résultat</Typography></Box>
            ) : filtered.map(item => (
              <Box key={item.id} onClick={() => { onChange(item.id); setOpen(false); setQ(''); }}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.2, px: 1.5, py: 1, cursor: 'pointer', transition: 'all 0.1s', bgcolor: item.id === value ? `${OR}12` : 'transparent', '&:hover': { bgcolor: 'rgba(15,23,42,0.04)' } }}>
                {item.img
                  ? <Avatar src={item.img} variant="rounded" sx={{ width: 32, height: 32, borderRadius: '7px', flexShrink: 0 }} />
                  : <Box sx={{ width: 32, height: 32, borderRadius: '7px', bgcolor: `${OR}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Inventory sx={{ fontSize: 15, color: OR }} /></Box>
                }
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontSize={13} fontWeight={600} color={TXT} noWrap>{item.name}</Typography>
                  {item.sub && <Typography fontSize={11} color={SUB} noWrap>{item.sub}</Typography>}
                </Box>
                {item.id === value && <CheckCircle sx={{ fontSize: 14, color: GRN, flexShrink: 0 }} />}
              </Box>
            ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Payment method card ─────────────────────────────────────────────────────

function PayMethodCard({ method, selected, onClick, balance, budget }: { method: 'WALLET' | 'MONCASH'; selected: boolean; onClick: () => void; balance?: number; budget: number }) {
  const isWallet   = method === 'WALLET';
  const insufficient = isWallet && balance != null && balance < budget;
  const color = selected ? (insufficient ? RED : OR) : BORD;

  return (
    <Box onClick={onClick} sx={{ flex: 1, p: 2, borderRadius: '14px', cursor: 'pointer', border: `1.5px solid ${color}`, bgcolor: selected ? `${color}10` : 'rgba(15,23,42,0.09)', transition: 'all 0.15s', '&:hover': { borderColor: selected ? color : 'rgba(15,23,42,0.09)' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
        {isWallet ? <AccountBalanceWallet sx={{ fontSize: 20, color: selected ? (insufficient ? RED : OR) : SUB }} /> : <OpenInNew sx={{ fontSize: 20, color: selected ? OR : SUB }} />}
        <Typography fontWeight={700} fontSize={13.5} color={selected ? (insufficient ? RED : OR) : SUB2}>
          {isWallet ? 'Mon Wallet' : 'MonCash direct'}
        </Typography>
      </Box>
      {isWallet && balance != null && (
        <Typography fontSize={12} color={insufficient ? RED : GRN} fontWeight={600}>
          Solde: {balance.toLocaleString()} HTG {insufficient ? '— insuffisant' : '✓'}
        </Typography>
      )}
      {!isWallet && <Typography fontSize={12} color={SUB}>Redirigé vers MonCash pour payer le budget total</Typography>}
    </Box>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function AdsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen]     = useState(false);
  const [statsId, setStatsId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [form, setForm] = useState({
    name: '', targetType: 'PRODUCT' as 'PRODUCT' | 'STORE',
    productId: '', storeId: '',
    objective: 'TRAFFIC', totalBudget: 1000,
    dailyBudget: '', startDate: '', endDate: '',
    targetingMode: 'AUTO' as 'AUTO' | 'MANUAL',
    targetGenders: [] as string[], targetAgeMin: '', targetAgeMax: '',
    targetDepts: [] as string[], targetCategories: [] as string[],
    paymentMethod: 'WALLET' as 'WALLET' | 'MONCASH',
  });
  const resetForm = () => setForm({
    name: '', targetType: 'PRODUCT', productId: '', storeId: '',
    objective: 'TRAFFIC', totalBudget: 1000, dailyBudget: '', startDate: '', endDate: '',
    targetingMode: 'AUTO', targetGenders: [], targetAgeMin: '', targetAgeMax: '',
    targetDepts: [], targetCategories: [], paymentMethod: 'WALLET',
  });

  const hasToken = !!localStorage.getItem('accessToken');

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn: () => api.get('/ads/my').then(r => r.data),
    enabled: hasToken,
  });
  const { data: products } = useQuery({
    queryKey: ['seller-products-simple'],
    queryFn: () => api.get('/products/me?limit=200').then(r => r.data?.data || []),
    enabled: hasToken,
  });
  const { data: stores } = useQuery({
    queryKey: ['seller-stores-simple'],
    queryFn: () => api.get('/sellers/my-stores').then(r => r.data || []),
    enabled: hasToken,
  });
  const { data: stats } = useQuery({
    queryKey: ['campaign-stats', statsId],
    queryFn: () => statsId ? api.get(`/ads/my/${statsId}/stats`).then(r => r.data) : null,
    enabled: !!statsId,
  });
  const { data: wallet } = useQuery({
    queryKey: ['seller-wallet'],
    queryFn: () => api.get('/wallet').then(r => r.data),
    enabled: hasToken,
  });

  const pauseMut  = useMutation({ mutationFn: (id: string) => api.patch(`/ads/my/${id}/pause`),  onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }) });
  const resumeMut = useMutation({ mutationFn: (id: string) => api.patch(`/ads/my/${id}/resume`), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }) });
  const cancelMut = useMutation({ mutationFn: (id: string) => api.patch(`/ads/my/${id}/cancel`), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }) });

  // Payment state (for existing PENDING_PAYMENT campaigns)
  const [payOpen, setPayOpen]   = useState(false);
  const [payId, setPayId]       = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<'WALLET' | 'MONCASH'>('WALLET');
  const [payLoading, setPayLoading] = useState(false);
  const list = campaigns?.data || [];
  const openPay = (id: string) => { setPayId(id); setPayMethod('WALLET'); setPayOpen(true); };
  const payingCampaign = list.find((c: any) => c.id === payId);

  const totalSpent  = list.reduce((s: number, c: any) => s + Number(c.spent || 0), 0);
  const totalImpr   = list.reduce((s: number, c: any) => s + (c.impressions || 0), 0);
  const totalClicks = list.reduce((s: number, c: any) => s + (c.clicks || 0), 0);

  // Product items for selector
  const productItems: { id: string; name: string; sub?: string; img?: string }[] = useMemo(() =>
    (products || []).map((p: any) => ({
      id: p.id, name: p.name,
      sub: p.price ? `${Number(p.price).toLocaleString()} HTG` : undefined,
      img: p.images?.[0]?.urlThumb || p.images?.[0]?.urlMedium,
    })), [products]);

  // Store items for selector
  const storeItems: { id: string; name: string; sub?: string; img?: string }[] = useMemo(() =>
    (stores || []).map((s: any) => ({
      id: s.id, name: s.name,
      sub: s.city ? `${s.city}, ${s.department || ''}` : s.department,
      img: s.logoUrl,
    })), [stores]);

  const walletBalance = wallet?.balance ?? 0;

  // ── Submit: create then auto-pay ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name || !form.startDate || !form.endDate) {
      enqueueSnackbar('Veuillez remplir tous les champs requis', { variant: 'warning' }); return;
    }
    if (form.targetType === 'PRODUCT' && !form.productId) {
      enqueueSnackbar('Sélectionnez un produit à promouvoir', { variant: 'warning' }); return;
    }
    if (form.targetType === 'STORE' && !form.storeId) {
      enqueueSnackbar('Sélectionnez une boutique à promouvoir', { variant: 'warning' }); return;
    }

    setSubmitting(true);
    try {
      const isAuto = form.targetingMode === 'AUTO';
      const { data: campaign } = await api.post('/ads', {
        name: form.name,
        productId: form.targetType === 'PRODUCT' ? form.productId : undefined,
        storeId:   form.targetType === 'STORE'   ? form.storeId   : undefined,
        objective: form.objective,
        totalBudget: form.totalBudget,
        dailyBudget: form.dailyBudget ? Number(form.dailyBudget) : undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        targetingMode: form.targetingMode,
        targetGenders: isAuto ? [] : form.targetGenders,
        targetDepts: isAuto ? [] : form.targetDepts,
        targetCategories: isAuto ? [] : form.targetCategories,
        targetAgeMin: isAuto ? undefined : (form.targetAgeMin ? Number(form.targetAgeMin) : undefined),
        targetAgeMax: isAuto ? undefined : (form.targetAgeMax ? Number(form.targetAgeMax) : undefined),
      });

      const campaignId = campaign.id;
      qc.invalidateQueries({ queryKey: ['my-campaigns'] });

      if (form.paymentMethod === 'WALLET') {
        if (walletBalance >= form.totalBudget) {
          // Auto-pay with wallet
          try {
            await api.post(`/ads/my/${campaignId}/pay`, { method: 'WALLET' });
            qc.invalidateQueries({ queryKey: ['seller-wallet'] });
            enqueueSnackbar('Campagne créée et payée via Wallet — en cours de révision', { variant: 'success' });
          } catch {
            enqueueSnackbar('Campagne créée. Paiement wallet échoué — payez depuis la liste', { variant: 'warning' });
          }
        } else {
          enqueueSnackbar('Campagne créée en brouillon — solde wallet insuffisant, rechargez puis payez', { variant: 'warning' });
        }
        setOpen(false); resetForm();
      } else {
        // MonCash redirect
        setOpen(false); resetForm();
        try {
          const { data: pay } = await api.post('/payments/ad-campaign/initiate', { campaignId });
          localStorage.setItem('adCampaignPay', campaignId);
          window.location.href = pay.redirect_url;
        } catch (e: any) {
          enqueueSnackbar(e?.response?.data?.message || 'Impossible d\'initier MonCash', { variant: 'error' });
        }
      }
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur lors de la création', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Pay existing pending campaign ─────────────────────────────────────────
  const handlePayExisting = async () => {
    if (!payId) return;
    setPayLoading(true);
    try {
      if (payMethod === 'WALLET') {
        await api.post(`/ads/my/${payId}/pay`, { method: 'WALLET' });
        qc.invalidateQueries({ queryKey: ['my-campaigns'] });
        qc.invalidateQueries({ queryKey: ['seller-wallet'] });
        setPayOpen(false);
        enqueueSnackbar('Paiement effectué — campagne en révision', { variant: 'success' });
      } else {
        const { data: pay } = await api.post('/payments/ad-campaign/initiate', { campaignId: payId });
        localStorage.setItem('adCampaignPay', payId);
        setPayOpen(false);
        window.location.href = pay.redirect_url;
      }
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur de paiement', { variant: 'error' });
    } finally {
      setPayLoading(false);
    }
  };

  const toggleGender = (g: string) => setForm(f => ({ ...f, targetGenders: f.targetGenders.includes(g) ? f.targetGenders.filter(x => x !== g) : [...f.targetGenders, g] }));
  const toggleDept   = (d: string) => setForm(f => ({ ...f, targetDepts: f.targetDepts.includes(d) ? f.targetDepts.filter(x => x !== d) : [...f.targetDepts, d] }));
  const toggleCat    = (c: string) => setForm(f => ({ ...f, targetCategories: f.targetCategories.includes(c) ? f.targetCategories.filter(x => x !== c) : [...f.targetCategories, c] }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography fontWeight={900} fontSize={{ xs: 20, md: 24 }} color={TXT} letterSpacing="-0.5px">Mes Publicités</Typography>
          <Typography fontSize={13} color={SUB}>Boostez vos produits et augmentez vos ventes</Typography>
        </Box>
        <Button onClick={() => setOpen(true)} startIcon={<Add sx={{ fontSize: 18 }} />}
          sx={{ bgcolor: OR, color: '#fff', borderRadius: '12px', fontWeight: 700, px: 2.5, py: 1.2, textTransform: 'none',
            boxShadow: '0 4px 14px rgba(255,107,0,0.28)', '&:hover': { bgcolor: '#E05A00' } }}>
          Créer une pub
        </Button>
      </Box>

      {/* KPI cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 3 }}>
        {[
          { label: 'Total dépensé', value: `${totalSpent.toLocaleString()} HTG`, icon: <FlashOn sx={{ fontSize: 20 }} />, color: OR },
          { label: 'Impressions', value: totalImpr.toLocaleString(), icon: <Visibility sx={{ fontSize: 20 }} />, color: PUR },
          { label: 'Clics', value: totalClicks.toLocaleString(), icon: <TouchApp sx={{ fontSize: 20 }} />, color: GRN },
          { label: 'CTR moyen', value: totalImpr > 0 ? `${((totalClicks / totalImpr) * 100).toFixed(1)}%` : '0%', icon: <TrendingUp sx={{ fontSize: 20 }} />, color: BLU },
        ].map(({ label, value, icon, color }) => (
          <Box key={label} sx={{ p: 2, borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</Box>
              <Typography fontSize={11} color={SUB} fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</Typography>
            </Box>
            <Typography fontWeight={900} fontSize={22} color={TXT} letterSpacing="-0.5px">{value}</Typography>
          </Box>
        ))}
      </Box>

      {/* Info banner */}
      <Box sx={{ mb: 3, p: 2, borderRadius: '14px', bgcolor: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.18)', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: 'rgba(255,107,0,0.14)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.2 }}>
          <Campaign sx={{ fontSize: 17, color: OR }} />
        </Box>
        <Typography fontSize={13} color={SUB2} lineHeight={1.6}>
          <strong style={{ color: TXT }}>Comment ça marche ?</strong> Créez une campagne, choisissez votre budget et audience.
          Après validation, vos produits sont affichés en priorité.{' '}
          <span style={{ color: OR, fontWeight: 700 }}>15 HTG / 1 000 impressions · 8 HTG / clic</span>
        </Typography>
      </Box>

      {/* Campaign list */}
      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} height={110} sx={{ borderRadius: '16px', bgcolor: 'rgba(15,23,42,0.09)', transform: 'none' }} />)}
        </Box>
      ) : list.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12, borderRadius: '20px', bgcolor: CARD, border: `1px dashed rgba(15,23,42,0.09)` }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '24px', bgcolor: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <Campaign sx={{ fontSize: 36, color: OR }} />
          </Box>
          <Typography fontWeight={800} fontSize={17} color={TXT} mb={0.8}>Aucune campagne publicitaire</Typography>
          <Typography fontSize={13.5} color={SUB} mb={3.5}>Créez votre première pub pour booster vos ventes sur DealPam</Typography>
          <Button startIcon={<Add />} onClick={() => setOpen(true)}
            sx={{ bgcolor: OR, color: '#fff', borderRadius: '12px', fontWeight: 700, px: 3, py: 1.2, textTransform: 'none', boxShadow: '0 4px 14px rgba(255,107,0,0.3)', '&:hover': { bgcolor: '#E05A00' } }}>
            Créer ma première campagne
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {list.map((c: any) => {
            const img = c.product?.images?.[0]?.urlThumb || c.product?.images?.[0]?.urlMedium || c.store?.logoUrl;
            const pct = Math.min(100, (Number(c.spent) / Number(c.totalBudget)) * 100);
            const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0';
            const daysLeft = Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000));
            const sc = statusColor(c.status);
            const expanded = statsId === c.id;
            const isStore = !c.productId && c.storeId;
            return (
              <Box key={c.id} sx={{ borderRadius: '18px', bgcolor: CARD, border: `1px solid ${BORD}`, transition: 'all 0.15s', '&:hover': { borderColor: 'rgba(15,23,42,0.09)' }, overflow: 'hidden' }}>
                <Box sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Avatar variant="rounded" src={img}
                      sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: isStore ? 'rgba(59,130,246,0.1)' : 'rgba(255,107,0,0.1)', border: `1px solid ${BORD}`, flexShrink: 0 }}>
                      {isStore ? <Store sx={{ fontSize: 26, color: BLU }} /> : undefined}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                        <Typography fontWeight={800} fontSize={14.5} color={TXT} noWrap>{c.name}</Typography>
                        <Box sx={{ px: 1, py: 0.15, borderRadius: '6px', bgcolor: `${sc}18`, border: `1px solid ${sc}40` }}>
                          <Typography fontSize={10.5} fontWeight={800} color={sc}>{statusLabel(c.status)}</Typography>
                        </Box>
                        {isStore && (
                          <Box sx={{ px: 1, py: 0.15, borderRadius: '6px', bgcolor: `${BLU}18`, border: `1px solid ${BLU}30` }}>
                            <Typography fontSize={10} fontWeight={700} color={BLU}>Boutique</Typography>
                          </Box>
                        )}
                      </Box>
                      <Typography fontSize={12} color={SUB} noWrap mb={0.8}>{isStore ? c.store?.name : c.product?.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap' }}>
                        {c.targetDepts?.length > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.3, borderRadius: '6px', bgcolor: `${PUR}14`, border: `1px solid ${PUR}30` }}>
                            <LocationOn sx={{ fontSize: 11, color: PUR }} />
                            <Typography fontSize={10.5} color={PUR} fontWeight={600}>{c.targetDepts.slice(0,2).join(', ')}{c.targetDepts.length > 2 ? ` +${c.targetDepts.length-2}` : ''}</Typography>
                          </Box>
                        )}
                        <Box sx={{ px: 1, py: 0.3, borderRadius: '6px', bgcolor: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.25)' }}>
                          <Typography fontSize={10.5} color={OR} fontWeight={700}>{daysLeft}j restants</Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2.5, alignItems: 'center', flexShrink: 0 }}>
                      {[
                        { lbl: 'Impressions', val: c.impressions?.toLocaleString() ?? '0', color: PUR },
                        { lbl: 'Clics', val: c.clicks?.toLocaleString() ?? '0', color: GRN },
                        { lbl: 'CTR', val: `${ctr}%`, color: BLU },
                        { lbl: 'Dépensé', val: `${Number(c.spent).toLocaleString()} HTG`, color: OR },
                      ].map(({ lbl, val, color }) => (
                        <Box key={lbl} sx={{ textAlign: 'center' }}>
                          <Typography fontWeight={800} fontSize={15} color={color}>{val}</Typography>
                          <Typography fontSize={10} color={SUB}>{lbl}</Typography>
                        </Box>
                      ))}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
                      <Box onClick={() => setStatsId(expanded ? null : c.id)}
                        sx={{ width: 32, height: 32, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: expanded ? `${PUR}55` : BORD, bgcolor: expanded ? `${PUR}14` : 'transparent', '&:hover': { borderColor: `${PUR}44`, bgcolor: `${PUR}10` } }}>
                        <BarChart sx={{ fontSize: 15, color: expanded ? PUR : SUB }} />
                      </Box>
                      {c.status === 'ACTIVE' && (
                        <Box onClick={() => pauseMut.mutate(c.id)}
                          sx={{ width: 32, height: 32, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${BORD}`, '&:hover': { borderColor: `${YLW}55`, bgcolor: `${YLW}10` } }}>
                          <Pause sx={{ fontSize: 15, color: YLW }} />
                        </Box>
                      )}
                      {c.status === 'PAUSED' && (
                        <Box onClick={() => resumeMut.mutate(c.id)}
                          sx={{ width: 32, height: 32, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${BORD}`, '&:hover': { borderColor: `${GRN}55`, bgcolor: `${GRN}10` } }}>
                          <PlayArrow sx={{ fontSize: 15, color: GRN }} />
                        </Box>
                      )}
                      {c.status === 'PENDING_PAYMENT' && (
                        <Box onClick={() => openPay(c.id)}
                          sx={{ px: 1.5, py: 0.6, borderRadius: '8px', cursor: 'pointer', bgcolor: BLU, '&:hover': { bgcolor: '#2563EB' } }}>
                          <Typography fontSize={12} fontWeight={700} color="#fff">Payer</Typography>
                        </Box>
                      )}
                      {!['COMPLETED', 'CANCELLED', 'REJECTED', 'PENDING_PAYMENT'].includes(c.status) && (
                        <Box onClick={() => cancelMut.mutate(c.id)}
                          sx={{ width: 32, height: 32, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${BORD}`, '&:hover': { borderColor: `${RED}55`, bgcolor: `${RED}10` } }}>
                          <Cancel sx={{ fontSize: 15, color: RED }} />
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography fontSize={11} color={SUB}>Budget utilisé</Typography>
                      <Typography fontSize={11} fontWeight={700} color={pct > 80 ? RED : SUB2}>
                        {Number(c.spent).toLocaleString()} / {Number(c.totalBudget).toLocaleString()} HTG ({pct.toFixed(0)}%)
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(15,23,42,0.09)', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: pct > 80 ? RED : OR } }} />
                  </Box>
                </Box>

                {expanded && stats && (
                  <Box sx={{ px: 2.5, pb: 2.5 }}>
                    <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
                      <Typography fontWeight={700} fontSize={12} color={SUB} mb={1.5} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Performance détaillée</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1 }}>
                        {[
                          { lbl: 'CTR', val: `${stats.ctr}%`, color: PUR },
                          { lbl: 'CPC moyen', val: `${Number(stats.cpc).toFixed(0)} HTG`, color: GRN },
                          { lbl: 'Budget restant', val: `${Number(stats.remaining).toLocaleString()} HTG`, color: OR },
                          { lbl: 'Jours restants', val: `${stats.daysLeft}j`, color: BLU },
                        ].map(({ lbl, val, color }) => (
                          <Box key={lbl} sx={{ textAlign: 'center', p: 1.5, borderRadius: '10px', bgcolor: `${color}0d`, border: `1px solid ${color}20` }}>
                            <Typography fontWeight={900} fontSize={17} color={color}>{val}</Typography>
                            <Typography fontSize={10.5} color={SUB}>{lbl}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Create Campaign Dialog ── */}
      <Dialog open={open} onClose={() => !submitting && setOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '20px', color: TXT } }}>
        <DialogTitle sx={{ color: TXT, fontWeight: 900, fontSize: 18, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(255,107,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Campaign sx={{ fontSize: 18, color: OR }} />
          </Box>
          Créer une campagne
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            {/* Campaign name */}
            <Grid item xs={12}>
              <TextField fullWidth label="Nom de la campagne *" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} sx={fieldSx} />
            </Grid>

            {/* Target type toggle */}
            <Grid item xs={12}>
              <Typography fontSize={12} fontWeight={700} color={SUB} mb={1.2} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Promouvoir
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.2, mb: 1.5 }}>
                {([
                  { type: 'PRODUCT', icon: Inventory, label: 'Un produit', desc: 'Promouvoir un article spécifique' },
                  { type: 'STORE',   icon: Store,     label: 'Une boutique', desc: 'Promouvoir toute votre boutique' },
                ] as const).map(({ type, icon: Icon, label, desc }) => {
                  const sel = form.targetType === type;
                  return (
                    <Box key={type} onClick={() => setForm(f => ({ ...f, targetType: type, productId: '', storeId: '' }))}
                      sx={{ flex: 1, cursor: 'pointer', p: 1.8, borderRadius: '12px', transition: 'all 0.15s', border: `1.5px solid ${sel ? OR : BORD}`, bgcolor: sel ? 'rgba(255,107,0,0.08)' : 'rgba(15,23,42,0.09)', '&:hover': { borderColor: sel ? OR : 'rgba(15,23,42,0.09)' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                        <Icon sx={{ fontSize: 17, color: sel ? OR : SUB }} />
                        <Typography fontWeight={700} fontSize={13} color={sel ? OR : TXT}>{label}</Typography>
                      </Box>
                      <Typography fontSize={11} color={SUB}>{desc}</Typography>
                    </Box>
                  );
                })}
              </Box>

              {/* Searchable selector */}
              {form.targetType === 'PRODUCT' ? (
                <SearchableSelector
                  items={productItems}
                  value={form.productId}
                  onChange={id => setForm(f => ({ ...f, productId: id }))}
                  placeholder="Rechercher un produit à promouvoir *"
                />
              ) : (
                <SearchableSelector
                  items={storeItems}
                  value={form.storeId}
                  onChange={id => setForm(f => ({ ...f, storeId: id }))}
                  placeholder="Rechercher une boutique à promouvoir *"
                />
              )}
            </Grid>

            {/* Objective */}
            <Grid item xs={12} md={6}>
              <Typography fontSize={12} fontWeight={700} color={SUB} mb={1} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Objectif</Typography>
              <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                {[
                  { value: 'TRAFFIC', label: 'Trafic', icon: <TouchApp sx={{ fontSize: 14 }} /> },
                  { value: 'AWARENESS', label: 'Notoriété', icon: <Visibility sx={{ fontSize: 14 }} /> },
                  { value: 'CONVERSIONS', label: 'Conversions', icon: <ShoppingCart sx={{ fontSize: 14 }} /> },
                ].map(o => {
                  const sel = form.objective === o.value;
                  return (
                    <Box key={o.value} onClick={() => setForm(f => ({ ...f, objective: o.value }))}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.7, px: 1.4, py: 0.7, borderRadius: '8px', cursor: 'pointer', border: `1px solid ${sel ? OR : BORD}`, bgcolor: sel ? 'rgba(255,107,0,0.1)' : 'transparent', transition: 'all 0.15s' }}>
                      <Box sx={{ color: sel ? OR : SUB }}>{o.icon}</Box>
                      <Typography fontSize={12} fontWeight={700} color={sel ? OR : SUB2}>{o.label}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Grid>

            {/* Budget */}
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Budget total (HTG) *" type="number"
                value={form.totalBudget} inputProps={{ min: 500, step: 100 }}
                onChange={e => setForm(f => ({ ...f, totalBudget: Number(e.target.value) }))}
                helperText="Minimum 500 HTG" sx={fieldSx} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Budget quotidien — optionnel" type="number"
                value={form.dailyBudget} onChange={e => setForm(f => ({ ...f, dailyBudget: e.target.value }))}
                helperText="Vide = pas de limite journalière" sx={fieldSx} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Date de début *" type="date" value={form.startDate}
                InputLabelProps={{ shrink: true }} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} sx={fieldSx} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Date de fin *" type="date" value={form.endDate}
                InputLabelProps={{ shrink: true }} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} sx={fieldSx} />
            </Grid>

            {/* Targeting */}
            <Grid item xs={12}>
              <Typography fontSize={12} fontWeight={700} color={SUB} mb={1.5} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ciblage de l'audience</Typography>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                {[
                  { mode: 'AUTO', icon: <AutoAwesome sx={{ fontSize: 16 }} />, label: 'Automatique', desc: "L'algorithme optimise votre audience" },
                  { mode: 'MANUAL', icon: <Tune sx={{ fontSize: 16 }} />, label: 'Manuel', desc: 'Définissez genre, âge et zone' },
                ].map(({ mode, icon, label, desc }) => {
                  const sel = form.targetingMode === mode;
                  return (
                    <Box key={mode} onClick={() => setForm(f => ({ ...f, targetingMode: mode as any }))}
                      sx={{ flex: 1, cursor: 'pointer', p: 1.8, borderRadius: '12px', transition: 'all 0.15s', border: `1.5px solid ${sel ? OR : BORD}`, bgcolor: sel ? 'rgba(255,107,0,0.08)' : 'rgba(15,23,42,0.09)', '&:hover': { borderColor: sel ? OR : 'rgba(15,23,42,0.09)' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4, color: sel ? OR : SUB }}>{icon}
                        <Typography fontWeight={700} fontSize={13} color={sel ? OR : TXT}>{label}</Typography>
                      </Box>
                      <Typography fontSize={11} color={SUB}>{desc}</Typography>
                    </Box>
                  );
                })}
              </Box>

              {form.targetingMode === 'MANUAL' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography fontSize={11} fontWeight={700} color={SUB} mb={1} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Genre cible</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {[{ val: 'MALE', label: 'Hommes' }, { val: 'FEMALE', label: 'Femmes' }].map(({ val, label }) => (
                        <Pill key={val} active={form.targetGenders.includes(val)} onClick={() => toggleGender(val)} color="#DB2777">{label}</Pill>
                      ))}
                      <Typography fontSize={11} color={SUB} sx={{ alignSelf: 'center' }}>vide = tous</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography fontSize={11} fontWeight={700} color={SUB} mb={1} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tranche d'âge</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <TextField label="Min" type="number" value={form.targetAgeMin} inputProps={{ min: 13 }}
                        onChange={e => setForm(f => ({ ...f, targetAgeMin: e.target.value }))} sx={{ ...fieldSx, width: 90 }} />
                      <Typography color={SUB}>—</Typography>
                      <TextField label="Max" type="number" value={form.targetAgeMax} inputProps={{ min: 13 }}
                        onChange={e => setForm(f => ({ ...f, targetAgeMax: e.target.value }))} sx={{ ...fieldSx, width: 90 }} />
                      <Typography fontSize={11} color={SUB}>ans (vide = tous)</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography fontSize={11} fontWeight={700} color={SUB} mb={1} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zones géographiques</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
                      {DEPTS.map(d => <Pill key={d} active={form.targetDepts.includes(d)} onClick={() => toggleDept(d)} color={PUR}>{d}</Pill>)}
                    </Box>
                    {form.targetDepts.length === 0 && <Typography fontSize={11} color={SUB} mt={0.5}>Vide = toute Haïti</Typography>}
                  </Box>
                  <Box>
                    <Typography fontSize={11} fontWeight={700} color={SUB} mb={1} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Catégories d'intérêt</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
                      {CATEGORIES.map(c => <Pill key={c.slug} active={form.targetCategories.includes(c.slug)} onClick={() => toggleCat(c.slug)} color={GRN}>{c.name}</Pill>)}
                    </Box>
                  </Box>
                </Box>
              )}
            </Grid>

            {/* Estimation */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(255,107,0,0.07)', border: '1px solid rgba(255,107,0,0.2)' }}>
                <Typography fontWeight={700} fontSize={12} color={OR} mb={1.5} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estimation de portée</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}>
                  {[
                    { lbl: 'Impressions', val: `~${Math.round(form.totalBudget / 0.015).toLocaleString()}` },
                    { lbl: 'Clics (CTR 3%)', val: `~${Math.round((form.totalBudget / 0.015) * 0.03).toLocaleString()}` },
                    { lbl: 'Durée', val: form.startDate && form.endDate ? `${Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000)}j` : '—' },
                  ].map(({ lbl, val }) => (
                    <Box key={lbl}>
                      <Typography fontSize={20} fontWeight={900} color={OR}>{val}</Typography>
                      <Typography fontSize={11} color={SUB2}>{lbl}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>

            {/* Payment method */}
            <Grid item xs={12}>
              <Typography fontSize={12} fontWeight={700} color={SUB} mb={1.2} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Méthode de paiement</Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <PayMethodCard method="WALLET"  selected={form.paymentMethod === 'WALLET'}  onClick={() => setForm(f => ({ ...f, paymentMethod: 'WALLET' }))}  balance={walletBalance} budget={form.totalBudget} />
                <PayMethodCard method="MONCASH" selected={form.paymentMethod === 'MONCASH'} onClick={() => setForm(f => ({ ...f, paymentMethod: 'MONCASH' }))} budget={form.totalBudget} />
              </Box>
              {form.paymentMethod === 'WALLET' && walletBalance < form.totalBudget && (
                <Box sx={{ mt: 1.2, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <Typography fontSize={12.5} color={YLW}>
                    Solde insuffisant ({walletBalance.toLocaleString()} HTG / {form.totalBudget.toLocaleString()} HTG requis). La campagne sera créée en <strong>brouillon</strong> — rechargez votre wallet puis payez depuis la liste.
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => { setOpen(false); resetForm(); }} disabled={submitting} sx={{ color: SUB2, borderRadius: '10px', textTransform: 'none' }}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting}
            endIcon={submitting ? <CircularProgress size={14} color="inherit" /> : (form.paymentMethod === 'MONCASH' ? <OpenInNew sx={{ fontSize: 15 }} /> : undefined)}
            sx={{ bgcolor: OR, color: '#fff', borderRadius: '10px', fontWeight: 700, px: 3, textTransform: 'none', boxShadow: '0 4px 12px rgba(255,107,0,0.3)', '&:hover': { bgcolor: '#E05A00' }, '&:disabled': { bgcolor: 'rgba(15,23,42,0.09)', color: SUB } }}>
            {submitting ? 'Création…' : form.paymentMethod === 'MONCASH' ? 'Créer & payer via MonCash →' : 'Créer la campagne →'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Payment Dialog (existing PENDING_PAYMENT) ── */}
      <Dialog open={payOpen} onClose={() => !payLoading && setPayOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '20px', color: TXT } }}>
        <DialogTitle sx={{ color: TXT, fontWeight: 900, fontSize: 17 }}>Payer la campagne</DialogTitle>
        <DialogContent>
          {payingCampaign && (
            <Box sx={{ mb: 2, p: 1.8, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
              <Typography fontSize={13.5} fontWeight={700} color={TXT} mb={0.3}>{payingCampaign.name}</Typography>
              <Typography fontSize={13} color={OR} fontWeight={800}>{Number(payingCampaign.totalBudget).toLocaleString()} HTG</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
            <PayMethodCard method="WALLET"  selected={payMethod === 'WALLET'}  onClick={() => setPayMethod('WALLET')}  balance={walletBalance} budget={payingCampaign?.totalBudget ?? 0} />
            <PayMethodCard method="MONCASH" selected={payMethod === 'MONCASH'} onClick={() => setPayMethod('MONCASH')} budget={payingCampaign?.totalBudget ?? 0} />
          </Box>
          {payMethod === 'WALLET' && payingCampaign && walletBalance < payingCampaign.totalBudget && (
            <Box sx={{ mt: 1, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Typography fontSize={12.5} color={YLW}>Solde insuffisant. Rechargez votre wallet d'abord.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setPayOpen(false)} disabled={payLoading} sx={{ color: SUB2, borderRadius: '10px', textTransform: 'none' }}>Annuler</Button>
          <Button onClick={handlePayExisting} disabled={payLoading || (payMethod === 'WALLET' && payingCampaign && walletBalance < payingCampaign.totalBudget)}
            endIcon={payLoading ? <CircularProgress size={14} color="inherit" /> : (payMethod === 'MONCASH' ? <OpenInNew sx={{ fontSize: 15 }} /> : undefined)}
            sx={{ bgcolor: OR, color: '#fff', fontWeight: 700, borderRadius: '10px', px: 2.5, textTransform: 'none', '&:hover': { bgcolor: '#E05A00' }, '&:disabled': { bgcolor: 'rgba(15,23,42,0.09)', color: SUB } }}>
            {payLoading ? 'En cours…' : payMethod === 'MONCASH' ? 'Payer via MonCash →' : 'Confirmer le paiement Wallet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
