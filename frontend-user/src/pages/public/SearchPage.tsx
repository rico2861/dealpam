import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Container, Grid, Box, Typography, InputBase, Button, Chip,
  Select, MenuItem, Slider, FormControlLabel, Switch, Skeleton,
  alpha, IconButton, Drawer, useMediaQuery, useTheme, Divider,
  Pagination, Avatar, Rating,
} from '@mui/material';
import {
  Search, Close, Tune, ShoppingCart,
  Favorite, FavoriteBorder, LocationOn, Verified,
  GridView, ViewList,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '../../api/axios';
import { useCartStore } from '../../store/cart.store';
import { useLocationStore } from '../../store/location.store';
import { useSnackbar } from 'notistack';

const ORANGE = '#FF9900';
const DARK = '#131921';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'popular', label: 'Plus populaires' },
  { value: 'latest', label: 'Plus recents' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix decroissant' },
  { value: 'rating', label: 'Mieux notes' },
];

const CATEGORIES = [
  { slug: 'femmes', label: 'Femmes' },
  { slug: 'hommes', label: 'Hommes' },
  { slug: 'enfants', label: 'Enfants' },
  { slug: 'electronique', label: 'Electronique' },
  { slug: 'maison', label: 'Maison & Deco' },
  { slug: 'beaute', label: 'Beaute' },
  { slug: 'bijoux', label: 'Bijoux' },
  { slug: 'sport', label: 'Sport' },
  { slug: 'chaussures', label: 'Chaussures' },
  { slug: 'sacs', label: 'Sacs' },
  { slug: 'mode', label: 'Mode' },
  { slug: 'jeux', label: 'Jeux' },
  { slug: 'vehicules', label: 'Vehicules' },
  { slug: 'alimentation', label: 'Alimentation' },
  { slug: 'services', label: 'Services' },
];

const DEPARTMENTS = ['Ouest', 'Nord', 'Nord-Est', 'Nord-Ouest', 'Artibonite', 'Centre', 'Sud', 'Sud-Est', "Grand'Anse", 'Nippes'];

function ProductCardGrid({ p }: { p: any }) {
  const { fetchCount } = useCartStore();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const [wished, setWished] = useState(false);

  const addToCart = useMutation({
    mutationFn: () => api.post('/cart/items', { productId: p.id, quantity: 1 }),
    onSuccess: () => { fetchCount(); qc.invalidateQueries({ queryKey: ['cart'] }); enqueueSnackbar('Ajout au panier !', { variant: 'success' }); },
    onError: () => enqueueSnackbar('Erreur ajout panier', { variant: 'error' }),
  });

  const toggleWish = useMutation({
    mutationFn: () => wished ? api.delete('/wishlist/' + p.id) : api.post('/wishlist', { productId: p.id }),
    onSuccess: () => setWished(w => !w),
  });

  const img = p.images?.[0]?.urlMedium || p.images?.[0]?.url || 'https://via.placeholder.com/300';
  const hasDiscount = p.salePrice && Number(p.salePrice) < Number(p.price);
  const displayPrice = hasDiscount ? Number(p.salePrice) : Number(p.price);
  const discountPct = hasDiscount ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;

  return (
    <Box sx={{ bgcolor: 'white', borderRadius: 1.5, border: '1px solid #E8E8E8', overflow: 'hidden',
      transition: 'all 0.2s', position: 'relative',
      '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.1)', transform: 'translateY(-2px)', borderColor: '#D5D9D9' } }}>
      {hasDiscount && (
        <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1, bgcolor: '#CC0C39', color: 'white',
          fontSize: 10, fontWeight: 900, px: 0.8, py: 0.2, borderRadius: 0.5 }}>
          -{discountPct}%
        </Box>
      )}
      <IconButton onClick={() => toggleWish.mutate()} size="small"
        sx={{ position: 'absolute', top: 6, right: 6, zIndex: 1, bgcolor: 'rgba(255,255,255,0.9)',
          width: 28, height: 28, '&:hover': { bgcolor: 'white' } }}>
        {wished ? <Favorite sx={{ fontSize: 15, color: '#CC0C39' }} /> : <FavoriteBorder sx={{ fontSize: 15, color: '#64748B' }} />}
      </IconButton>

      <Box component={Link} to={`/products/${p.slug}`} sx={{ textDecoration: 'none', display: 'block' }}>
        <Box sx={{ aspectRatio: '1', overflow: 'hidden', bgcolor: '#F5F5F5' }}>
          <Box component="img" src={img} alt={p.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s',
              '&:hover': { transform: 'scale(1.05)' } }} />
        </Box>
        <Box sx={{ p: { xs: 1, md: 1.5 } }}>
          <Typography fontSize={{ xs: 11.5, md: 12.5 }} color="#555" noWrap mb={0.3}>
            {p.store?.name}
          </Typography>
          <Typography fontSize={{ xs: 12.5, md: 13.5 }} fontWeight={600} color="#0F1111"
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, mb: 0.5 }}>
            {p.name}
          </Typography>
          {p.avgRating > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.4 }}>
              <Rating value={p.avgRating} precision={0.5} readOnly size="small"
                sx={{ fontSize: 12, '& .MuiRating-iconFilled': { color: ORANGE } }} />
              <Typography fontSize={11} color="#565959">({p.reviewCount || 0})</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'nowrap', overflow: 'hidden', minWidth: 0 }}>
            <Typography fontSize={{ xs: 13.5, md: 15 }} fontWeight={900} color={hasDiscount ? '#CC0C39' : '#0F1111'} noWrap sx={{ flexShrink: 0 }}>
              {displayPrice.toLocaleString('fr-HT')} HTG
            </Typography>
            {hasDiscount && (
              <Typography fontSize={11} color="#64748B" noWrap sx={{ textDecoration: 'line-through', flexShrink: 1, minWidth: 0 }}>
                {Number(p.price).toLocaleString('fr-HT')} HTG
              </Typography>
            )}
          </Box>
          {p.store?.isVerified && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.3 }}>
              <Verified sx={{ fontSize: 11, color: '#007600' }} />
              <Typography fontSize={10.5} color="#007600" fontWeight={500}>Boutique veriflee</Typography>
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ px: { xs: 1, md: 1.5 }, pb: { xs: 1, md: 1.5 } }}>
        <Button fullWidth size="small" variant="contained" disableElevation
          onClick={() => addToCart.mutate()} disabled={addToCart.isPending}
          sx={{ bgcolor: ORANGE, color: '#111', fontWeight: 700, fontSize: 11.5,
            borderRadius: 1, '&:hover': { bgcolor: '#FFB703' }, py: 0.6 }}>
          <ShoppingCart sx={{ fontSize: 14, mr: 0.5 }} /> Ajouter
        </Button>
      </Box>
    </Box>
  );
}

function ProductCardRow({ p }: { p: any }) {
  const { fetchCount } = useCartStore();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const addToCart = useMutation({
    mutationFn: () => api.post('/cart/items', { productId: p.id, quantity: 1 }),
    onSuccess: () => { fetchCount(); qc.invalidateQueries({ queryKey: ['cart'] }); enqueueSnackbar('Ajout au panier !', { variant: 'success' }); },
  });
  const img = p.images?.[0]?.urlMedium || p.images?.[0]?.url || 'https://via.placeholder.com/300';
  const hasDiscount = p.salePrice && Number(p.salePrice) < Number(p.price);
  const displayPrice = hasDiscount ? Number(p.salePrice) : Number(p.price);

  return (
    <Box sx={{ bgcolor: 'white', borderRadius: 1.5, border: '1px solid #E8E8E8', overflow: 'hidden',
      display: 'flex', gap: 0, transition: 'all 0.2s',
      '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } }}>
      <Box component={Link} to={`/products/${p.slug}`}
        sx={{ width: { xs: 100, md: 160 }, flexShrink: 0, bgcolor: '#F5F5F5', textDecoration: 'none' }}>
        <Box component="img" src={img} alt={p.name}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: { xs: 100, md: 140 } }} />
      </Box>
      <Box sx={{ flex: 1, p: { xs: 1.2, md: 2 }, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography fontSize={11} color="#64748B">{p.store?.name}</Typography>
        <Typography component={Link} to={`/products/${p.slug}`} fontSize={{ xs: 13, md: 15 }} fontWeight={600}
          color="#0F1111" sx={{ textDecoration: 'none', '&:hover': { color: ORANGE },
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {p.name}
        </Typography>
        {p.avgRating > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <Rating value={p.avgRating} precision={0.5} readOnly size="small"
              sx={{ fontSize: 13, '& .MuiRating-iconFilled': { color: ORANGE } }} />
            <Typography fontSize={11.5} color="#565959">({p.reviewCount || 0})</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'nowrap', overflow: 'hidden', minWidth: 0 }}>
          <Typography fontSize={{ xs: 15, md: 19 }} fontWeight={900} color={hasDiscount ? '#CC0C39' : '#0F1111'} noWrap sx={{ flexShrink: 0 }}>
            {displayPrice.toLocaleString('fr-HT')} HTG
          </Typography>
          {hasDiscount && (
            <Typography fontSize={12} color="#64748B" noWrap sx={{ textDecoration: 'line-through', flexShrink: 1, minWidth: 0 }}>
              {Number(p.price).toLocaleString('fr-HT')} HTG
            </Typography>
          )}
        </Box>
        {p.description && (
          <Typography fontSize={12} color="#555" sx={{ display: { xs: 'none', md: '-webkit-box' },
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {p.description}
          </Typography>
        )}
        <Box sx={{ mt: 'auto', pt: 0.5 }}>
          <Button size="small" variant="contained" disableElevation onClick={() => addToCart.mutate()} disabled={addToCart.isPending}
            sx={{ bgcolor: ORANGE, color: '#111', fontWeight: 700, fontSize: 12, borderRadius: 1, px: 2,
              '&:hover': { bgcolor: '#FFB703' } }}>
            <ShoppingCart sx={{ fontSize: 15, mr: 0.5 }} /> Ajouter au panier
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

function FilterPanel({ filters, setFilters, onClose, userDept = '' }: { filters: any; setFilters: any; onClose?: () => void; userDept?: string }) {

  const set = (key: string, val: any) => setFilters((f: any) => ({ ...f, [key]: val }));

  return (
    <Box sx={{ width: { xs: '100%', md: 220 }, flexShrink: 0 }}>
      {onClose && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography fontWeight={800} fontSize={16}>Filtres</Typography>
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </Box>
      )}

      {/* Categories */}
      <Box sx={{ bgcolor: 'white', borderRadius: 1.5, border: '1px solid #E8E8E8', p: 2, mb: 1.5 }}>
        <Typography fontWeight={700} fontSize={13} mb={1.5} color="#0F1111">Catégorie</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
          <Box onClick={() => set('category', '')}
            sx={{ fontSize: 13, py: 0.5, px: 0.5, borderRadius: 0.8, cursor: 'pointer',
              fontWeight: !filters.category ? 700 : 400,
              color: !filters.category ? ORANGE : '#333',
              '&:hover': { bgcolor: alpha(ORANGE, 0.06) } }}>
            Toutes les catégories
          </Box>
          {CATEGORIES.map(cat => (
            <Box key={cat.slug} onClick={() => set('category', cat.slug)}
              sx={{ fontSize: 13, py: 0.5, px: 0.5, borderRadius: 0.8, cursor: 'pointer',
                fontWeight: filters.category === cat.slug ? 700 : 400,
                color: filters.category === cat.slug ? ORANGE : '#333',
                bgcolor: filters.category === cat.slug ? alpha(ORANGE, 0.06) : 'transparent',
                '&:hover': { bgcolor: alpha(ORANGE, 0.06) } }}>
              {cat.label}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Price range */}
      <Box sx={{ bgcolor: 'white', borderRadius: 1.5, border: '1px solid #E8E8E8', p: 2, mb: 1.5 }}>
        <Typography fontWeight={700} fontSize={13} mb={2} color="#0F1111">Prix (HTG)</Typography>
        <Slider
          value={[filters.minPrice || 0, filters.maxPrice || 50000]}
          min={0} max={50000} step={500}
          onChange={(_, val: any) => { set('minPrice', val[0]); set('maxPrice', val[1]); }}
          sx={{ color: ORANGE }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography fontSize={12} color="#555">{(filters.minPrice || 0).toLocaleString()} HTG</Typography>
          <Typography fontSize={12} color="#555">{(filters.maxPrice || 50000).toLocaleString()} HTG</Typography>
        </Box>
      </Box>

      {/* Rating */}
      <Box sx={{ bgcolor: 'white', borderRadius: 1.5, border: '1px solid #E8E8E8', p: 2, mb: 1.5 }}>
        <Typography fontWeight={700} fontSize={13} mb={1} color="#0F1111">Note minimale</Typography>
        {[4, 3, 2, 0].map(r => (
          <Box key={r} onClick={() => set('minRating', r || undefined)}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, cursor: 'pointer',
              color: filters.minRating === r ? ORANGE : '#333',
              '&:hover': { color: ORANGE } }}>
            <Rating value={r || 5} readOnly size="small" sx={{ fontSize: 14, '& .MuiRating-iconFilled': { color: ORANGE } }} />
            <Typography fontSize={12} fontWeight={filters.minRating === r ? 700 : 400}>
              {r === 0 ? 'Toutes' : `${r}+ etoiles`}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Location */}
      <Box sx={{ bgcolor: 'white', borderRadius: 1.5, border: '1px solid #E8E8E8', p: 2, mb: 1.5 }}>
        <Typography fontWeight={700} fontSize={13} mb={1} color="#0F1111">
          <LocationOn sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.3, color: ORANGE }} />
          Zone de livraison
        </Typography>
        <Box onClick={() => set('department', '')}
          sx={{ fontSize: 12.5, py: 0.4, px: 0.5, cursor: 'pointer', borderRadius: 0.8,
            fontWeight: !filters.department ? 700 : 400, color: !filters.department ? ORANGE : '#333',
            '&:hover': { bgcolor: alpha(ORANGE, 0.06) } }}>
          Tout Haiti
        </Box>
        {DEPARTMENTS.map(dept => (
          <Box key={dept} onClick={() => set('department', dept)}
            sx={{ fontSize: 12.5, py: 0.4, px: 0.5, cursor: 'pointer', borderRadius: 0.8,
              fontWeight: filters.department === dept ? 700 : 400,
              color: filters.department === dept ? ORANGE : '#333',
              bgcolor: filters.department === dept ? alpha(ORANGE, 0.06) : 'transparent',
              '&:hover': { bgcolor: alpha(ORANGE, 0.06) } }}>
            {dept}
          </Box>
        ))}
      </Box>

      {/* Stock */}
      <Box sx={{ bgcolor: 'white', borderRadius: 1.5, border: '1px solid #E8E8E8', p: 2, mb: 1.5 }}>
        <FormControlLabel
          control={<Switch checked={!!filters.inStock} onChange={e => set('inStock', e.target.checked)} size="small"
            sx={{ '& .MuiSwitch-thumb': { bgcolor: filters.inStock ? ORANGE : undefined },
              '& .Mui-checked + .MuiSwitch-track': { bgcolor: ORANGE } }} />}
          label={<Typography fontSize={13} fontWeight={600}>En stock uniquement</Typography>}
        />
      </Box>

      {/* Reset */}
      <Button fullWidth variant="outlined" size="small"
        onClick={() => setFilters({ category: '', minPrice: 0, maxPrice: 50000, minRating: undefined, department: userDept, inStock: false })}
        sx={{ borderColor: '#64748B', color: '#333', fontSize: 12, borderRadius: 1 }}>
        Réinitialiser les filtres
      </Button>
    </Box>
  );
}

export default function SearchPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();
  const { location: locData } = useLocationStore();
  const userDept = locData?.department || localStorage.getItem('dealpam_dept') || localStorage.getItem('dealpam_city') || '';
  const userCity = locData?.city || '';

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'relevance');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    minPrice: 0,
    maxPrice: 50000,
    minRating: undefined as number | undefined,
    department: searchParams.get('department') || userDept,
    inStock: false,
  });

  // Sync query from URL
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('category') || '';
    const dept = searchParams.get('department') || userDept;
    setQuery(q);
    setFilters(f => ({ ...f, category: cat, department: dept }));
    setPage(1);
  }, [searchParams]);

  const buildParams = () => {
    const p: Record<string, any> = { limit: 24, page, sort };
    if (query) p.search = query;
    if (filters.category) p.category = filters.category;
    if (filters.minPrice > 0) p.minPrice = filters.minPrice;
    if (filters.maxPrice < 50000) p.maxPrice = filters.maxPrice;
    if (filters.minRating) p.minRating = filters.minRating;
    if (filters.department) p.department = filters.department;
    if (filters.inStock) p.inStock = true;
    return p;
  };

  const { data, isLoading } = useQuery<{ data: any[]; total: number }>({
    queryKey: ['search', query, filters, sort, page],
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(buildParams()).forEach(([k, v]) => params.set(k, String(v)));
      return api.get('/products?' + params.toString()).then(r => r.data);
    },
    placeholderData: keepPreviousData,
  });

  const products: any[] = data?.data || [];
  const total: number = data?.total || 0;
  const totalPages = Math.ceil(total / 24);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p: Record<string, string> = {};
    if (query) p.q = query;
    if (filters.category) p.category = filters.category;
    if (filters.department) p.department = filters.department;
    setSearchParams(p);
    setPage(1);
  };

  const activeFiltersCount = [
    filters.category,
    filters.minPrice > 0,
    filters.maxPrice < 50000,
    filters.minRating,
    filters.department && filters.department !== userDept,
    filters.inStock,
  ].filter(Boolean).length;

  return (
    <Box sx={{ bgcolor: '#F5F5F5', minHeight: '100vh' }}>

      {/* ── Search bar top ── */}
      <Box sx={{ bgcolor: DARK, py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 4 } }}>
        <Box component="form" onSubmit={handleSearch}
          sx={{ maxWidth: 900, mx: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ flex: 1, display: 'flex', height: { xs: 42, md: 48 }, borderRadius: 1,
            border: `2px solid ${ORANGE}`, overflow: 'hidden', bgcolor: 'white' }}>
            <InputBase
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher produits, boutiques, catégories..."
              autoFocus
              sx={{ flex: 1, px: 2, fontSize: { xs: 13, md: 14.5 }, color: '#111',
                '& input::placeholder': { color: '#777', opacity: 1 } }}
            />
            {query && (
              <IconButton onClick={() => setQuery('')} size="small" sx={{ mr: 0.5 }}>
                <Close fontSize="small" sx={{ color: '#777' }} />
              </IconButton>
            )}
          </Box>
          <Button type="submit" variant="contained" disableElevation
            sx={{ bgcolor: ORANGE, color: '#111', fontWeight: 800, height: { xs: 42, md: 48 }, px: 2.5,
              borderRadius: 1, flexShrink: 0, '&:hover': { bgcolor: '#FFB703' } }}>
            <Search sx={{ fontSize: 22 }} />
          </Button>
        </Box>

        {/* Active filter chips */}
        {(query || filters.category || filters.department) && (
          <Box sx={{ maxWidth: 900, mx: 'auto', mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
            {query && (
              <Chip label={`"${query}"`} size="small" onDelete={() => { setQuery(''); setSearchParams({}); }}
                sx={{ bgcolor: alpha(ORANGE, 0.15), color: ORANGE, fontWeight: 700, fontSize: 12 }} />
            )}
            {filters.category && (
              <Chip label={CATEGORIES.find(c => c.slug === filters.category)?.label || filters.category}
                size="small" onDelete={() => setFilters(f => ({ ...f, category: '' }))}
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 12 }} />
            )}
            {filters.department && (
              <Chip label={filters.department} size="small" icon={<LocationOn sx={{ fontSize: 13, color: 'white !important' }} />}
                onDelete={() => setFilters(f => ({ ...f, department: '' }))}
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 12 }} />
            )}
          </Box>
        )}
      </Box>

      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>

          {/* Filters sidebar — desktop */}
          {!isMobile && (
            <FilterPanel filters={filters} setFilters={f => { setFilters(f); setPage(1); }} userDept={userDept} />
          )}

          {/* Results */}
          <Box sx={{ flex: 1, minWidth: 0 }}>

            {/* Results header */}
            <Box sx={{ bgcolor: 'white', borderRadius: 1.5, border: '1px solid #E8E8E8', px: 2, py: 1.2, mb: 1.5,
              display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {isMobile && (
                <Button startIcon={<Tune />} size="small" onClick={() => setDrawerOpen(true)}
                  sx={{ color: '#333', border: '1px solid #D5D9D9', borderRadius: 1, fontSize: 12.5,
                    position: 'relative' }}>
                  Filtres
                  {activeFiltersCount > 0 && (
                    <Box sx={{ position: 'absolute', top: -6, right: -6, bgcolor: ORANGE, color: '#111',
                      borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 900,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {activeFiltersCount}
                    </Box>
                  )}
                </Button>
              )}

              <Typography fontSize={13} color="#555" sx={{ flex: 1 }}>
                {isLoading ? 'Recherche...' : (
                  <>{total.toLocaleString()} résultat{total !== 1 ? 's' : ''}
                    {query ? <> pour <strong>"{query}"</strong></> : ''}
                    {filters.department ? <> dans <strong>{filters.department}</strong></> : ''}
                  </>
                )}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography fontSize={12} color="#555">Trier par :</Typography>
                <Select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} size="small"
                  sx={{ fontSize: 12.5, minWidth: 160, '& .MuiSelect-select': { py: 0.6 } }}>
                  {SORT_OPTIONS.map(o => <MenuItem key={o.value} value={o.value} sx={{ fontSize: 12.5 }}>{o.label}</MenuItem>)}
                </Select>
                <Box sx={{ display: 'flex', border: '1px solid #D5D9D9', borderRadius: 1, overflow: 'hidden' }}>
                  <IconButton size="small" onClick={() => setView('grid')}
                    sx={{ borderRadius: 0, bgcolor: view === 'grid' ? alpha(ORANGE, 0.1) : 'transparent', p: 0.7 }}>
                    <GridView sx={{ fontSize: 18, color: view === 'grid' ? ORANGE : '#666' }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => setView('list')}
                    sx={{ borderRadius: 0, bgcolor: view === 'list' ? alpha(ORANGE, 0.1) : 'transparent', p: 0.7 }}>
                    <ViewList sx={{ fontSize: 18, color: view === 'list' ? ORANGE : '#666' }} />
                  </IconButton>
                </Box>
              </Box>
            </Box>

            {/* Products */}
            {isLoading ? (
              <Grid container spacing={1.5}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <Grid item xs={6} sm={4} md={3} key={i}>
                    <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 1.5 }} />
                  </Grid>
                ))}
              </Grid>
            ) : products.length === 0 ? (
              <Box sx={{ bgcolor: 'white', borderRadius: 2, p: { xs: 4, md: 6 }, textAlign: 'center',
                border: '1px solid #E8E8E8' }}>
                <Typography fontSize={48} mb={1}>🔍</Typography>
                <Typography fontSize={20} fontWeight={700} mb={0.5} color="#0F1111">
                  Aucun résultat trouvé
                </Typography>
                <Typography fontSize={14} color="#555" mb={3}>
                  {query ? `Aucun produit pour "${query}"` : 'Aucun produit ne correspond aux filtres'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {query && (
                    <Button onClick={() => { setQuery(''); setSearchParams({}); }}
                      variant="outlined" sx={{ borderColor: ORANGE, color: ORANGE, borderRadius: 1.5 }}>
                      Effacer la recherche
                    </Button>
                  )}
                  <Button component={Link} to="/products" variant="contained" disableElevation
                    sx={{ bgcolor: ORANGE, color: '#111', fontWeight: 700, borderRadius: 1.5 }}>
                    Voir tous les produits
                  </Button>
                </Box>

                {/* Suggested categories */}
                <Divider sx={{ my: 3 }} />
                <Typography fontSize={13} fontWeight={600} color="#555" mb={1.5}>
                  Explorer par catégorie
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                  {CATEGORIES.slice(0, 8).map(cat => (
                    <Chip key={cat.slug} label={cat.label} component={Link} to={`/products?category=${cat.slug}`}
                      clickable size="small"
                      sx={{ fontSize: 12.5, '&:hover': { bgcolor: alpha(ORANGE, 0.1), borderColor: ORANGE } }} />
                  ))}
                </Box>
              </Box>
            ) : view === 'grid' ? (
              <Grid container spacing={1.5}>
                {products.map((p: any) => (
                  <Grid item xs={6} sm={4} md={3} key={p.id}>
                    <ProductCardGrid p={p} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {products.map((p: any) => (
                  <ProductCardRow key={p.id} p={p} />
                ))}
              </Box>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages} page={page}
                  onChange={(_, v) => { setPage(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  sx={{
                    '& .MuiPaginationItem-root': { fontSize: 13.5 },
                    '& .Mui-selected': { bgcolor: ORANGE + ' !important', color: '#111', fontWeight: 700 },
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Container>

      {/* Mobile filter drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 300, p: 2 } }}>
        <FilterPanel
          filters={filters}
          setFilters={f => { setFilters(f); setPage(1); }}
          onClose={() => setDrawerOpen(false)}
          userDept={userDept}
        />
      </Drawer>
    </Box>
  );
}
