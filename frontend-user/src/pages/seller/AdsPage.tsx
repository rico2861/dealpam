import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Button, Grid, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Avatar, Collapse, CircularProgress, Tooltip,
} from '@mui/material';
import {
  Add, Campaign, TrendingUp, Visibility, TouchApp, ShoppingCart,
  Pause, PlayArrow, Cancel, BarChart, FlashOn, LocationOn,
  AutoAwesome, Tune, AccountBalanceWallet, Store, Inventory,
  Search, CheckCircle, OpenInNew, Lock, Insights, PictureAsPdf, TableChart, Download, Close,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { ListSkeleton } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const SUB2 = '#64748B';
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

// NestJS renvoie parfois `message` sous forme de tableau (plusieurs erreurs de
// validation class-validator à la fois) — sans ce garde-fou, ce tableau finissait
// tel quel dans le toast (rendu illisible/vide selon le cas) au lieu d'un message clair.
function extractErrorMessage(e: any, fallback: string): string {
  const msg = e?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' — ');
  return msg || fallback;
}

const DEPTS = ['Ouest', 'Nord', 'Nord-Est', 'Nord-Ouest', 'Artibonite', 'Centre', 'Sud', 'Sud-Est', 'Grande-Anse', 'Nippes'];
// Liste fixe de centres d'intérêt — ciblage manuel simple (tags choisis à la
// main), pas une inférence comportementale/ML.
const INTERESTS = ['Mode', 'Technologie', 'Sport', 'Beauté', 'Maison', 'Automobile', 'Alimentation', 'Voyage', 'Enfants', 'Gaming'];
const MAX_PRODUCTS = 10;
// Valeurs de repli tant que /ads/settings n'a pas encore répondu — remplacées
// dès que possible par les tarifs réels configurés par l'admin (voir `settings`
// query plus bas). Ne pas modifier ces nombres directement : ils sont purement
// des placeholders d'affichage avant le premier chargement.
const FALLBACK_MIN_BUDGET = 250;
const FALLBACK_CPM = 150;
const FALLBACK_CPC = 25;

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
const scoreColor = (score: number) => (score >= 70 ? GRN : score >= 45 ? YLW : RED);

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

// ── Multi-select searchable selector (produits — jusqu'à MAX_PRODUCTS) ──────

function MultiSearchableSelector({
  items, value, onChange, placeholder, max,
}: { items: SelectorItem[]; value: string[]; onChange: (ids: string[]) => void; placeholder: string; max: number }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() =>
    q.trim() ? items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()) || (i.sub ?? '').toLowerCase().includes(q.toLowerCase())) : items,
    [q, items]);

  const selectedItems = items.filter(i => value.includes(i.id));
  const atMax = value.length >= max;

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter(x => x !== id));
    else if (!atMax) onChange([...value, id]);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Selected chips */}
      {selectedItems.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7, mb: 1 }}>
          {selectedItems.map(item => (
            <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.6, pl: 0.8, pr: 1, py: 0.4, borderRadius: '20px', bgcolor: `${OR}14`, border: `1px solid ${OR}40` }}>
              {item.img
                ? <Avatar src={item.img} variant="rounded" sx={{ width: 20, height: 20, borderRadius: '5px' }} />
                : <Box sx={{ width: 20, height: 20, borderRadius: '5px', bgcolor: `${OR}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Inventory sx={{ fontSize: 11, color: OR }} /></Box>}
              <Typography fontSize={12} fontWeight={600} color={OR} noWrap sx={{ maxWidth: 140 }}>{item.name}</Typography>
              <Box onClick={() => toggle(item.id)} sx={{ cursor: 'pointer', display: 'flex', color: OR, opacity: 0.7, '&:hover': { opacity: 1 } }}><Close sx={{ fontSize: 13 }} /></Box>
            </Box>
          ))}
        </Box>
      )}

      <Box onClick={() => setOpen(p => !p)}
        sx={{ p: '10px 14px', borderRadius: '12px', cursor: 'pointer', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${open ? OR : BORD}`, display: 'flex', alignItems: 'center', gap: 1.2, transition: 'all 0.15s', '&:hover': { borderColor: 'rgba(15,23,42,0.09)' } }}>
        <Search sx={{ fontSize: 16, color: SUB, flexShrink: 0 }} />
        <Typography fontSize={13} color={SUB}>
          {selectedItems.length > 0 ? `${selectedItems.length}/${max} sélectionné${selectedItems.length > 1 ? 's' : ''} — ajouter…` : placeholder}
        </Typography>
      </Box>

      <Collapse in={open}>
        <Box sx={{ mt: 0.5, borderRadius: '12px', bgcolor: '#F7F8FA', border: `1px solid ${BORD}`, overflow: 'hidden', boxShadow: '0 8px 30px rgba(15,23,42,0.15)' }}>
          <Box sx={{ p: 1.2, borderBottom: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Search sx={{ fontSize: 15, color: SUB, flexShrink: 0 }} />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Rechercher…" autoFocus
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: TXT, padding: '2px 0' }} />
          </Box>
          {atMax && (
            <Box sx={{ px: 1.5, py: 0.8, bgcolor: `${YLW}14`, borderBottom: `1px solid ${BORD}` }}>
              <Typography fontSize={11.5} color={YLW} fontWeight={600}>Maximum {max} produits atteint — désélectionnez-en un pour en ajouter un autre.</Typography>
            </Box>
          )}
          <Box sx={{ maxHeight: 220, overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(15,23,42,0.09)', borderRadius: 2 } }}>
            {filtered.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}><Typography fontSize={13} color={SUB}>Aucun résultat</Typography></Box>
            ) : filtered.map(item => {
              const sel = value.includes(item.id);
              const disabled = !sel && atMax;
              return (
                <Box key={item.id} onClick={() => !disabled && toggle(item.id)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.2, px: 1.5, py: 1, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, transition: 'all 0.1s', bgcolor: sel ? `${OR}12` : 'transparent', '&:hover': disabled ? {} : { bgcolor: 'rgba(15,23,42,0.04)' } }}>
                  {item.img
                    ? <Avatar src={item.img} variant="rounded" sx={{ width: 32, height: 32, borderRadius: '7px', flexShrink: 0 }} />
                    : <Box sx={{ width: 32, height: 32, borderRadius: '7px', bgcolor: `${OR}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Inventory sx={{ fontSize: 15, color: OR }} /></Box>}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontSize={13} fontWeight={600} color={TXT} noWrap>{item.name}</Typography>
                    {item.sub && <Typography fontSize={11} color={SUB} noWrap>{item.sub}</Typography>}
                  </Box>
                  {sel && <CheckCircle sx={{ fontSize: 14, color: GRN, flexShrink: 0 }} />}
                </Box>
              );
            })}
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
    <Box onClick={onClick} sx={{ flex: '1 1 180px', p: 2, borderRadius: '14px', cursor: 'pointer', border: `1.5px solid ${color}`, bgcolor: selected ? `${color}10` : 'rgba(15,23,42,0.09)', transition: 'all 0.15s', '&:hover': { borderColor: selected ? color : 'rgba(15,23,42,0.09)' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
        {isWallet ? <AccountBalanceWallet sx={{ fontSize: 20, color: selected ? (insufficient ? RED : OR) : SUB }} /> : <OpenInNew sx={{ fontSize: 20, color: selected ? OR : SUB }} />}
        <Typography fontWeight={700} fontSize={13.5} color={selected ? (insufficient ? RED : OR) : SUB2}>
          {isWallet ? 'Mon Wallet' : 'MonCash direct'}
        </Typography>
      </Box>
      {isWallet && balance != null && (
        <Typography fontSize={12} color={insufficient ? RED : GRN} fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          Solde: {balance.toLocaleString()} HTG {insufficient ? '— insuffisant' : <CheckCircle sx={{ fontSize: 13 }} />}
        </Typography>
      )}
      {!isWallet && <Typography fontSize={12} color={SUB}>Vous serez redirigé vers MonCash pour payer {budget.toLocaleString()} HTG</Typography>}
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
  const [formError, setFormError]   = useState('');

  // Form
  const [form, setForm] = useState({
    name: '', targetType: 'PRODUCT' as 'PRODUCT' | 'STORE',
    productIds: [] as string[], storeId: '',
    objective: 'TRAFFIC', totalBudget: 1000,
    dailyBudget: '', startDate: '', startTime: '09:00', endDate: '',
    targetingMode: 'AUTO' as 'AUTO' | 'MANUAL',
    targetGenders: [] as string[], targetAgeMin: '', targetAgeMax: '',
    targetDepts: [] as string[], targetCategories: [] as string[], targetInterests: [] as string[],
    paymentMethod: 'WALLET' as 'WALLET' | 'MONCASH',
  });
  const resetForm = () => {
    setForm({
      name: '', targetType: 'PRODUCT', productIds: [], storeId: '',
      objective: 'TRAFFIC', totalBudget: 1000, dailyBudget: '', startDate: '', startTime: '09:00', endDate: '',
      targetingMode: 'AUTO', targetGenders: [], targetAgeMin: '', targetAgeMax: '',
      targetDepts: [], targetCategories: [], targetInterests: [], paymentMethod: 'WALLET',
    });
    setFormError('');
  };

  const hasToken = !!localStorage.getItem('accessToken');

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn: () => api.get('/ads/my').then(r => r.data),
    enabled: hasToken,
  });
  const showSkel = useDelayedLoading(isLoading);
  const { data: products } = useQuery({
    queryKey: ['seller-products-simple'],
    queryFn: () => api.get('/products/me?limit=200').then(r => r.data?.data || []),
    enabled: hasToken,
  });
  const { data: stores } = useQuery({
    queryKey: ['seller-stores-simple'],
    queryFn: () => api.get('/stores/me/all').then(r => r.data?.stores || []),
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
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
    enabled: hasToken,
  });
  const categoryList: { slug: string; name: string }[] = categoriesData ?? [];

  // Palier d'abonnement du vendeur — même pattern que StatisticsPage.tsx :
  // hasKeywordTargeting distingue les plans BUSINESS/ELITE (ciblage avancé
  // par mots-clés/centres d'intérêt déjà prévu pour ça) des plans STARTER/BASIC.
  // Réutilisé ici pour gater le ciblage par intérêts, la vue avancée
  // (score de performance + suggestions) et les exports.
  const { data: currentSub } = useQuery({
    queryKey: ['sellerSub'],
    queryFn: () => api.get('/subscriptions/me').then(r => r.data).catch(() => null),
    enabled: hasToken,
  });
  const hasKeywordTargeting = !!currentSub?.plan?.hasKeywordTargeting;

  // Tarifs publicitaires (budget minimum, CPM, CPC) — configurables par l'admin.
  // Route publique en lecture seule : pas besoin d'être connecté pour voir les
  // tarifs affichés dans le bandeau "Comment ça marche ?".
  const { data: adSettings } = useQuery({
    queryKey: ['ads-settings'],
    queryFn: () => api.get('/ads/settings').then(r => r.data),
  });
  const MIN_BUDGET = adSettings?.minBudgetHTG ?? FALLBACK_MIN_BUDGET;
  const CPM_RATE = adSettings?.cpmRateHTG ?? FALLBACK_CPM;
  const CPC_RATE = adSettings?.cpcRateHTG ?? FALLBACK_CPC;

  // Filet de sécurité : si un dialog MUI reste monté/démonté dans un état
  // incohérent (ex: erreur pendant la fermeture d'un dialog empêchant son
  // cleanup), body peut rester bloqué en overflow:hidden pour toute la page,
  // ce qui casse Page Up/Page Down partout sur le site. On force la remise à
  // zéro au démontage de cette page, par précaution.
  useEffect(() => {
    return () => { document.body.style.overflow = ''; };
  }, []);

  const pauseMut  = useMutation({ mutationFn: (id: string) => api.patch(`/ads/my/${id}/pause`),  onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }) });
  const resumeMut = useMutation({ mutationFn: (id: string) => api.patch(`/ads/my/${id}/resume`), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }) });
  const cancelMut = useMutation({ mutationFn: (id: string) => api.patch(`/ads/my/${id}/cancel`), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }) });

  // ── Publish (manual go-live) ──────────────────────────────────────────────
  const [publishId, setPublishId] = useState<string | null>(null);
  const [publishAt, setPublishAt] = useState('');
  const [publishLoading, setPublishLoading] = useState(false);
  const toLocalInputValue = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const openPublish = (id: string) => { setPublishId(id); setPublishAt(toLocalInputValue(new Date())); };
  const handlePublish = async () => {
    if (!publishId || !publishAt) return;
    setPublishLoading(true);
    try {
      await api.patch(`/ads/my/${publishId}/publish`, { publishAt: new Date(publishAt).toISOString() });
      qc.invalidateQueries({ queryKey: ['my-campaigns'] });
      setPublishId(null);
      enqueueSnackbar('Campagne publiée', { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar(extractErrorMessage(e, 'Erreur lors de la publication'), { variant: 'error' });
    } finally {
      setPublishLoading(false);
    }
  };

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

  // ── Exports (CSV/Excel/PDF) — réservés aux plans Business/Elite, même
  // pattern (bibliothèques, imports dynamiques) que StatisticsPage.tsx ──────
  const exportRows = () => list.map((c: any) => {
    const impr = c.impressions || 0;
    const clicks = c.clicks || 0;
    return {
      Nom: c.name,
      Statut: statusLabel(c.status),
      'Budget total (HTG)': Number(c.totalBudget) || 0,
      'Dépensé (HTG)': Number(c.spent) || 0,
      Impressions: impr,
      Clics: clicks,
      'CTR (%)': impr > 0 ? Number(((clicks / impr) * 100).toFixed(2)) : 0,
      'Date de début': new Date(c.startDate).toLocaleDateString('fr-FR'),
      'Date de fin': new Date(c.endDate).toLocaleDateString('fr-FR'),
    };
  });

  function handleExportCsv() {
    const rows = exportRows();
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `campagnes-pub-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportExcel() {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(exportRows());
    XLSX.utils.book_append_sheet(wb, sheet, 'Campagnes');
    XLSX.writeFile(wb, `campagnes-pub-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function handleExportPdf() {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Campagnes publicitaires — DealPam', 14, 15);
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 21);
    const rows = exportRows();
    autoTable(doc, {
      startY: 27,
      head: [['Nom', 'Statut', 'Budget', 'Dépensé', 'Impr.', 'Clics', 'CTR', 'Début', 'Fin']],
      body: rows.map(r => [r.Nom, r.Statut, r['Budget total (HTG)'], r['Dépensé (HTG)'], r.Impressions, r.Clics, `${r['CTR (%)']}%`, r['Date de début'], r['Date de fin']]),
      styles: { fontSize: 8 },
    });
    doc.save(`campagnes-pub-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

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
    setFormError('');
    if (!form.name || !form.startDate || !form.endDate) {
      setFormError('Remplissez le nom de la campagne et les dates de début/fin.'); return;
    }
    if (form.targetType === 'PRODUCT' && form.productIds.length === 0) {
      setFormError('Sélectionnez au moins un produit à promouvoir.'); return;
    }
    if (form.targetType === 'STORE' && !form.storeId) {
      setFormError('Sélectionnez une boutique à promouvoir.'); return;
    }
    if (form.targetType === 'STORE' && form.storeId) {
      const selectedStore = (stores || []).find((s: any) => s.id === form.storeId);
      if (selectedStore && !selectedStore.isVerified) {
        setFormError('Seules les boutiques vérifiées peuvent être promues. Demandez la vérification de votre boutique avant de créer cette campagne (la promotion d\'un produit spécifique, elle, ne requiert pas de vérification).');
        return;
      }
    }
    if (form.targetType === 'PRODUCT' && form.productIds.length > 1 && form.paymentMethod === 'MONCASH') {
      setFormError('Le paiement MonCash direct ne fonctionne que pour un seul produit à la fois — utilisez le Wallet, ou sélectionnez un seul produit.');
      return;
    }
    if (form.totalBudget < MIN_BUDGET) {
      // Le champ budget n'empêche pas réellement de taper une valeur sous le minimum
      // (l'attribut HTML `min` ne bloque pas la saisie) — sans ce contrôle, le formulaire
      // se soumettait quand même et le backend (class-validator @Min(25)) rejetait la
      // requête à chaque fois, sans qu'aucun message clair n'explique pourquoi.
      setFormError(`Le budget minimum est de ${MIN_BUDGET.toLocaleString()} HTG.`); return;
    }
    // L'heure de début choisie par le vendeur (par défaut 09:00) est combinée à la
    // date pour former le démarrage réel de la campagne — sans ça, toutes les
    // campagnes démarraient implicitement à 00:00, jamais à l'heure voulue.
    const start = new Date(`${form.startDate}T${form.startTime || '00:00'}:00`);
    const end = new Date(form.endDate);
    if (end <= start) {
      setFormError('La date de fin doit être après la date de début.'); return;
    }
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    if (form.dailyBudget) {
      const dailyCap = Number(form.dailyBudget);
      const maxPossibleSpend = dailyCap * days;
      if (maxPossibleSpend > form.totalBudget) {
        setFormError(
          `Incohérent : ${dailyCap.toLocaleString()} HTG/jour × ${days} jour${days > 1 ? 's' : ''} = ${maxPossibleSpend.toLocaleString()} HTG, ` +
          `ce qui dépasse votre budget total de ${form.totalBudget.toLocaleString()} HTG. ` +
          `Augmentez le budget total à au moins ${maxPossibleSpend.toLocaleString()} HTG, réduisez le budget quotidien, ou raccourcissez la durée.`
        );
        return;
      }
    }

    // Le paiement Wallet doit etre garanti au moment de la creation — un
    // "brouillon" cree silencieusement quand le solde est insuffisant
    // s'accumule sans jamais promouvoir le produit, et donne l'impression
    // d'un bug plutot que d'un choix explicite. On bloque avant meme d'appeler
    // l'API et on explique clairement les deux options possibles.
    const totalCostCheck = form.totalBudget * (form.targetType === 'PRODUCT' ? Math.max(1, form.productIds.length) : 1);
    if (form.paymentMethod === 'WALLET' && walletBalance < totalCostCheck) {
      setFormError(
        `Solde insuffisant : ${walletBalance.toLocaleString()} HTG disponibles pour ${totalCostCheck.toLocaleString()} HTG requis. ` +
        `Rechargez votre Wallet, ou choisissez "MonCash direct" pour payer immédiatement sans passer par le Wallet.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const isAuto = form.targetingMode === 'AUTO';
      const targetIds = form.targetType === 'PRODUCT' ? form.productIds : [null];
      const createdIds: string[] = [];

      for (const productId of targetIds) {
        const { data: campaign } = await api.post('/ads', {
          name: targetIds.length > 1 ? `${form.name} (${createdIds.length + 1}/${targetIds.length})` : form.name,
          productId: productId ?? undefined,
          storeId:   form.targetType === 'STORE' ? form.storeId : undefined,
          objective: form.objective,
          totalBudget: form.totalBudget,
          dailyBudget: form.dailyBudget ? Number(form.dailyBudget) : undefined,
          startDate: `${form.startDate}T${form.startTime || '00:00'}:00`,
          endDate: form.endDate,
          targetingMode: form.targetingMode,
          targetGenders: isAuto ? [] : form.targetGenders,
          targetDepts: isAuto ? [] : form.targetDepts,
          targetCategories: isAuto ? [] : form.targetCategories,
          targetInterests: isAuto ? [] : (hasKeywordTargeting ? form.targetInterests : []),
          targetAgeMin: isAuto ? undefined : (form.targetAgeMin ? Number(form.targetAgeMin) : undefined),
          targetAgeMax: isAuto ? undefined : (form.targetAgeMax ? Number(form.targetAgeMax) : undefined),
        });
        createdIds.push(campaign.id);
      }

      qc.invalidateQueries({ queryKey: ['my-campaigns'] });
      const totalCost = form.totalBudget * createdIds.length;

      if (form.paymentMethod === 'WALLET') {
        if (walletBalance >= totalCost) {
          let paid = 0;
          for (const id of createdIds) {
            try { await api.post(`/ads/my/${id}/pay`, { method: 'WALLET' }); paid++; } catch { /* left as PENDING_PAYMENT */ }
          }
          qc.invalidateQueries({ queryKey: ['seller-wallet'] });
          enqueueSnackbar(paid === createdIds.length
            ? `${paid} campagne${paid > 1 ? 's' : ''} créée${paid > 1 ? 's' : ''} et payée${paid > 1 ? 's' : ''} via Wallet — en cours de révision`
            : `${paid}/${createdIds.length} campagnes payées — les autres restent en brouillon, payez-les depuis la liste`,
            { variant: paid === createdIds.length ? 'success' : 'warning' });
        } else {
          enqueueSnackbar(`Campagne${createdIds.length > 1 ? 's' : ''} créée${createdIds.length > 1 ? 's' : ''} en brouillon — solde wallet insuffisant, rechargez puis payez`, { variant: 'warning' });
        }
        setOpen(false); resetForm();
      } else {
        // MonCash redirect — un seul produit/boutique, donc une seule campagne créée
        setOpen(false); resetForm();
        try {
          const { data: pay } = await api.post('/payments/ad-campaign/initiate', { campaignId: createdIds[0] });
          localStorage.setItem('adCampaignPay', createdIds[0]);
          window.location.href = pay.redirect_url;
        } catch (e: any) {
          enqueueSnackbar(extractErrorMessage(e, `Impossible d'initier MonCash`), { variant: 'error' });
        }
      }
    } catch (e: any) {
      enqueueSnackbar(extractErrorMessage(e, 'Erreur lors de la création'), { variant: 'error' });
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
      enqueueSnackbar(extractErrorMessage(e, 'Erreur de paiement'), { variant: 'error' });
    } finally {
      setPayLoading(false);
    }
  };

  const toggleGender = (g: string) => setForm(f => ({ ...f, targetGenders: f.targetGenders.includes(g) ? f.targetGenders.filter(x => x !== g) : [...f.targetGenders, g] }));
  const toggleDept   = (d: string) => setForm(f => ({ ...f, targetDepts: f.targetDepts.includes(d) ? f.targetDepts.filter(x => x !== d) : [...f.targetDepts, d] }));
  const toggleCat    = (c: string) => setForm(f => ({ ...f, targetCategories: f.targetCategories.includes(c) ? f.targetCategories.filter(x => x !== c) : [...f.targetCategories, c] }));
  const toggleAllCats = () => setForm(f => ({ ...f, targetCategories: f.targetCategories.length === categoryList.length ? [] : categoryList.map(c => c.slug) }));
  const toggleInterest = (i: string) => setForm(f => ({ ...f, targetInterests: f.targetInterests.includes(i) ? f.targetInterests.filter(x => x !== i) : [...f.targetInterests, i] }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography fontWeight={900} fontSize={{ xs: 20, md: 24 }} color={TXT} letterSpacing="-0.5px">Mes Publicités</Typography>
          <Typography fontSize={13} color={SUB}>Boostez vos produits et augmentez vos ventes</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {hasKeywordTargeting ? (
            <Box sx={{ display: 'flex', gap: 0.8 }}>
              <Box onClick={handleExportCsv} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.2, py: 0.7, borderRadius: '9px', cursor: 'pointer', bgcolor: '#FFFFFF', border: `1px solid ${BORD}` }}>
                <Download sx={{ fontSize: 15, color: BLU }} />
                <Typography fontSize={12} fontWeight={700} color={TXT}>CSV</Typography>
              </Box>
              <Box onClick={handleExportExcel} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.2, py: 0.7, borderRadius: '9px', cursor: 'pointer', bgcolor: '#FFFFFF', border: `1px solid ${BORD}` }}>
                <TableChart sx={{ fontSize: 15, color: GRN }} />
                <Typography fontSize={12} fontWeight={700} color={TXT}>Excel</Typography>
              </Box>
              <Box onClick={handleExportPdf} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.2, py: 0.7, borderRadius: '9px', cursor: 'pointer', bgcolor: '#FFFFFF', border: `1px solid ${BORD}` }}>
                <PictureAsPdf sx={{ fontSize: 15, color: RED }} />
                <Typography fontSize={12} fontWeight={700} color={TXT}>PDF</Typography>
              </Box>
            </Box>
          ) : (
            <Tooltip title="Exports réservés aux plans Business et Elite">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.2, py: 0.7, borderRadius: '9px', bgcolor: '#FFFFFF', border: `1px solid ${BORD}`, opacity: 0.6 }}>
                <Lock sx={{ fontSize: 13, color: SUB }} />
                <Download sx={{ fontSize: 15, color: SUB }} />
              </Box>
            </Tooltip>
          )}
          <Button onClick={() => setOpen(true)} startIcon={<Add sx={{ fontSize: 18 }} />}
            sx={{ bgcolor: OR, color: '#fff', borderRadius: '12px', fontWeight: 700, px: 2.5, py: 1.2, textTransform: 'none',
              boxShadow: '0 4px 14px rgba(255,107,0,0.28)', '&:hover': { bgcolor: '#E05A00' } }}>
            Créer une pub
          </Button>
        </Box>
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
          <span style={{ color: OR, fontWeight: 700 }}>{CPM_RATE} HTG / 1 000 impressions · {CPC_RATE} HTG / clic</span>
        </Typography>
      </Box>

      {/* Campaign list */}
      {isLoading ? (
        showSkel ? <ListSkeleton rows={3} /> : null
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
            const spent = Number(c.spent) || 0;
            const budget = Number(c.totalBudget) || 0;
            const pct = Math.min(100, (spent / budget) * 100);
            const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0';
            const daysLeft = Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000));
            const sc = statusColor(c.status);
            const expanded = statsId === c.id;
            const isStore = !c.productId && c.storeId;

            // Coût par résultat obtenu jusqu'ici : par clic si la campagne en a
            // généré, sinon par 1 000 impressions — dérivé uniquement de champs
            // réels (spent/clicks/impressions), aucune donnée inventée.
            const costPerResult = c.clicks > 0
              ? `${(spent / c.clicks).toFixed(2)} HTG / clic`
              : c.impressions > 0
                ? `${((spent / c.impressions) * 1000).toFixed(2)} HTG / 1 000 impr.`
                : '—';

            // Jours restants estimés au rythme de dépense actuel — durée déjà
            // écoulée depuis le début pour calculer un rythme quotidien moyen,
            // projeté sur le budget restant. Purement dérivé, pas de fausse donnée.
            const startedMs = new Date(c.startDate).getTime();
            const elapsedDays = Math.max(1, Math.ceil((Date.now() - startedMs) / 86400000));
            const dailyPace = spent > 0 ? spent / elapsedDays : 0;
            const remainingBudget = Math.max(0, budget - spent);
            const estDaysAtPace = dailyPace > 0 ? Math.ceil(remainingBudget / dailyPace) : null;
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
                        {hasKeywordTargeting && typeof c.performanceScore === 'number' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, px: 1, py: 0.15, borderRadius: '6px', bgcolor: `${scoreColor(c.performanceScore)}18`, border: `1px solid ${scoreColor(c.performanceScore)}40` }}>
                            <Insights sx={{ fontSize: 11, color: scoreColor(c.performanceScore) }} />
                            <Typography fontSize={10} fontWeight={800} color={scoreColor(c.performanceScore)}>Score {c.performanceScore}/100</Typography>
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
                        {c.publishedAt && (
                          <Box sx={{ px: 1, py: 0.3, borderRadius: '6px', bgcolor: `${GRN}14`, border: `1px solid ${GRN}30` }}>
                            <Typography fontSize={10.5} color={GRN} fontWeight={700}>Publiée le {new Date(c.publishedAt).toLocaleDateString('fr-FR')}</Typography>
                          </Box>
                        )}
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
                      {c.status === 'ACTIVE' && !c.publishedAt && (
                        <Box onClick={() => openPublish(c.id)}
                          sx={{ px: 1.3, py: 0.6, borderRadius: '8px', cursor: 'pointer', bgcolor: GRN, display: 'flex', alignItems: 'center', gap: 0.4, '&:hover': { bgcolor: '#0EA271' } }}>
                          <PlayArrow sx={{ fontSize: 14, color: '#fff' }} />
                          <Typography fontSize={12} fontWeight={700} color="#fff">Publier</Typography>
                        </Box>
                      )}
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                      <Typography fontSize={11} color={SUB}>Budget utilisé</Typography>
                      <Typography fontSize={11} fontWeight={700} color={pct > 80 ? RED : SUB2}>
                        {spent.toLocaleString()} / {budget.toLocaleString()} HTG ({pct.toFixed(0)}%)
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 7, borderRadius: 4, bgcolor: 'rgba(15,23,42,0.09)', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: pct > 80 ? RED : OR } }} />

                    {/* Statistiques dérivées — coût par résultat et rythme de dépense */}
                    {(c.status === 'ACTIVE' || c.status === 'PAUSED') && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ px: 1.1, py: 0.4, borderRadius: '7px', bgcolor: `${GRN}12`, border: `1px solid ${GRN}28` }}>
                          <Typography fontSize={10.5} fontWeight={700} color={GRN}>Coût/résultat : {costPerResult}</Typography>
                        </Box>
                        <Box sx={{ px: 1.1, py: 0.4, borderRadius: '7px', bgcolor: `${BLU}12`, border: `1px solid ${BLU}28` }}>
                          <Typography fontSize={10.5} fontWeight={700} color={BLU}>
                            {estDaysAtPace != null
                              ? `Budget épuisé dans ~${estDaysAtPace}j au rythme actuel`
                              : 'Pas encore assez de données pour estimer le rythme'}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>

                {expanded && stats && (
                  <Box sx={{ px: 2.5, pb: 2.5 }}>
                    <Box sx={{ p: 2.2, borderRadius: '14px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.8, flexWrap: 'wrap', gap: 1 }}>
                        <Typography fontWeight={700} fontSize={12} color={SUB} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Performance détaillée</Typography>
                        <Typography fontSize={11} color={SUB}>
                          {new Date(stats.campaign.startDate).toLocaleDateString('fr-FR')} → {new Date(stats.campaign.endDate).toLocaleDateString('fr-FR')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' }, gap: 1.2 }}>
                        {[
                          { lbl: 'Impressions', val: (stats.campaign.impressions ?? 0).toLocaleString(), color: PUR, Icon: Visibility },
                          { lbl: 'Clics', val: (stats.campaign.clicks ?? 0).toLocaleString(), color: BLU, Icon: TouchApp },
                          { lbl: 'CTR', val: `${stats.ctr}%`, color: PUR, Icon: TrendingUp },
                          { lbl: 'CPC moyen', val: `${Number(stats.cpc).toFixed(0)} HTG`, color: GRN, Icon: AccountBalanceWallet },
                          { lbl: 'Conversions', val: (stats.campaign.conversions ?? 0).toLocaleString(), color: OR, Icon: ShoppingCart },
                          { lbl: 'Coût / conversion', val: stats.campaign.conversions > 0 ? `${(Number(stats.campaign.spent) / stats.campaign.conversions).toFixed(0)} HTG` : '—', color: OR, Icon: AccountBalanceWallet },
                          { lbl: 'Budget restant', val: `${Number(stats.remaining).toLocaleString()} HTG`, color: GRN, Icon: AccountBalanceWallet },
                          { lbl: 'Jours restants', val: `${stats.daysLeft}j`, color: BLU, Icon: FlashOn },
                        ].map(({ lbl, val, color, Icon }) => (
                          <Box key={lbl} sx={{ p: 1.5, borderRadius: '12px', bgcolor: `${color}0d`, border: `1px solid ${color}20` }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.4 }}>
                              <Icon sx={{ fontSize: 13, color }} />
                              <Typography fontSize={10.5} color={SUB}>{lbl}</Typography>
                            </Box>
                            <Typography fontWeight={900} fontSize={17} color={color}>{val}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    {/* Vue avancée — score de performance + suggestions, réservée
                        aux plans Business/Elite (hasKeywordTargeting). Dérivée
                        uniquement de données réelles (voir ads.service.ts) —
                        aucune ML, une formule déterministe documentée côté backend. */}
                    <Box sx={{ mt: 1.5, p: 2, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5 }}>
                        <Insights sx={{ fontSize: 15, color: PUR }} />
                        <Typography fontWeight={700} fontSize={12} color={SUB} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vue avancée</Typography>
                        {!hasKeywordTargeting && <Lock sx={{ fontSize: 12, color: SUB }} />}
                      </Box>
                      {hasKeywordTargeting ? (
                        typeof stats.performanceScore === 'number' ? (
                          <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.5 }}>
                              <Typography fontWeight={900} fontSize={26} color={scoreColor(stats.performanceScore)}>{stats.performanceScore}</Typography>
                              <Typography fontSize={12} color={SUB}>/ 100 — score de performance</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={stats.performanceScore}
                              sx={{ height: 6, borderRadius: 4, mb: 1.5, bgcolor: 'rgba(15,23,42,0.09)', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: scoreColor(stats.performanceScore) } }} />
                            {stats.suggestions?.length > 0 ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                                {stats.suggestions.map((s: string, i: number) => (
                                  <Box key={i} sx={{ display: 'flex', gap: 0.8, alignItems: 'flex-start', p: 1, borderRadius: '8px', bgcolor: `${OR}0a`, border: `1px solid ${OR}20` }}>
                                    <AutoAwesome sx={{ fontSize: 13, color: OR, mt: 0.2, flexShrink: 0 }} />
                                    <Typography fontSize={11.5} color={SUB2} lineHeight={1.5}>{s}</Typography>
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              <Typography fontSize={11.5} color={SUB}>Aucune suggestion particulière pour le moment — cette campagne suit son cours normalement.</Typography>
                            )}
                          </>
                        ) : (
                          <Typography fontSize={11.5} color={SUB}>Chargement…</Typography>
                        )
                      ) : (
                        <Typography fontSize={11.5} color={SUB}>
                          Score de performance et suggestions d'optimisation réservés aux plans Business et Elite —{' '}
                          <a href="/seller/subscription" style={{ color: OR, fontWeight: 700, textDecoration: 'none' }}>passez à un plan supérieur</a>.
                        </Typography>
                      )}
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
        PaperProps={{ sx: {
          bgcolor: CARD, border: `1px solid ${BORD}`, color: TXT,
          borderRadius: { xs: 0, sm: '20px' },
          m: { xs: 0, sm: 3 },
          width: { xs: '100%', sm: 'calc(100% - 48px)' },
          maxHeight: { xs: '100%', sm: 'calc(100% - 48px)' },
        } }}>
        <DialogTitle sx={{ color: TXT, fontWeight: 900, fontSize: 18, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(255,107,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Campaign sx={{ fontSize: 18, color: OR }} />
          </Box>
          Créer une campagne
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {formError && (
            <Box sx={{ mb: 2.5, p: 1.8, borderRadius: '12px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Typography fontSize={13} color={RED} fontWeight={600} lineHeight={1.5}>{formError}</Typography>
            </Box>
          )}
          <Grid container spacing={3}>
            {/* Campaign name — scrollMarginTop evite que le clavier mobile fasse
                remonter ce champ sous le titre fixe du dialog au focus. */}
            <Grid item xs={12} sx={{ scrollMarginTop: '90px' }}>
              {/* InputLabelProps shrink:true (comme les champs date plus bas) évite que
                  le label bascule de sa position "placeholder" à sa position "notch"
                  au moment du focus — cette transition, mesurée pendant que le Dialog
                  est encore en train d'animer son ouverture (Grow), produisait un
                  contour (fieldset) mal repositionné et un rendu visuellement cassé
                  dès qu'on cliquait dans le champ. */}
              <TextField fullWidth label="Nom de la campagne *" value={form.name}
                InputLabelProps={{ shrink: true }}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} sx={fieldSx} />
            </Grid>

            {/* Target type toggle */}
            <Grid item xs={12}>
              <Typography fontSize={12} fontWeight={700} color={SUB} mb={1.2} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Promouvoir
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, mb: 1.5 }}>
                {([
                  { type: 'PRODUCT', icon: Inventory, label: 'Un ou plusieurs produits / services', desc: `Promouvoir jusqu'à ${MAX_PRODUCTS} articles, services ou annonces restaurant` },
                  { type: 'STORE',   icon: Store,     label: 'Une boutique', desc: 'Promouvoir toute votre boutique (une seule)' },
                ] as const).map(({ type, icon: Icon, label, desc }) => {
                  const sel = form.targetType === type;
                  return (
                    <Box key={type} onClick={() => setForm(f => ({ ...f, targetType: type, productIds: [], storeId: '' }))}
                      sx={{ flex: '1 1 200px', cursor: 'pointer', p: 1.8, borderRadius: '12px', transition: 'all 0.15s', border: `1.5px solid ${sel ? OR : BORD}`, bgcolor: sel ? 'rgba(255,107,0,0.08)' : 'rgba(15,23,42,0.09)', '&:hover': { borderColor: sel ? OR : 'rgba(15,23,42,0.09)' } }}>
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
                <MultiSearchableSelector
                  items={productItems}
                  value={form.productIds}
                  onChange={ids => setForm(f => ({ ...f, productIds: ids }))}
                  placeholder={`Rechercher des produits / services à promouvoir * (max ${MAX_PRODUCTS})`}
                  max={MAX_PRODUCTS}
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
                value={form.totalBudget} inputProps={{ min: MIN_BUDGET, step: 25 }}
                onChange={e => setForm(f => ({ ...f, totalBudget: Number(e.target.value) }))}
                helperText={`Minimum ${MIN_BUDGET.toLocaleString()} HTG`} sx={fieldSx} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Budget quotidien — optionnel" type="number"
                value={form.dailyBudget} onChange={e => setForm(f => ({ ...f, dailyBudget: e.target.value }))}
                helperText="Vide = pas de limite journalière" sx={fieldSx} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Date de début *" type="date" value={form.startDate}
                InputLabelProps={{ shrink: true }} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} sx={fieldSx} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Heure de début *" type="time" value={form.startTime}
                InputLabelProps={{ shrink: true }} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} sx={fieldSx} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Date de fin *" type="date" value={form.endDate}
                InputLabelProps={{ shrink: true }} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} sx={fieldSx} />
            </Grid>

            {/* Targeting */}
            <Grid item xs={12}>
              <Typography fontSize={12} fontWeight={700} color={SUB} mb={1.5} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ciblage de l'audience</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                {[
                  { mode: 'AUTO', icon: <AutoAwesome sx={{ fontSize: 16 }} />, label: 'Automatique', desc: "L'algorithme optimise votre audience" },
                  { mode: 'MANUAL', icon: <Tune sx={{ fontSize: 16 }} />, label: 'Manuel', desc: 'Définissez genre, âge et zone' },
                ].map(({ mode, icon, label, desc }) => {
                  const sel = form.targetingMode === mode;
                  return (
                    <Box key={mode} onClick={() => setForm(f => ({ ...f, targetingMode: mode as any }))}
                      sx={{ flex: '1 1 200px', cursor: 'pointer', p: 1.8, borderRadius: '12px', transition: 'all 0.15s', border: `1.5px solid ${sel ? OR : BORD}`, bgcolor: sel ? 'rgba(255,107,0,0.08)' : 'rgba(15,23,42,0.09)', '&:hover': { borderColor: sel ? OR : 'rgba(15,23,42,0.09)' } }}>
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
                      <Pill active={form.targetCategories.length === categoryList.length && categoryList.length > 0} onClick={toggleAllCats} color={OR}>Tout</Pill>
                      {categoryList.map(c => <Pill key={c.slug} active={form.targetCategories.includes(c.slug)} onClick={() => toggleCat(c.slug)} color={GRN}>{c.name}</Pill>)}
                    </Box>
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1 }}>
                      <Typography fontSize={11} fontWeight={700} color={SUB} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Centres d'intérêt</Typography>
                      {!hasKeywordTargeting && <Lock sx={{ fontSize: 12, color: SUB }} />}
                    </Box>
                    {hasKeywordTargeting ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
                        {INTERESTS.map(i => <Pill key={i} active={form.targetInterests.includes(i)} onClick={() => toggleInterest(i)} color={BLU}>{i}</Pill>)}
                      </Box>
                    ) : (
                      <Box sx={{ p: 1.4, borderRadius: '10px', bgcolor: 'rgba(15,23,42,0.04)', border: `1px dashed ${BORD}` }}>
                        <Typography fontSize={11.5} color={SUB}>
                          Le ciblage par centres d'intérêt est réservé aux plans Business et Elite —{' '}
                          <a href="/seller/subscription" style={{ color: OR, fontWeight: 700, textDecoration: 'none' }}>passez à un plan supérieur</a>.
                        </Typography>
                      </Box>
                    )}
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                <PayMethodCard method="WALLET"  selected={form.paymentMethod === 'WALLET'}  onClick={() => setForm(f => ({ ...f, paymentMethod: 'WALLET' }))}  balance={walletBalance} budget={form.totalBudget} />
                <PayMethodCard method="MONCASH" selected={form.paymentMethod === 'MONCASH'} onClick={() => setForm(f => ({ ...f, paymentMethod: 'MONCASH' }))} budget={form.totalBudget} />
              </Box>
              {form.paymentMethod === 'WALLET' && walletBalance < form.totalBudget && (
                <Box sx={{ mt: 1.4, p: 1.8, borderRadius: '14px', bgcolor: 'rgba(245,158,11,0.07)', border: '1.5px solid rgba(245,158,11,0.3)', display: 'flex', gap: 1.4, alignItems: 'flex-start' }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: '9px', bgcolor: 'rgba(245,158,11,0.16)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.1 }}>
                    <AccountBalanceWallet sx={{ fontSize: 15, color: YLW }} />
                  </Box>
                  <Box>
                    <Typography fontSize={13} fontWeight={800} color={YLW} mb={0.3}>Solde Wallet insuffisant</Typography>
                    <Typography fontSize={12.5} color={SUB2} lineHeight={1.55}>
                      Vous disposez de <strong style={{ color: TXT }}>{walletBalance.toLocaleString()} HTG</strong> sur un budget de{' '}
                      <strong style={{ color: TXT }}>{form.totalBudget.toLocaleString()} HTG</strong>. Votre campagne sera enregistrée en{' '}
                      <strong style={{ color: TXT }}>brouillon</strong> — rechargez votre wallet puis lancez le paiement depuis la liste de vos campagnes.
                    </Typography>
                  </Box>
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
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

      {/* ── Publish Dialog (manual go-live) ── */}
      <Dialog open={!!publishId} onClose={() => !publishLoading && setPublishId(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '20px', color: TXT } }}>
        <DialogTitle sx={{ color: TXT, fontWeight: 900, fontSize: 17 }}>Publier la campagne</DialogTitle>
        <DialogContent>
          <Typography fontSize={13} color={SUB} mb={2}>
            Choisissez la date et l'heure de démarrage de la diffusion. Par défaut : maintenant.
          </Typography>
          <TextField fullWidth type="datetime-local" label="Démarrer le" value={publishAt}
            onChange={e => setPublishAt(e.target.value)} sx={fieldSx} InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setPublishId(null)} disabled={publishLoading} sx={{ color: SUB2, borderRadius: '10px', textTransform: 'none' }}>Annuler</Button>
          <Button onClick={handlePublish} disabled={publishLoading || !publishAt}
            endIcon={publishLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ bgcolor: GRN, color: '#fff', fontWeight: 700, borderRadius: '10px', px: 2.5, textTransform: 'none', '&:hover': { bgcolor: '#0EA271' }, '&:disabled': { bgcolor: 'rgba(15,23,42,0.09)', color: SUB } }}>
            {publishLoading ? 'En cours…' : 'Publier maintenant'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
