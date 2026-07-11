import { Container, Grid, Card, CardContent, Typography, Box, CircularProgress, Chip, alpha } from '@mui/material';
import { People, Store, Inventory, ShoppingBag, Payment, Pending, TrendingUp, ArrowUpward, ArrowDownward, VisibilityOutlined } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../api/axios';

function StatCard({ icon: Icon, label, value, sub, color, trend, trendUp }: any) {
  return (
    <Card sx={{ height: '100%', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }, transition: 'all 0.2s' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ width: 46, height: 46, borderRadius: 3, bgcolor: alpha(color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon sx={{ color, fontSize: 22 }} />
          </Box>
          {trend && (
            <Chip
              icon={trendUp !== false ? <ArrowUpward sx={{ fontSize: '12px !important' }} /> : <ArrowDownward sx={{ fontSize: '12px !important' }} />}
              label={trend} size="small"
              sx={{ bgcolor: trendUp !== false ? alpha('#10B981', 0.1) : alpha('#EF4444', 0.1),
                    color: trendUp !== false ? '#059669' : '#DC2626', fontWeight: 700, fontSize: 11, height: 24 }} />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={500} mb={0.5}>{label}</Typography>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-1px', lineHeight: 1 }}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

const MOCK_ORDERS = [
  { month: 'Jan', commandes: 40 }, { month: 'Fév', commandes: 65 },
  { month: 'Mar', commandes: 90 }, { month: 'Avr', commandes: 75 },
  { month: 'Mai', commandes: 120 }, { month: 'Jun', commandes: 145 },
];
const MOCK_REVENUE = [
  { month: 'Jan', htg: 180000 }, { month: 'Fév', htg: 250000 },
  { month: 'Mar', htg: 320000 }, { month: 'Avr', htg: 290000 },
  { month: 'Mai', htg: 410000 }, { month: 'Jun', htg: 520000 },
];
const PIE_DATA = [
  { name: 'Starter',  value: 35, color: '#94A3B8' },
  { name: 'Business', value: 28, color: '#3B82F6' },
  { name: 'Premium',  value: 22, color: '#8B5CF6' },
  { name: 'Elite',    value: 15, color: '#2563EB' },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['adminStats'], queryFn: () => api.get('/dashboard/admin').then(r => r.data) });

  if (isLoading) return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>Tableau de bord</Typography>
          <Typography variant="body2" color="text.secondary">Vue d'ensemble de la plateforme</Typography>
        </Box>
        <Chip label="Temps réel" color="success" size="small" icon={<Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10B981', ml: 1 }} />}
          sx={{ fontWeight: 600 }} />
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={People}   label="Utilisateurs"    value={(stats?.totalUsers || 0).toLocaleString()} color="#3B82F6" trend="+12%" trendUp />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={Store}    label="Vendeurs actifs" value={stats?.totalSellers || 0} sub={`${stats?.pendingSellers || 0} en attente`} color="#8B5CF6" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={Inventory} label="Produits publiés" value={(stats?.totalProducts || 0).toLocaleString()} sub={`${stats?.pendingProducts || 0} à valider`} color="#10B981" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={ShoppingBag} label="Commandes" value={(stats?.totalOrders || 0).toLocaleString()} color="#F59E0B" trend="+8%" trendUp />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={Payment} label="Abonnements" value={stats?.activeSubscriptions || 0} color="#EC4899" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={Pending} label="En attente" value={(stats?.pendingSellers || 0) + (stats?.pendingProducts || 0)} sub="Vendeurs + Produits" color="#EF4444" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={VisibilityOutlined} label="Vues produits" value={(stats?.totalProductViews || 0).toLocaleString()} sub="Tous vendeurs confondus" color="#8B5CF6" />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Évolution des commandes</Typography>
                <Typography variant="caption" color="text.secondary">6 derniers mois</Typography>
              </Box>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={MOCK_ORDERS} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
                  <Bar dataKey="commandes" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Abonnements</Typography>
                <Typography variant="caption" color="text.secondary">Répartition par plan</Typography>
              </Box>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12, color: '#64748B' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Revenus (HTG)</Typography>
                <Typography variant="caption" color="text.secondary">6 derniers mois</Typography>
              </Box>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={MOCK_REVENUE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} formatter={(v: any) => [`${Number(v).toLocaleString()} HTG`]} />
                  <Line type="monotone" dataKey="htg" stroke="#2563EB" strokeWidth={3} dot={{ fill: '#2563EB', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
