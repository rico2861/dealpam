import { useState } from 'react';
import {
  Box, Container, Typography, Card, Chip, alpha, CircularProgress,
  ToggleButton, ToggleButtonGroup, Divider, Tooltip,
} from '@mui/material';
import {
  TrendingUp, AccountBalance, Store, ShoppingBag, Group,
  Subscriptions, InfoOutlined,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAdminStore } from '../../store/admin.store';
import api from '../../api/axios';

const GRN = '#10B981';
const BLU = '#3B82F6';

type Period = '7d' | 'month' | 'prev_month' | 'year' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d',        label: '7 jours' },
  { value: 'month',     label: 'Ce mois' },
  { value: 'prev_month',label: 'Mois préc.' },
  { value: 'year',      label: 'Cette année' },
  { value: 'all',       label: 'Tout' },
];

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)} M HTG`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)} K HTG`
  : `${n.toLocaleString('fr-FR')} HTG`;

function BigCard({ label, value, sub, color, icon: Icon, tooltip }: {
  label: string; value: string; sub?: string; color: string; icon: any; tooltip?: string;
}) {
  return (
    <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${alpha(color, 0.18)}`, boxShadow: 'none', flex: 1, minWidth: 220, position: 'relative', overflow: 'hidden' }}>
      {/* background glow */}
      <Box sx={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', bgcolor: alpha(color, 0.07), pointerEvents: 'none' }} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: alpha(color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon sx={{ fontSize: 20, color }} />
        </Box>
        {tooltip && (
          <Tooltip title={tooltip} placement="top">
            <InfoOutlined sx={{ fontSize: 15, color: '#CBD5E1', cursor: 'default' }} />
          </Tooltip>
        )}
      </Box>
      <Typography fontSize={12.5} fontWeight={600} color="text.secondary" mb={0.8}>{label}</Typography>
      <Typography fontSize={28} fontWeight={900} color={color} lineHeight={1} letterSpacing="-0.5px">{value}</Typography>
      {sub && <Typography fontSize={11.5} color="text.disabled" mt={0.8}>{sub}</Typography>}
    </Card>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: 2.5, border: `1px solid ${alpha(color, 0.15)}`, bgcolor: 'white', flex: 1, minWidth: 120 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
        <Icon sx={{ fontSize: 14, color }} />
        <Typography fontSize={11} color="text.secondary" fontWeight={600}>{label}</Typography>
      </Box>
      <Typography fontSize={20} fontWeight={800} color={color}>{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</Typography>
    </Box>
  );
}

export default function PartnerPage() {
  const { admin } = useAdminStore();
  const [period, setPeriod] = useState<Period>('month');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['partner-stats', period],
    queryFn: () => api.get(`/users/partner/stats?period=${period}`).then(r => r.data),
    staleTime: 60_000,
  });

  const d = data;
  const pct: number = d?.partnershipPercent ?? 0;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>

      {/* Greeting */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={900} letterSpacing="-0.5px" lineHeight={1.1}>
          Bonjour, {admin?.firstName} 👋
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
          <Typography fontSize={14} color="text.secondary">
            Votre espace financier — données confidentielles
          </Typography>
          <Chip
            label={`${pct}% des bénéfices`}
            size="small"
            sx={{ height: 24, fontWeight: 800, fontSize: 12, bgcolor: alpha(GRN, 0.08), color: GRN, border: `1px solid ${alpha(GRN, 0.2)}` }}
          />
        </Box>
      </Box>

      {/* Period selector */}
      <Box sx={{ mb: 3.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography fontSize={13} fontWeight={700} color="text.secondary">Période :</Typography>
          <Typography fontSize={13} color="#555" fontStyle="italic">{d?.rangeLabel ?? '…'}</Typography>
        </Box>
        <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small"
          sx={{ '& .MuiToggleButton-root': { borderRadius: '10px !important', fontSize: 12, fontWeight: 600, border: '1px solid #E5E7EB', px: 1.8, py: 0.6, textTransform: 'none', '&.Mui-selected': { bgcolor: alpha(BLU, 0.08), color: BLU, borderColor: alpha(BLU, 0.3) } } }}>
          {PERIODS.map(p => <ToggleButton key={p.value} value={p.value}>{p.label}</ToggleButton>)}
        </ToggleButtonGroup>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress /></Box>
      ) : !d ? null : (
        <>
          {/* Main financial cards */}
          <Box sx={{ display: 'flex', gap: 2.5, mb: 2.5, flexWrap: 'wrap' }}>
            <BigCard
              label={`Revenus plateforme — ${d.rangeLabel}`}
              value={fmt(d.periodRevenue)}
              color={BLU}
              icon={TrendingUp}
              sub="Total des paiements confirmés sur la période"
              tooltip="Revenus issus des abonnements vendeurs et campagnes publicitaires"
            />
            <BigCard
              label={`Votre bénéfice — ${d.rangeLabel}`}
              value={fmt(d.periodDividend)}
              color={GRN}
              icon={AccountBalance}
              sub={`${pct}% × ${fmt(d.periodRevenue)}`}
              tooltip="Votre dividende calculé sur les revenus de la période sélectionnée"
            />
          </Box>

          {/* All-time row */}
          <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: 'none', mb: 3.5 }}>
            <Typography fontSize={12} fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={2}>
              Cumul depuis le lancement
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography fontSize={11.5} color="text.disabled">Revenus totaux plateforme</Typography>
                <Typography fontSize={20} fontWeight={800} color={BLU}>{fmt(d.allTimeRevenue)}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography fontSize={11.5} color="text.disabled">Votre dividende total</Typography>
                <Typography fontSize={20} fontWeight={800} color={GRN}>{fmt(d.allTimeDividend)}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography fontSize={11.5} color="text.disabled">Votre part</Typography>
                <Typography fontSize={20} fontWeight={800} color="#8B5CF6">{pct}%</Typography>
              </Box>
            </Box>
          </Card>

          {/* Chart */}
          {d.chart && d.chart.length > 0 && (
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: 'none', border: '1px solid #E5E7EB', mb: 3.5, opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.2s' }}>
              <Typography fontWeight={800} fontSize={15} mb={0.5}>Évolution des revenus</Typography>
              <Typography fontSize={12} color="text.secondary" mb={3}>{d.rangeLabel} — revenus plateforme et votre dividende</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={d.chart} margin={{ top: 5, right: 16, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={BLU} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={BLU} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDiv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={GRN} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={GRN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                  <RTooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }}
                    formatter={(v: any, name: string) => [
                      `${Number(v).toLocaleString('fr-FR')} HTG`,
                      name === 'revenue' ? 'Revenus plateforme' : 'Votre dividende',
                    ]}
                  />
                  <Legend formatter={n => n === 'revenue' ? 'Revenus plateforme' : 'Votre dividende'} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue"  stroke={BLU} strokeWidth={2.5} fill="url(#gRev)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="dividend" stroke={GRN} strokeWidth={2.5} fill="url(#gDiv)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Platform KPIs */}
          <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: 'none', mb: d.responsibilities ? 3 : 0 }}>
            <Typography fontSize={12} fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={2}>
              Indicateurs plateforme
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <KpiCard label="Vendeurs actifs"     value={d.kpis.totalSellers}          icon={Store}          color="#8B5CF6" />
              <KpiCard label="Commandes livrées"   value={d.kpis.totalOrders}           icon={ShoppingBag}    color="#F59E0B" />
              <KpiCard label="Membres inscrits"     value={d.kpis.totalUsers}            icon={Group}          color={BLU} />
              <KpiCard label="Abonnements actifs"  value={d.kpis.activeSubscriptions}   icon={Subscriptions}  color={GRN} />
            </Box>
          </Card>

          {/* Responsibilities */}
          {d.responsibilities && (
            <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: 'none', mt: 2.5 }}>
              <Typography fontSize={12} fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={1.5}>
                Vos responsabilités
              </Typography>
              <Typography fontSize={13.5} color="text.primary" lineHeight={1.9} sx={{ whiteSpace: 'pre-line' }}>
                {d.responsibilities}
              </Typography>
            </Card>
          )}
        </>
      )}
    </Container>
  );
}
