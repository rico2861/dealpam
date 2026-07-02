import { useState } from 'react';
import {
  Box, Container, Typography, TextField, InputAdornment,
  Grid, Card, CardContent, Avatar, Chip, Button, Skeleton,
} from '@mui/material';
import {
  SearchRounded, StoreRounded, VerifiedRounded,
  StarRounded, LocationOnRounded,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const OR = '#FF6B00';
const BG = '#0F172A';

function StoreCard({ s }: { s: any }) {
  const initials = s.name?.slice(0, 2).toUpperCase() || 'ST';
  const rating   = s.avgRating ?? s.seller?.avgRating ?? 4.2;
  const reviews  = s.totalReviews ?? s.seller?.totalReviews ?? 0;

  return (
    <Card component={Link} to={`/boutique/${s.slug}`}
      sx={{
        textDecoration: 'none', borderRadius: 3, height: '100%',
        display: 'flex', flexDirection: 'column',
        border: '1px solid #F1F5F9',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        transition: 'all 0.2s',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
      }}>

      {/* Banner */}
      <Box sx={{
        height: 70, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${BG} 0%, #1E3A5F 100%)`,
      }}>
        <Box sx={{
          position: 'absolute', top: -20, right: -20,
          width: 100, height: 100, borderRadius: '50%',
          background: `radial-gradient(circle, ${OR}33 0%, transparent 70%)`,
        }} />
      </Box>

      <CardContent sx={{ flex: 1, pt: 0, px: 2, pb: '12px !important' }}>
        {/* Avatar */}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: -2.5, mb: 1 }}>
          <Avatar
            src={s.logoUrl || undefined}
            sx={{ width: 52, height: 52, bgcolor: OR, fontSize: 18, fontWeight: 800,
              border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            {!s.logoUrl && initials}
          </Avatar>
          {s.isVerified && (
            <Chip icon={<VerifiedRounded sx={{ fontSize: '11px !important' }} />}
              label="Vérifié" size="small"
              sx={{ bgcolor: '#ECFDF5', color: '#10B981', fontWeight: 700, fontSize: 10,
                height: 20, '& .MuiChip-icon': { color: '#10B981' } }} />
          )}
        </Box>

        <Typography fontWeight={700} fontSize={14} color="#1E293B" noWrap>{s.name}</Typography>

        {(s.city || s.department) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4 }}>
            <LocationOnRounded sx={{ fontSize: 11, color: '#94A3B8' }} />
            <Typography fontSize={11} color="#94A3B8" noWrap>
              {[s.city, s.department].filter(Boolean).join(', ')}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.8 }}>
          <StarRounded sx={{ fontSize: 13, color: '#F59E0B' }} />
          <Typography fontSize={12} fontWeight={700} color="#1E293B">{Number(rating).toFixed(1)}</Typography>
          {reviews > 0 && (
            <Typography fontSize={11} color="#94A3B8">({reviews})</Typography>
          )}
        </Box>

        {s.description && (
          <Typography fontSize={11.5} color="#64748B" mt={0.8}
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {s.description}
          </Typography>
        )}
      </CardContent>

      <Box sx={{ px: 2, pb: 1.5 }}>
        <Button fullWidth size="small" variant="outlined"
          sx={{ borderColor: OR, color: OR, fontWeight: 700, fontSize: 12, borderRadius: 2,
            textTransform: 'none', '&:hover': { bgcolor: `${OR}10`, borderColor: OR } }}>
          Voir la boutique
        </Button>
      </Box>
    </Card>
  );
}

export default function StoresPage() {
  const [search, setSearch] = useState('');

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['stores', search],
    queryFn: () => api.get(`/stores?limit=60${search ? `&search=${encodeURIComponent(search)}` : ''}`).then(r => r.data?.data || r.data || []),
    staleTime: 120_000,
  });

  const filtered = search
    ? (stores as any[]).filter((s: any) =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.city?.toLowerCase().includes(search.toLowerCase()) ||
        s.department?.toLowerCase().includes(search.toLowerCase()))
    : stores as any[];

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pb: 10 }}>
      {/* Header */}
      <Box sx={{ bgcolor: BG, pt: { xs: 3, sm: 4 }, pb: 4 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <StoreRounded sx={{ color: OR, fontSize: 28 }} />
            <Typography variant="h5" fontWeight={800} color="white">Boutiques</Typography>
            {!isLoading && (
              <Chip label={filtered.length} size="small"
                sx={{ bgcolor: `${OR}33`, color: OR, fontWeight: 800 }} />
            )}
          </Box>

          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="Chercher une boutique, ville..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded sx={{ color: '#94A3B8', fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white', borderRadius: 3,
                '& fieldset': { border: 'none' },
              },
              '& input': { fontSize: 14 },
            }}
          />
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {isLoading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Grid item xs={6} sm={4} md={3} key={i}>
                <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <StoreRounded sx={{ fontSize: 60, color: '#E5E7EB', mb: 2 }} />
            <Typography variant="h6" color="#374151" fontWeight={700}>
              {search ? 'Aucune boutique trouvée' : 'Aucune boutique disponible'}
            </Typography>
            {search && (
              <Button onClick={() => setSearch('')} sx={{ mt: 2, color: OR }}>
                Effacer la recherche
              </Button>
            )}
          </Box>
        ) : (
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {filtered.map((s: any) => (
              <Grid item xs={6} sm={4} md={3} key={s.id}>
                <StoreCard s={s} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
