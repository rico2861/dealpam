import { useState } from 'react';
import {
  Box, Typography, Card, Chip, Tab, Tabs, Avatar,
  Switch, Alert, Tooltip, IconButton, TextField, InputAdornment,
  Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  FlashOn, InfoOutlined, Star, Verified, Refresh, Search,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { alpha } from '@mui/material/styles';
import api from '../../api/axios';

const ORANGE = '#FF9900';

function PlanBadge({ plan }: { plan?: any }) {
  if (!plan) return <Chip label="Aucun plan" size="small" sx={{ fontSize: 10, bgcolor: '#F1F5F9', color: '#64748B' }} />;
  const map: Record<string, [string, string]> = {
    ELITE: ['#7C3AED', '#EDE9FE'], PREMIUM: ['#2563EB', '#DBEAFE'],
    STANDARD: ['#10B981', '#D1FAE5'], BASIC: ['#64748B', '#F1F5F9'],
  };
  const [color, bg] = map[plan.tier] || ['#64748B', '#F1F5F9'];
  return (
    <Chip label={plan.tier || plan.name} size="small"
      sx={{ fontSize: 10.5, fontWeight: 700, bgcolor: bg, color, border: `1px solid ${color}30` }} />
  );
}

export default function PromotionsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0); // 0=Sponsorisés, 1=Vedettes, 2=Tous
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminPromotions'],
    queryFn: () => api.get('/products/admin-list?limit=200').then(r => r.data),
  });

  const toggleFeatured = useMutation({
    mutationFn: (id: string) => api.patch(`/products/${id}/toggle-featured`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminPromotions'] }); enqueueSnackbar('Vedette mis à jour', { variant: 'success' }); },
    onError: () => enqueueSnackbar('Erreur', { variant: 'error' }),
  });

  const toggleSponsored = useMutation({
    mutationFn: (id: string) => api.patch(`/products/${id}/toggle-sponsored`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminPromotions'] }); enqueueSnackbar('Sponsorisé mis à jour', { variant: 'success' }); },
    onError: () => enqueueSnackbar('Erreur', { variant: 'error' }),
  });

  const products: any[] = data?.data || [];
  const sponsoredCount = products.filter(p => p.isSponsored).length;
  const featuredCount = products.filter(p => p.isFeatured).length;
  const autoCount = products.filter(p => p.store?.seller?.subscriptions?.[0]?.plan?.hasAutoSponsored).length;

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const match = !q || p.name?.toLowerCase().includes(q) || p.store?.name?.toLowerCase().includes(q);
    if (tab === 0) return match && p.isSponsored;
    if (tab === 1) return match && p.isFeatured;
    return match;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* ── HEADER ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, background: `linear-gradient(135deg, ${ORANGE}, #e68900)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${alpha(ORANGE, 0.35)}` }}>
            <FlashOn sx={{ color: '#111', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography fontWeight={800} fontSize={20} color="#0F1111" letterSpacing="-0.3px">Promotions</Typography>
            <Typography fontSize={13} color="text.secondary">Gérez les produits sponsorisés, vedettes et catégories spéciales</Typography>
          </Box>
        </Box>
        <IconButton onClick={() => refetch()} sx={{ bgcolor: '#F1F5F9', '&:hover': { bgcolor: '#E2E8F0' } }}>
          <Refresh fontSize="small" />
        </IconButton>
      </Box>

      {/* ── INFO ── */}
      <Alert icon={<InfoOutlined sx={{ color: ORANGE }} />} severity="warning"
        sx={{ mb: 3, bgcolor: alpha(ORANGE, 0.06), border: `1px solid ${alpha(ORANGE, 0.25)}`, color: '#5a3d00', borderRadius: 2 }}>
        <Typography fontSize={13} fontWeight={600} mb={0.2}>Fonctionnement automatique</Typography>
        <Typography fontSize={12.5}>
          Plans <strong>Premium</strong> et <strong>Elite</strong> → produits sponsorisés automatiquement.
          Expiration du plan → retrait automatique à 2h du matin. Contrôle manuel disponible ci-dessous.
        </Typography>
      </Alert>

      {/* ── STATS ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Sponsorisés actifs', val: sponsoredCount, Icon: FlashOn, color: ORANGE, bg: alpha(ORANGE, 0.1) },
          { label: 'Produits vedettes', val: featuredCount, Icon: Star, color: '#F59E0B', bg: alpha('#F59E0B', 0.1) },
          { label: 'Via plan auto', val: autoCount, Icon: Verified, color: '#10B981', bg: alpha('#10B981', 0.1) },
        ].map(({ label, val, Icon, color, bg }) => (
          <Card key={label} sx={{ p: 2.5, border: '1px solid #E2E8F0', boxShadow: 'none', borderRadius: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon sx={{ color, fontSize: 24 }} />
              </Box>
              <Box>
                <Typography fontWeight={900} fontSize={28} color="#0F1111" lineHeight={1}>{val}</Typography>
                <Typography fontSize={12} color="text.secondary" mt={0.2}>{label}</Typography>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      {/* ── TABLE CARD ── */}
      <Card sx={{ border: '1px solid #E2E8F0', boxShadow: 'none', borderRadius: 2.5, overflow: 'hidden' }}>

        {/* Toolbar */}
        <Box sx={{ px: 2.5, pt: 1.5, pb: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, borderBottom: '1px solid #F0F0F0' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}
            TabIndicatorProps={{ style: { backgroundColor: ORANGE, height: 3, borderRadius: 2 } }}
            sx={{ '& .MuiTab-root': { fontWeight: 600, fontSize: 13, textTransform: 'none', minHeight: 44, pb: 0 },
              '& .Mui-selected': { color: `${ORANGE} !important` } }}>
            <Tab label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <FlashOn sx={{ fontSize: 15 }} />
                Sponsorisés
                <Box sx={{ px: 0.8, py: 0.1, borderRadius: 4, bgcolor: sponsoredCount > 0 ? ORANGE : '#E2E8F0',
                  fontSize: 10.5, fontWeight: 800, color: sponsoredCount > 0 ? '#111' : '#888', lineHeight: 1.4 }}>
                  {sponsoredCount}
                </Box>
              </Box>
            } />
            <Tab label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Star sx={{ fontSize: 15 }} />
                Vedettes
                <Box sx={{ px: 0.8, py: 0.1, borderRadius: 4, bgcolor: featuredCount > 0 ? '#F59E0B' : '#E2E8F0',
                  fontSize: 10.5, fontWeight: 800, color: featuredCount > 0 ? '#111' : '#888', lineHeight: 1.4 }}>
                  {featuredCount}
                </Box>
              </Box>
            } />
            <Tab label={`Tous les produits (${products.length})`} />
          </Tabs>
          <TextField size="small" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
            sx={{ width: 240, '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 13 } }} />
        </Box>

        {/* Table */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                {['Produit', 'Boutique', 'Prix', 'Plan', 'Statut',
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}><FlashOn sx={{ fontSize: 13, color: ORANGE }} />Sponsorisé</Box>,
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}><Star sx={{ fontSize: 13, color: '#F59E0B' }} />Vedette</Box>,
                ].map((h, i) => (
                  <TableCell key={i} align={i >= 5 ? 'center' : 'left'}
                    sx={{ fontWeight: 700, fontSize: 12, color: '#64748B', py: 1.4, borderBottom: '2px solid #F0F0F0' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array(6).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(7).fill(0).map((_, j) => (
                        <TableCell key={j}><Skeleton height={36} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : filtered.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 7, color: 'text.secondary', fontSize: 14 }}>
                          Aucun produit trouvé
                        </TableCell>
                      </TableRow>
                    )
                  : filtered.map((p: any) => {
                      const img = p.images?.[0]?.urlThumb || p.images?.[0]?.urlMedium;
                      const plan = p.store?.seller?.subscriptions?.[0]?.plan;
                      const isAuto = plan?.hasAutoSponsored;
                      return (
                        <TableRow key={p.id} hover sx={{ '&:hover': { bgcolor: '#FFFBF0' } }}>
                          <TableCell sx={{ py: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3 }}>
                              <Avatar src={img} variant="rounded"
                                sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: '#F1F5F9', border: '1px solid #E2E8F0', flexShrink: 0 }}>
                                {p.name?.[0]}
                              </Avatar>
                              <Box>
                                <Typography fontWeight={600} fontSize={13} color="#0F1111"
                                  sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.name}
                                </Typography>
                                <Typography fontSize={11} color="text.secondary">{p.category?.name}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={600} fontSize={13}>{p.store?.name || '—'}</Typography>
                            {isAuto && (
                              <Tooltip title="Sponsorisé automatiquement par le plan">
                                <Chip label="Auto" size="small"
                                  sx={{ fontSize: 9.5, height: 16, mt: 0.3, bgcolor: alpha(ORANGE, 0.12), color: ORANGE, fontWeight: 700 }} />
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={700} fontSize={13} color={p.salePrice ? '#CC0C39' : '#0F1111'}>
                              {Number(p.salePrice || p.price).toLocaleString()} HTG
                            </Typography>
                            {p.salePrice && (
                              <Typography fontSize={11} color="text.disabled" sx={{ textDecoration: 'line-through' }}>
                                {Number(p.price).toLocaleString()}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell><PlanBadge plan={plan} /></TableCell>
                          <TableCell>
                            <Chip label={p.status} size="small" sx={{
                              fontSize: 10.5, fontWeight: 700, height: 20,
                              bgcolor: p.status === 'PUBLISHED' ? '#DCFCE7' : p.status === 'PENDING_REVIEW' ? '#FEF9C3' : '#F1F5F9',
                              color: p.status === 'PUBLISHED' ? '#166534' : p.status === 'PENDING_REVIEW' ? '#713F12' : '#64748B',
                            }} />
                          </TableCell>
                          <TableCell align="center">
                            <Switch size="small" checked={!!p.isSponsored}
                              onChange={() => toggleSponsored.mutate(p.id)}
                              disabled={toggleSponsored.isPending}
                              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: ORANGE },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ORANGE } }} />
                          </TableCell>
                          <TableCell align="center">
                            <Switch size="small" checked={!!p.isFeatured}
                              onChange={() => toggleFeatured.mutate(p.id)}
                              disabled={toggleFeatured.isPending}
                              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#F59E0B' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#F59E0B' } }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
