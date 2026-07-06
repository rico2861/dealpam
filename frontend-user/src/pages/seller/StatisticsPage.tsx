import { useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import {
  TrendingUp, ShoppingBag, Visibility, Star, BarChart,
  ArrowUpward, ArrowDownward,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#94A3B8';
const SUB2 = '#94A3B8';
const GRN  = '#10B981';
const BLU  = '#3B82F6';
const PUR  = '#8B5CF6';
const YLW  = '#F59E0B';

function fmt(v: number) { return Number(v).toLocaleString('fr-HT'); }

function KpiCard({ icon, label, value, sub, color, trend }: { icon: any; label: string; value: string; sub?: string; color: string; trend?: number }) {
  const Icon = icon;
  return (
    <Box sx={{ p: 2.5, borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ width: 38, height: 38, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon sx={{ fontSize: 20, color }} />
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4,
            px: 0.9, py: 0.3, borderRadius: '6px',
            bgcolor: trend >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
            {trend >= 0
              ? <ArrowUpward sx={{ fontSize: 11, color: GRN }} />
              : <ArrowDownward sx={{ fontSize: 11, color: '#EF4444' }} />}
            <Typography fontSize={11} fontWeight={700} color={trend >= 0 ? GRN : '#EF4444'}>{Math.abs(trend)}%</Typography>
          </Box>
        )}
      </Box>
      <Box>
        <Typography fontSize={24} fontWeight={900} color={TXT} letterSpacing="-0.5px">{value}</Typography>
        <Typography fontSize={12.5} color={SUB} mt={0.2}>{label}</Typography>
        {sub && <Typography fontSize={11} color={SUB} mt={0.3}>{sub}</Typography>}
      </Box>
    </Box>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: `1px solid ${BORD}`, '&:last-child': { borderBottom: 'none' } }}>
      <Typography fontSize={13} color={SUB2} sx={{ flex: 1, minWidth: 0 }} noWrap>{label}</Typography>
      <Box sx={{ width: 120, height: 4, borderRadius: 2, bgcolor: 'rgba(15,23,42,0.09)', flexShrink: 0 }}>
        <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 2, bgcolor: color }} />
      </Box>
      <Typography fontSize={12} fontWeight={700} color={TXT} sx={{ minWidth: 40, textAlign: 'right' }}>{fmt(value)}</Typography>
    </Box>
  );
}

const PERIODS = [
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '90d', label: '3 mois' },
];

export default function StatisticsPage() {
  const [period, setPeriod] = useState('30d');

  const { data: dash, isLoading } = useQuery({
    queryKey: ['sellerDash'],
    queryFn: () => api.get('/dashboard/seller').then(r => r.data),
    enabled: !!localStorage.getItem('accessToken'),
  });

  const { data: products } = useQuery({
    queryKey: ['sellerProducts'],
    queryFn: () => api.get('/products/me?limit=200').then(r => r.data?.data || []),
    enabled: !!localStorage.getItem('accessToken'),
  });

  const productList: any[] = products ?? [];

  const totalRevenue = dash?.totalRevenue ?? 0;
  const totalOrders  = dash?.totalOrders ?? 0;
  const totalViews   = dash?.totalViews ?? 0;
  const avgRating    = dash?.avgRating ?? 0;
  const totalReviews = dash?.totalReviews ?? 0;
  const pendingOrders = dash?.pendingOrders ?? 0;

  const topProducts = [...productList]
    .sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
    .slice(0, 5);
  const maxSales = topProducts[0]?.totalSales || 1;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography fontWeight={900} fontSize={{ xs: 20, md: 24 }} color={TXT} letterSpacing="-0.5px">Statistiques</Typography>
          <Typography fontSize={13} color={SUB}>Suivi de vos performances de vente</Typography>
        </Box>
        {/* Period filter */}
        <Box sx={{ display: 'flex', gap: 0.8 }}>
          {PERIODS.map(p => (
            <Box key={p.key} onClick={() => setPeriod(p.key)} sx={{
              px: 1.4, py: 0.7, borderRadius: '9px', cursor: 'pointer', transition: 'all 0.14s',
              bgcolor: period === p.key ? 'rgba(255,107,0,0.15)' : '#FFFFFF',
              border: '1px solid', borderColor: period === p.key ? 'rgba(255,107,0,0.4)' : BORD,
            }}>
              <Typography fontSize={12.5} fontWeight={700} color={period === p.key ? OR : SUB}>{p.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress sx={{ color: OR }} /></Box>
      ) : (
        <>
          {/* KPI grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2 }}>
            <KpiCard icon={TrendingUp}    label="Revenus totaux"     value={`${fmt(totalRevenue)} HTG`} color={GRN} trend={12} />
            <KpiCard icon={ShoppingBag}   label="Commandes"          value={String(totalOrders)}         color={OR}  sub={`${pendingOrders} en attente`} />
            <KpiCard icon={Visibility}    label="Vues produits"      value={fmt(totalViews)}              color={BLU} />
            <KpiCard icon={Star}          label="Note moyenne"       value={avgRating ? avgRating.toFixed(1) : '—'} sub={`${totalReviews} avis`} color={YLW} />
          </Box>

          {/* Status breakdown + Top products */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, mb: 2 }}>

            {/* Status */}
            <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <BarChart sx={{ fontSize: 17, color: PUR }} />
                <Typography fontWeight={800} fontSize={14} color={TXT}>Répartition des produits</Typography>
              </Box>
              {[
                { label: 'Publiés',      count: productList.filter(p => p.status === 'PUBLISHED').length,      color: GRN },
                { label: 'En révision',  count: productList.filter(p => p.status === 'PENDING_REVIEW').length, color: YLW },
                { label: 'Brouillons',   count: productList.filter(p => p.status === 'DRAFT').length,          color: SUB },
                { label: 'Rejetés',      count: productList.filter(p => p.status === 'REJECTED').length,       color: '#EF4444' },
              ].map(({ label, count, color }) => (
                <BarRow key={label} label={label} value={count} max={Math.max(productList.length, 1)} color={color} />
              ))}
              <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${BORD}`, display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontSize={12} color={SUB}>Total produits</Typography>
                <Typography fontSize={13} fontWeight={800} color={TXT}>{productList.length}</Typography>
              </Box>
            </Box>

            {/* Top products */}
            <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp sx={{ fontSize: 17, color: OR }} />
                <Typography fontWeight={800} fontSize={14} color={TXT}>Top produits</Typography>
                <Box sx={{ ml: 'auto', px: 0.8, py: 0.15, borderRadius: '5px', bgcolor: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)' }}>
                  <Typography fontSize={10} fontWeight={700} color={OR}>par ventes</Typography>
                </Box>
              </Box>
              {topProducts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography fontSize={13} color={SUB}>Aucune vente enregistrée</Typography>
                </Box>
              ) : (
                topProducts.map((p: any, i: number) => (
                  <BarRow key={p.id} label={p.name} value={p.totalSales || 0} max={maxSales} color={[OR, GRN, BLU, PUR, YLW][i % 5]} />
                ))
              )}
            </Box>
          </Box>

          {/* Revenue card */}
          <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUp sx={{ fontSize: 17, color: GRN }} />
              <Typography fontWeight={800} fontSize={14} color={TXT}>Aperçu des revenus</Typography>
              <Box sx={{ ml: 'auto', px: 0.8, py: 0.15, borderRadius: '5px', bgcolor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Typography fontSize={10} fontWeight={700} color={GRN}>cumul total</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3,1fr)' }, gap: 1.5 }}>
              {[
                { label: 'Revenu brut',       value: `${fmt(totalRevenue)} HTG`,  color: GRN },
                { label: 'Commandes totales',  value: String(totalOrders),          color: OR },
                { label: 'Panier moyen',       value: totalOrders > 0 ? `${fmt(Math.round(totalRevenue / totalOrders))} HTG` : '—', color: BLU },
              ].map(({ label, value, color }) => (
                <Box key={label} sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
                  <Typography fontSize={18} fontWeight={900} color={color}>{value}</Typography>
                  <Typography fontSize={12} color={SUB} mt={0.3}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
