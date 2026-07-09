import { useMemo, useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import {
  TrendingUp, ShoppingBag, Visibility, Star, BarChart,
  ArrowUpward, ArrowDownward, Lock, Download, PictureAsPdf, TableChart,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { StatCardSkeleton } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const GRN  = '#10B981';
const RED  = '#EF4444';
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
              : <ArrowDownward sx={{ fontSize: 11, color: RED }} />}
            <Typography fontSize={11} fontWeight={700} color={trend >= 0 ? GRN : RED}>{Math.abs(trend)}%</Typography>
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
      <Typography fontSize={13} color={SUB} sx={{ flex: 1, minWidth: 0 }} noWrap>{label}</Typography>
      <Box sx={{ width: 120, height: 4, borderRadius: 2, bgcolor: 'rgba(15,23,42,0.09)', flexShrink: 0 }}>
        <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 2, bgcolor: color }} />
      </Box>
      <Typography fontSize={12} fontWeight={700} color={TXT} sx={{ minWidth: 40, textAlign: 'right' }}>{fmt(value)}</Typography>
    </Box>
  );
}

const PERIODS = [
  { key: '7d', label: '7 jours', minTier: null as string | null },
  { key: '30d', label: '30 jours', minTier: 'advanced' },
  { key: '90d', label: '3 mois', minTier: 'advanced' },
];

const inputStyle = { fontSize: 12.5, color: TXT, border: `1px solid ${BORD}`, borderRadius: 8, padding: '5px 8px', background: '#F7F8FA' };

export default function StatisticsPage() {
  const [period, setPeriod] = useState('7d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: currentSub } = useQuery({
    queryKey: ['sellerSub'],
    queryFn: () => api.get('/subscriptions/me').then(r => r.data).catch(() => null),
    enabled: !!localStorage.getItem('accessToken'),
  });

  const hasAdvancedStats = !!currentSub?.plan?.hasAdvancedStats;

  const effectivePeriod = hasAdvancedStats ? period : '7d';
  const useCustomRange = hasAdvancedStats && dateFrom && dateTo;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['sellerStatistics', effectivePeriod, useCustomRange ? dateFrom : '', useCustomRange ? dateTo : ''],
    queryFn: () => {
      const params = useCustomRange
        ? { period: 'custom', from: dateFrom, to: dateTo }
        : { period: effectivePeriod };
      return api.get('/dashboard/seller/statistics', { params }).then(r => r.data);
    },
    enabled: !!localStorage.getItem('accessToken'),
  });

  const { data: products } = useQuery({
    queryKey: ['sellerProducts'],
    queryFn: () => api.get('/products/me?limit=200').then(r => r.data?.data || []),
    enabled: !!localStorage.getItem('accessToken'),
  });

  const showSkel = useDelayedLoading(isLoading);
  const productList: any[] = products ?? [];

  const revenue = stats?.revenue ?? 0;
  const revenueTrendPct = stats?.revenueTrendPct ?? 0;
  const orderCount = stats?.orderCount ?? 0;
  const pendingCount = stats?.pendingCount ?? 0;
  const avgOrderValue = stats?.avgOrderValue ?? 0;
  const totalViewsLifetime = stats?.totalViewsLifetime ?? 0;
  const avgRating = stats?.avgRating ?? 0;
  const totalReviews = stats?.totalReviews ?? 0;
  const productStatusBreakdown: Record<string, number> = stats?.productStatusBreakdown ?? {};
  const orderStatusBreakdown: Record<string, number> = stats?.orderStatusBreakdown ?? {};
  const topProducts: any[] = stats?.topProducts ?? [];
  const revenueSeries: any[] = stats?.revenueSeries ?? [];
  const maxTopProductRevenue = topProducts[0]?.revenue || 1;
  const maxSeriesRevenue = Math.max(...revenueSeries.map(r => r.revenue), 1);
  const maxOrderStatus = Math.max(...Object.values(orderStatusBreakdown).map((v: any) => Number(v)), 1);

  const totalProductCount: number = useMemo(
    () => Object.values(productStatusBreakdown).reduce((a: number, b: any) => a + Number(b), 0),
    [productStatusBreakdown],
  );

  async function handleExportExcel() {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const kpiSheet = XLSX.utils.json_to_sheet([
      { Indicateur: 'Revenu (HTG)', Valeur: revenue },
      { Indicateur: 'Variation revenu (%)', Valeur: revenueTrendPct },
      { Indicateur: 'Commandes', Valeur: orderCount },
      { Indicateur: 'Commandes en attente', Valeur: pendingCount },
      { Indicateur: 'Panier moyen (HTG)', Valeur: avgOrderValue },
      { Indicateur: 'Vues produits (total)', Valeur: totalViewsLifetime },
      { Indicateur: 'Note moyenne', Valeur: avgRating },
      { Indicateur: "Nombre d'avis", Valeur: totalReviews },
    ]);
    XLSX.utils.book_append_sheet(wb, kpiSheet, 'Resume');

    if (hasAdvancedStats) {
      if (topProducts.length) {
        const topSheet = XLSX.utils.json_to_sheet(topProducts.map(p => ({
          Produit: p.name, 'Quantite vendue': p.quantitySold, 'Revenu (HTG)': p.revenue,
        })));
        XLSX.utils.book_append_sheet(wb, topSheet, 'Top produits');
      }
      const statusSheet = XLSX.utils.json_to_sheet(
        Object.entries(orderStatusBreakdown).map(([k, v]) => ({ Statut: k, Nombre: v })),
      );
      XLSX.utils.book_append_sheet(wb, statusSheet, 'Commandes par statut');
    }

    XLSX.writeFile(wb, `statistiques-${effectivePeriod}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function handleExportPdf() {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Rapport statistiques - DealPam', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periode: ${effectivePeriod} | Genere le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 23);

    autoTable(doc, {
      startY: 30,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Revenu', `${fmt(revenue)} HTG`],
        ['Variation revenu', `${revenueTrendPct}%`],
        ['Commandes', String(orderCount)],
        ['Commandes en attente', String(pendingCount)],
        ['Panier moyen', `${fmt(avgOrderValue)} HTG`],
        ['Vues produits (total)', fmt(totalViewsLifetime)],
        ['Note moyenne', avgRating ? avgRating.toFixed(1) : '—'],
        ["Nombre d'avis", String(totalReviews)],
      ],
    });

    if (hasAdvancedStats && topProducts.length) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Produit', 'Qte vendue', 'Revenu (HTG)']],
        body: topProducts.map(p => [p.name, String(p.quantitySold), fmt(p.revenue)]),
      });
    }

    if (hasAdvancedStats) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Statut commande', 'Nombre']],
        body: Object.entries(orderStatusBreakdown).map(([k, v]) => [k, String(v)]),
      });
    }

    doc.save(`statistiques-${effectivePeriod}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography fontWeight={900} fontSize={{ xs: 20, md: 24 }} color={TXT} letterSpacing="-0.5px">Statistiques</Typography>
          <Typography fontSize={13} color={SUB}>Suivi de vos performances de vente</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Period filter */}
          <Box sx={{ display: 'flex', gap: 0.8 }}>
            {PERIODS.map(p => {
              const locked = p.minTier === 'advanced' && !hasAdvancedStats;
              const content = (
                <Box key={p.key} onClick={() => !locked && setPeriod(p.key)} sx={{
                  px: 1.4, py: 0.7, borderRadius: '9px', cursor: locked ? 'not-allowed' : 'pointer', transition: 'all 0.14s',
                  bgcolor: period === p.key && !locked ? 'rgba(255,107,0,0.15)' : '#FFFFFF',
                  border: '1px solid', borderColor: period === p.key && !locked ? 'rgba(255,107,0,0.4)' : BORD,
                  display: 'flex', alignItems: 'center', gap: 0.4, opacity: locked ? 0.6 : 1,
                }}>
                  {locked && <Lock sx={{ fontSize: 12, color: SUB }} />}
                  <Typography fontSize={12.5} fontWeight={700} color={period === p.key && !locked ? OR : SUB}>{p.label}</Typography>
                </Box>
              );
              return locked ? (
                <Tooltip key={p.key} title="Disponible avec un plan superieur">{content}</Tooltip>
              ) : content;
            })}
          </Box>
          {/* Custom range (advanced only) */}
          {hasAdvancedStats && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
              <Typography fontSize={12} color={SUB}>à</Typography>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
              {(dateFrom || dateTo) && (
                <Typography onClick={() => { setDateFrom(''); setDateTo(''); }}
                  sx={{ fontSize: 11.5, color: SUB, cursor: 'pointer', textDecoration: 'underline' }}>
                  Réinitialiser
                </Typography>
              )}
            </Box>
          )}
          {/* Export buttons (advanced only) */}
          {hasAdvancedStats ? (
            <Box sx={{ display: 'flex', gap: 0.8 }}>
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
            <Tooltip title="Disponible avec un plan superieur">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.2, py: 0.7, borderRadius: '9px', bgcolor: '#FFFFFF', border: `1px solid ${BORD}`, opacity: 0.6 }}>
                <Lock sx={{ fontSize: 13, color: SUB }} />
                <Download sx={{ fontSize: 15, color: SUB }} />
              </Box>
            </Tooltip>
          )}
        </Box>
      </Box>

      {isLoading ? (
        showSkel ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2 }}>
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </Box>
        ) : null
      ) : (
        <>
          {/* KPI grid — always visible, basic tier included */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2 }}>
            <KpiCard icon={TrendingUp}  label="Revenus (période)" value={`${fmt(revenue)} HTG`} color={GRN} trend={revenueTrendPct} />
            <KpiCard icon={ShoppingBag} label="Commandes (période)" value={String(orderCount)} color={OR} sub={`${pendingCount} en attente`} />
            <KpiCard icon={Visibility}  label="Vues produits (total)" value={fmt(totalViewsLifetime)} color={BLU} sub="Cumul depuis toujours" />
            <KpiCard icon={Star}        label="Note moyenne" value={avgRating ? avgRating.toFixed(1) : '—'} sub={`${totalReviews} avis`} color={YLW} />
          </Box>

          {/* Global overview — basic, always visible */}
          <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BarChart sx={{ fontSize: 17, color: PUR }} />
              <Typography fontWeight={800} fontSize={14} color={TXT}>Répartition des produits</Typography>
            </Box>
            {[
              { label: 'Publiés',     count: productStatusBreakdown.PUBLISHED || 0,      color: GRN },
              { label: 'En révision', count: productStatusBreakdown.PENDING_REVIEW || 0,  color: YLW },
              { label: 'Brouillons',  count: productStatusBreakdown.DRAFT || 0,           color: SUB },
              { label: 'Rejetés',     count: productStatusBreakdown.REJECTED || 0,        color: RED },
            ].map(({ label, count, color }) => (
              <BarRow key={label} label={label} value={count} max={Math.max(totalProductCount, 1)} color={color} />
            ))}
            <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${BORD}`, display: 'flex', justifyContent: 'space-between' }}>
              <Typography fontSize={12} color={SUB}>Total produits</Typography>
              <Typography fontSize={13} fontWeight={800} color={TXT}>{totalProductCount}</Typography>
            </Box>
          </Box>

          {hasAdvancedStats ? (
            <>
              {/* Top products + order status */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, mb: 2 }}>
                <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TrendingUp sx={{ fontSize: 17, color: OR }} />
                    <Typography fontWeight={800} fontSize={14} color={TXT}>Top produits</Typography>
                    <Box sx={{ ml: 'auto', px: 0.8, py: 0.15, borderRadius: '5px', bgcolor: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)' }}>
                      <Typography fontSize={10} fontWeight={700} color={OR}>par revenu</Typography>
                    </Box>
                  </Box>
                  {topProducts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography fontSize={13} color={SUB}>Aucune vente sur la période</Typography>
                    </Box>
                  ) : (
                    topProducts.map((p: any, i: number) => (
                      <BarRow key={p.productId} label={p.name} value={p.revenue} max={maxTopProductRevenue} color={[OR, GRN, BLU, PUR, YLW][i % 5]} />
                    ))
                  )}
                </Box>

                <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ShoppingBag sx={{ fontSize: 17, color: BLU }} />
                    <Typography fontWeight={800} fontSize={14} color={TXT}>Commandes par statut</Typography>
                  </Box>
                  {Object.entries(orderStatusBreakdown).map(([label, count]: [string, any]) => (
                    <BarRow key={label} label={label} value={Number(count)} max={maxOrderStatus} color={PUR} />
                  ))}
                </Box>
              </Box>

              {/* Revenue chart */}
              <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUp sx={{ fontSize: 17, color: GRN }} />
                  <Typography fontWeight={800} fontSize={14} color={TXT}>Évolution du revenu</Typography>
                </Box>
                {revenueSeries.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography fontSize={13} color={SUB}>Pas de données sur la période</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 140, px: 1 }}>
                    {revenueSeries.map((r, i) => (
                      <Tooltip key={i} title={`${r.label}: ${fmt(r.revenue)} HTG`}>
                        <Box sx={{ flex: 1, height: `${Math.max((r.revenue / maxSeriesRevenue) * 100, 3)}%`, bgcolor: OR, borderRadius: '4px 4px 0 0', minWidth: 4 }} />
                      </Tooltip>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Revenue summary */}
              <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUp sx={{ fontSize: 17, color: GRN }} />
                  <Typography fontWeight={800} fontSize={14} color={TXT}>Aperçu des revenus</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3,1fr)' }, gap: 1.5 }}>
                  {[
                    { label: 'Revenu de la période', value: `${fmt(revenue)} HTG`, color: GRN },
                    { label: 'Commandes',             value: String(orderCount),   color: OR },
                    { label: 'Panier moyen',          value: `${fmt(avgOrderValue)} HTG`, color: BLU },
                  ].map(({ label, value, color }) => (
                    <Box key={label} sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
                      <Typography fontSize={18} fontWeight={900} color={color}>{value}</Typography>
                      <Typography fontSize={12} color={SUB} mt={0.3}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 4, textAlign: 'center' }}>
              <Lock sx={{ fontSize: 32, color: SUB, mb: 1 }} />
              <Typography fontWeight={800} fontSize={15} color={TXT} mb={0.5}>Statistiques avancées verrouillées</Typography>
              <Typography fontSize={13} color={SUB} mb={2}>
                Top produits, évolution du revenu, répartition des commandes et exports PDF/Excel sont réservés aux plans supérieurs.
              </Typography>
              <Box component="a" href="/seller/subscription" sx={{
                display: 'inline-block', px: 2.5, py: 1, borderRadius: '10px', bgcolor: OR, color: '#fff',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
              }}>
                Passez à un plan supérieur
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
