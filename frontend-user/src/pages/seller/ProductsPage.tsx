import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Avatar, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Inventory,
  CheckCircle, Warning, Block, RadioButtonUnchecked, Archive,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { TableSkeleton } from '../../components/shared/Skeletons';
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
const YLW  = '#F59E0B';

const STATUS: Record<string, { label: string; color: string; icon: any }> = {
  PUBLISHED:      { label: 'Publié',       color: GRN,              icon: CheckCircle },
  PENDING_REVIEW: { label: 'En révision',  color: YLW,              icon: Warning },
  REJECTED:       { label: 'Rejeté',       color: RED,              icon: Block },
  DRAFT:          { label: 'Brouillon',    color: '#64748B', icon: RadioButtonUnchecked },
  ARCHIVED:       { label: 'Archivé',      color: '#64748B', icon: Archive },
};

function fmt(v: number) { return `${Number(v).toLocaleString('fr-HT')} HTG`; }

export default function SellerProductsPage({ mode = 'products' }: { mode?: 'products' | 'services' }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('ALL');
  const [del, setDel]         = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [deleting, setDeleting] = useState(false);

  const { data: allProducts, isLoading } = useQuery({
    queryKey: ['sellerProducts'],
    queryFn: () => api.get('/products/me?limit=200').then(r => r.data?.data || []),
    enabled: !!localStorage.getItem('accessToken'),
  });
  const showSkel = useDelayedLoading(isLoading);
  const products = (allProducts ?? []).filter((p: any) =>
    mode === 'services' ? p.productType && p.productType !== 'PHYSICAL' : !p.productType || p.productType === 'PHYSICAL'
  );

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/products/${del.id}`);
      qc.invalidateQueries({ queryKey: ['sellerProducts'] });
      enqueueSnackbar('Produit supprimé', { variant: 'success' });
      setDel({ open: false, id: '', name: '' });
    } catch {
      enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const list: any[] = products ?? [];
  const counts = {
    ALL:            list.length,
    PUBLISHED:      list.filter(p => p.status === 'PUBLISHED').length,
    PENDING_REVIEW: list.filter(p => p.status === 'PENDING_REVIEW').length,
    DRAFT:          list.filter(p => p.status === 'DRAFT').length,
  };

  const filtered = list.filter(p => {
    const matchStatus = filter === 'ALL' || p.status === filter;
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const FILTERS = [
    { key: 'ALL',            label: 'Tous',       count: counts.ALL },
    { key: 'PUBLISHED',      label: 'Publiés',    count: counts.PUBLISHED },
    { key: 'PENDING_REVIEW', label: 'En révision',count: counts.PENDING_REVIEW },
    { key: 'DRAFT',          label: 'Brouillons', count: counts.DRAFT },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography fontWeight={900} fontSize={{ xs: 20, md: 24 }} color={TXT} letterSpacing="-0.5px">
            {mode === 'services' ? 'Mes services' : 'Mes produits'}
          </Typography>
          <Typography fontSize={13} color={SUB}>
            {list.length} {mode === 'services' ? 'service' : 'produit'}{list.length !== 1 ? 's' : ''} au total
          </Typography>
        </Box>
        <Button
          onClick={() => navigate(mode === 'services' ? '/seller/services/add' : '/seller/products/add')}
          startIcon={<Add sx={{ fontSize: 18 }} />}
          sx={{ bgcolor: OR, color: '#fff', borderRadius: '12px', fontWeight: 700, px: 2.5, py: 1.2,
            boxShadow: '0 4px 14px rgba(255,107,0,0.28)', '&:hover': { bgcolor: '#E05A00' } }}>
          {mode === 'services' ? '+ Ajouter un service' : '+ Ajouter un produit'}
        </Button>
      </Box>

      {/* Filter tabs + search */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2.5, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <Box key={f.key} onClick={() => setFilter(f.key)}
              sx={{ px: 1.5, py: 0.7, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
                bgcolor: filter === f.key ? 'rgba(255,107,0,0.15)' : '#FFFFFF',
                border: '1px solid', borderColor: filter === f.key ? 'rgba(255,107,0,0.4)' : BORD,
                '&:hover': { borderColor: 'rgba(15,23,42,0.09)' },
                display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Typography fontSize={13} fontWeight={600} color={filter === f.key ? OR : SUB2}>{f.label}</Typography>
              <Box sx={{ px: 0.7, py: 0.05, borderRadius: '5px',
                bgcolor: filter === f.key ? 'rgba(255,107,0,0.2)' : '#FFFFFF' }}>
                <Typography fontSize={11} fontWeight={700} color={filter === f.key ? OR : SUB}>{f.count}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ ml: { xs: 0, sm: 'auto' }, width: { xs: '100%', sm: 240 } }}>
          <TextField
            size="small" placeholder="Rechercher…" value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: SUB }}/></InputAdornment> }}
            sx={{ width: '100%',
              '& .MuiOutlinedInput-root': { bgcolor: 'rgba(15,23,42,0.09)', borderRadius: '10px', color: TXT, fontSize: 13,
                '& fieldset': { borderColor: BORD }, '&:hover fieldset': { borderColor: 'rgba(15,23,42,0.09)' },
                '&.Mui-focused fieldset': { borderColor: OR } },
              '& input::placeholder': { color: SUB } }}
          />
        </Box>
      </Box>

      {/* Content */}
      {isLoading ? (
        showSkel ? <TableSkeleton rows={6} columns={mode==='services'?5:6} /> : null
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12, borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}` }}>
          <Inventory sx={{ fontSize: 56, color: BORD, mb: 2 }}/>
          <Typography color={SUB} fontSize={15} fontWeight={600}>
            {search || filter !== 'ALL' ? `Aucun${mode==='services'?' service':' produit'} trouvé` : `Aucun${mode==='services'?' service':' produit'} pour l'instant`}
          </Typography>
          <Typography color={SUB} fontSize={13} mt={0.5} mb={3}>
            {search ? `Aucun résultat pour "${search}"` : `Ajoutez votre premier ${mode==='services'?'service':'produit'} pour commencer à vendre`}
          </Typography>
          {!search && filter === 'ALL' && (
            <Button onClick={() => navigate(mode==='services'?'/seller/services/add':'/seller/products/add')} startIcon={<Add/>}
              sx={{ bgcolor: OR, color: '#fff', borderRadius: '10px', fontWeight: 700,
                '&:hover': { bgcolor: '#E05A00' } }}>
              {mode==='services'?'Ajouter un service':'Ajouter un produit'}
            </Button>
          )}
        </Box>
      ) : (
        <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, overflow: 'hidden' }}>
          {/* Table header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: mode==='services' ? '48px 1fr 140px 120px 100px 160px' : '48px 1fr 140px 80px 120px 100px 160px',
            gap: 1, px: 2, py: 1.5, borderBottom: `1px solid ${BORD}`,
            '@media (max-width:900px)': { display: 'none' } }}>
            {(mode==='services' ? ['', 'Service', 'Prix', 'Statut', 'Date', 'Actions'] : ['', 'Produit', 'Prix', 'Stock', 'Statut', 'Date', 'Actions']).map(h => (
              <Typography key={h} fontSize={11} fontWeight={700} color={SUB}
                sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</Typography>
            ))}
          </Box>

          {filtered.map((p: any, i: number) => {
            const st = STATUS[p.status] || STATUS.DRAFT;
            const StIcon = st.icon;
            const isLowStock = p.stock <= 5 && p.stock > 0;
            const isOutStock = p.stock === 0;
            return (
              <Box key={p.id}
                sx={{ display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: mode==='services' ? '48px 1fr 140px 120px 100px 160px' : '48px 1fr 140px 80px 120px 100px 160px' },
                  gap: 1, px: 2, py: 1.8, alignItems: 'center',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${BORD}` : 'none',
                  '&:hover': { bgcolor: 'rgba(15,23,42,0.04)' }, transition: 'all 0.12s' }}>

                {/* Avatar */}
                <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                  <Avatar variant="rounded" src={p.images?.[0]?.url}
                    sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(255,107,0,0.15)',
                      color: OR, fontWeight: 900, fontSize: 14, border: `1px solid rgba(255,107,0,0.15)` }}>
                    {p.name?.[0]}
                  </Avatar>
                </Box>

                {/* Name + store — mobile shows everything inline */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar variant="rounded" src={p.images?.[0]?.url}
                    sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(255,107,0,0.15)',
                      color: OR, fontWeight: 900, fontSize: 14, flexShrink: 0,
                      display: { xs: 'flex', md: 'none' } }}>
                    {p.name?.[0]}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontSize={13.5} fontWeight={600} color={TXT} noWrap>{p.name}</Typography>
                    {p.store?.name && (
                      <Typography fontSize={11.5} color={SUB} noWrap>{p.store.name}</Typography>
                    )}
                  </Box>
                </Box>

                {/* Price */}
                <Box>
                  {p.salePrice ? (
                    <>
                      <Typography fontSize={13} fontWeight={700} color={OR}>{fmt(Number(p.salePrice))}</Typography>
                      <Typography fontSize={11} color={SUB} sx={{ textDecoration: 'line-through' }}>{fmt(Number(p.price))}</Typography>
                    </>
                  ) : (
                    <Typography fontSize={13} fontWeight={700} color={TXT}>{fmt(Number(p.price))}</Typography>
                  )}
                </Box>

                {/* Stock — not applicable to services */}
                {mode!=='services' && (
                  <Box>
                    <Typography fontSize={13} fontWeight={700}
                      color={isOutStock ? RED : isLowStock ? YLW : TXT}>
                      {p.stock}
                    </Typography>
                    {isLowStock && <Typography fontSize={10} color={YLW}>stock faible</Typography>}
                    {isOutStock && <Typography fontSize={10} color={RED}>rupture</Typography>}
                  </Box>
                )}

                {/* Status */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                    <StIcon sx={{ fontSize: 14, color: st.color, flexShrink: 0 }}/>
                    <Typography fontSize={12} fontWeight={600} color={st.color}>{st.label}</Typography>
                  </Box>
                  {p.hasPendingEdit && (
                    <Typography fontSize={10.5} color="#F59E0B" fontWeight={600} mt={0.3}>
                      modification en attente de validation
                    </Typography>
                  )}
                </Box>

                {/* Date */}
                <Typography fontSize={12} color={SUB}>
                  {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </Typography>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box onClick={() => navigate(mode==='services' ? `/seller/services/edit/${p.id}` : `/seller/products/edit/${p.id}`)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.2, py: 0.6, borderRadius: '8px',
                      border: `1px solid ${BORD}`, cursor: 'pointer', transition: 'all 0.13s',
                      '&:hover': { borderColor: 'rgba(255,107,0,0.4)', bgcolor: 'rgba(255,107,0,0.08)' } }}>
                    <Edit sx={{ fontSize: 13, color: OR }}/>
                    <Typography fontSize={12} fontWeight={600} color={OR}>Éditer</Typography>
                  </Box>
                  <Box onClick={() => setDel({ open: true, id: p.id, name: p.name })}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.2, py: 0.6, borderRadius: '8px',
                      border: `1px solid ${BORD}`, cursor: 'pointer', transition: 'all 0.13s',
                      '&:hover': { borderColor: 'rgba(239,68,68,0.4)', bgcolor: 'rgba(239,68,68,0.08)' } }}>
                    <Delete sx={{ fontSize: 13, color: RED }}/>
                    <Typography fontSize={12} fontWeight={600} color={RED}>Sup.</Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Delete dialog */}
      <Dialog open={del.open} onClose={() => !deleting && setDel({ open: false, id: '', name: '' })} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '20px' } }}>
        <DialogTitle sx={{ color: TXT, fontWeight: 800, fontSize: 17 }}>Supprimer le produit</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color={SUB2}>
            Êtes-vous sûr de vouloir supprimer <strong style={{ color: TXT }}>"{del.name}"</strong> ?
          </Typography>
          <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Typography fontSize={12.5} color={RED}>
              ⚠ Cette action est irréversible et supprimera toutes les images associées.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
          <Button onClick={() => setDel({ open: false, id: '', name: '' })} disabled={deleting}
            sx={{ color: SUB2, borderRadius: '10px' }}>
            Annuler
          </Button>
          <Button onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit"/> : <Delete sx={{ fontSize: 16 }}/>}
            sx={{ bgcolor: RED, color: '#fff', borderRadius: '10px', fontWeight: 700, px: 2.5,
              '&:hover': { bgcolor: '#DC2626' }, '&:disabled': { bgcolor: 'rgba(15,23,42,0.04)', color: SUB } }}>
            {deleting ? 'Suppression…' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
