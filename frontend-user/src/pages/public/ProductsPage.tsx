import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Grid, Typography, Box, Card, FormControl, InputLabel, Select, MenuItem,
  Button, Pagination, Drawer, IconButton, Slider, Chip,
  useMediaQuery, useTheme, alpha, Collapse, Switch, Tooltip,
} from '@mui/material';
import {
  FilterList, Close, Star, ExpandMore, ExpandLess, Check,
  Verified, LocalShipping, FlashOn, Inventory, LocationOn,
  MyLocation, FmdGood,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useLocationStore } from '../../store/location.store';
import { ProductCardSkeleton } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

const ORANGE = '#FF9900';
const HAITI_DEPTS = [
  'Ouest', 'Nord', 'Nord-Est', 'Nord-Ouest', 'Artibonite',
  'Centre', 'Sud', 'Sud-Est', 'Grande-Anse', 'Nippes',
];

// ─── PREMIUM PRODUCT CARD ─────────────────────────────────────────────────────

function ProductCard({ p }: { p: any }) {
  const isOnSale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const discount = isOnSale ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
  const displayImg = p.images?.[0]?.urlThumb || p.images?.[0]?.urlMedium || p.images?.[0]?.url || '';

  return (
    <Card sx={{
      height: '100%', display: 'flex', flexDirection: 'column', position: 'relative',
      border: '1px solid #EBEBEB', boxShadow: 'none', borderRadius: 2,
      transition: 'box-shadow 0.22s, transform 0.22s',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 28px rgba(0,0,0,0.11)', borderColor: ORANGE },
      '&:hover .prod-img': { transform: 'scale(1.04)' },
    }}>

      {/* Badges top-left */}
      <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        {isOnSale && (
          <Box sx={{ bgcolor: '#CC0C39', color: 'white', fontWeight: 900, fontSize: 10.5,
            px: 0.9, py: 0.3, borderRadius: 0.7, lineHeight: 1.2 }}>
            -{discount}%
          </Box>
        )}
        {p.isSponsored && (
          <Box sx={{ bgcolor: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 9, fontWeight: 600,
            px: 0.7, py: 0.2, borderRadius: 0.5, lineHeight: 1.2 }}>
            Sponsorisé
          </Box>
        )}
      </Box>

      {p.store?.isVerified && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
          <Tooltip title="Vendeur vérifié">
            <Box sx={{ bgcolor: 'white', borderRadius: '50%', width: 26, height: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <Verified sx={{ fontSize: 16, color: '#3B82F6' }} />
            </Box>
          </Tooltip>
        </Box>
      )}

      <Box component={Link} to={`/products/${p.slug}`} sx={{ textDecoration: 'none', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Image */}
        <Box sx={{ overflow: 'hidden', height: { xs: 170, sm: 210 }, bgcolor: '#F8F8F8', flexShrink: 0 }}>
          <img
            src={displayImg || 'https://placehold.co/400x300/F5F5F5/AAAAAA?text=Photo'}
            alt={p.name}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="prod-img"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transition: 'transform 0.38s cubic-bezier(0.25,0.46,0.45,0.94)',
              willChange: 'transform', backfaceVisibility: 'hidden',
            }} />
        </Box>

        {/* Content */}
        <Box sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Store */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.4 }}>
            <Typography fontSize={10.5} color="#64748B" fontWeight={500} noWrap sx={{ flex: 1 }}>
              {p.store?.name}
            </Typography>
            {p.store?.isVerified && (
              <Verified sx={{ fontSize: 11, color: '#3B82F6', flexShrink: 0 }} />
            )}
          </Box>

          {/* Name */}
          <Typography fontSize={{ xs: 12, sm: 13 }} fontWeight={600} color="#0F1111"
            sx={{ mb: 0.5, overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4, flex: 1 }}>
            {p.name}
          </Typography>

          {/* Price */}
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.6, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography fontWeight={900} fontSize={15} color="#CC0C39" lineHeight={1}>
              {Number(p.salePrice || p.price).toLocaleString()} HTG
            </Typography>
            {isOnSale && (
              <Typography fontSize={11} color="#AAA" sx={{ textDecoration: 'line-through' }}>
                {Number(p.price).toLocaleString()}
              </Typography>
            )}
          </Box>

          {/* Rating — always visible, stronger on hover */}
          {p.avgRating > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <Box sx={{ display: 'flex' }}>
                {[1,2,3,4,5].map(s => (
                  <Star key={s} sx={{ fontSize: 11, color: s <= Math.round(p.avgRating) ? '#F59E0B' : '#E0E0E0' }} />
                ))}
              </Box>
              <Typography fontSize={10.5} color="#64748B">
                {p.avgRating?.toFixed(1)} ({(p.totalReviews || 0).toLocaleString()})
              </Typography>
            </Box>
          )}

        </Box>
      </Box>
    </Card>
  );
}

// ─── FILTER SECTION ACCORDION ─────────────────────────────────────────────────

function FilterSection({ title, count = 0, defaultOpen = true, children }: any) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Box sx={{ borderBottom: '1px solid #F0F0F0' }}>
      <Box onClick={() => setOpen(o => !o)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.4, cursor: 'pointer', userSelect: 'none',
          '&:hover': { bgcolor: '#FAFAFA' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Typography fontWeight={700} fontSize={12.5} color="#111">{title}</Typography>
          {count > 0 && (
            <Box sx={{ px: 0.7, height: 17, borderRadius: 1, bgcolor: ORANGE,
              display: 'inline-flex', alignItems: 'center' }}>
              <Typography fontSize={9.5} fontWeight={900} color="white">{count}</Typography>
            </Box>
          )}
        </Box>
        {open ? <ExpandLess sx={{ fontSize: 16, color: '#999' }} /> : <ExpandMore sx={{ fontSize: 16, color: '#999' }} />}
      </Box>
      <Collapse in={open}><Box sx={{ pb: 1.5 }}>{children}</Box></Collapse>
    </Box>
  );
}

// Radio-style row helper
function RadioRow({ active, label, color = ORANGE, onClick, children }: any) {
  return (
    <Box onClick={onClick}
      sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.7, px: 1.5, mb: 0.2,
        borderRadius: 1.5, cursor: 'pointer', transition: 'all 0.15s',
        bgcolor: active ? alpha(color, 0.07) : 'transparent',
        '&:hover': { bgcolor: active ? alpha(color, 0.1) : '#F8F8F8' } }}>
      <Box sx={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${active ? color : '#CCC'}`,
        bgcolor: active ? color : 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
        {active && <Check sx={{ fontSize: 11, color: 'white' }} />}
      </Box>
      {children || <Typography fontSize={12.5} fontWeight={active ? 700 : 400} color={active ? color : '#444'}>{label}</Typography>}
    </Box>
  );
}

// Toggle row helper
function ToggleRow({ active, label, icon, color = '#059669', onChange }: any) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: 1.5, py: 0.6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
        <Box sx={{ color: active ? color : '#BBB', display: 'flex', transition: 'color 0.2s' }}>{icon}</Box>
        <Typography fontSize={12.5} fontWeight={active ? 600 : 400} color={active ? '#111' : '#555'}>{label}</Typography>
      </Box>
      <Switch checked={active} onChange={onChange} size="small"
        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: color } }} />
    </Box>
  );
}

// ─── MAIN FILTER PANEL ────────────────────────────────────────────────────────

interface FilterState {
  category: string; priceRange: [number, number]; minRating: number;
  verified: boolean; delivery: boolean; inStock: boolean; onSale: boolean;
  dept: string; proximity: boolean;
}

function FilterPanel({ fs, setFs, onClose }: { fs: FilterState; setFs: (v: FilterState) => void; onClose?: () => void }) {
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data).catch(() => []),
  });
  const catList: any[] = Array.isArray(categories) && categories.length > 0 ? categories : [
    { slug: 'mode', name: 'Mode' }, { slug: 'electronique', name: 'Électronique' },
    { slug: 'maison', name: 'Maison' }, { slug: 'beaute', name: 'Beauté' },
    { slug: 'bijoux', name: 'Bijoux' }, { slug: 'sport', name: 'Sport' },
    { slug: 'vehicules', name: 'Véhicules' }, { slug: 'chaussures', name: 'Chaussures' },
    { slug: 'sacs', name: 'Sacs' }, { slug: 'jeux', name: 'Jeux & Tech' },
  ];

  const activeCount = [
    fs.category, fs.priceRange[0] > 0 || fs.priceRange[1] < 50000,
    fs.minRating > 0, fs.verified, fs.delivery, fs.inStock, fs.onSale, fs.dept, fs.proximity,
  ].filter(Boolean).length;

  const reset = () => setFs({ category: '', priceRange: [0, 50000], minRating: 0, verified: false, delivery: false, inStock: false, onSale: false, dept: '', proximity: false });
  const { location: locData } = useLocationStore();
  const userDept = locData?.department || localStorage.getItem('dealpam_dept') || localStorage.getItem('dealpam_city') || '';
  const userCity = locData?.city || '';

  return (
    <Box sx={{ width: { xs: 290, md: '100%' }, bgcolor: 'white', borderRadius: { md: 2 },
      border: { md: '1px solid #EBEBEB' }, overflow: 'hidden', fontSize: 13 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.6, borderBottom: '2px solid #F0F0F0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(ORANGE, 0.12),
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FilterList sx={{ color: ORANGE, fontSize: 15 }} />
          </Box>
          <Typography fontWeight={800} fontSize={14} color="#111">Filtrer</Typography>
          {activeCount > 0 && (
            <Box sx={{ px: 0.7, height: 17, borderRadius: 1, bgcolor: ORANGE,
              display: 'inline-flex', alignItems: 'center' }}>
              <Typography fontSize={9.5} fontWeight={900} color="white">{activeCount}</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {activeCount > 0 && (
            <Button size="small" onClick={reset}
              sx={{ fontSize: 11, color: '#666', fontWeight: 600, px: 1, py: 0.3,
                borderRadius: 1.5, border: '1px solid #E0E0E0', minWidth: 0,
                '&:hover': { borderColor: '#CC0C39', color: '#CC0C39' } }}>
              Réinitialiser
            </Button>
          )}
          {onClose && <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>}
        </Box>
      </Box>

      {/* Active chips */}
      {activeCount > 0 && (
        <Box sx={{ px: 1.5, py: 1, bgcolor: alpha(ORANGE, 0.04), borderBottom: '1px solid #F5F5F5',
          display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {fs.category && <Chip label={fs.category} size="small" onDelete={() => setFs({ ...fs, category: '' })}
            sx={{ fontSize: 11, bgcolor: alpha(ORANGE, 0.1), color: ORANGE, fontWeight: 600 }} />}
          {fs.dept && <Chip label={fs.dept} size="small" onDelete={() => setFs({ ...fs, dept: '' })}
            sx={{ fontSize: 11, bgcolor: '#EEF2FF', color: '#6366F1', fontWeight: 600 }} />}
          {fs.proximity && userDept && <Chip label={`📍 ${userCity || userDept}`} size="small" onDelete={() => setFs({ ...fs, proximity: false })}
            sx={{ fontSize: 11, bgcolor: '#ECFDF5', color: '#059669', fontWeight: 600 }} />}
          {(fs.priceRange[0] > 0 || fs.priceRange[1] < 50000) && (
            <Chip label={`${fs.priceRange[0].toLocaleString()}–${fs.priceRange[1].toLocaleString()} HTG`}
              size="small" onDelete={() => setFs({ ...fs, priceRange: [0, 50000] })}
              sx={{ fontSize: 11, bgcolor: alpha(ORANGE, 0.1), color: ORANGE, fontWeight: 600 }} />
          )}
          {fs.verified && <Chip label="Vérifié" size="small" onDelete={() => setFs({ ...fs, verified: false })}
            sx={{ fontSize: 11, bgcolor: '#EFF6FF', color: '#3B82F6', fontWeight: 600 }} />}
          {fs.delivery && <Chip label="Livraison" size="small" onDelete={() => setFs({ ...fs, delivery: false })}
            sx={{ fontSize: 11, bgcolor: '#ECFDF5', color: '#059669', fontWeight: 600 }} />}
          {fs.onSale && <Chip label="Promo" size="small" onDelete={() => setFs({ ...fs, onSale: false })}
            sx={{ fontSize: 11, bgcolor: '#FFF1F2', color: '#CC0C39', fontWeight: 600 }} />}
          {fs.inStock && <Chip label="En stock" size="small" onDelete={() => setFs({ ...fs, inStock: false })}
            sx={{ fontSize: 11, bgcolor: '#ECFDF5', color: '#059669', fontWeight: 600 }} />}
        </Box>
      )}

      {/* ── PROXIMITÉ ── */}
      {userDept && (
        <FilterSection title="Proximité" count={fs.proximity ? 1 : 0}>
          <Box sx={{ px: 1.5 }}>
            <Box onClick={() => setFs({ ...fs, proximity: !fs.proximity, dept: fs.proximity ? fs.dept : '' })}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.8, px: 1, borderRadius: 1.5,
                cursor: 'pointer', bgcolor: fs.proximity ? alpha('#059669', 0.07) : 'transparent',
                border: `1.5px solid ${fs.proximity ? '#059669' : '#E8E8E8'}`,
                '&:hover': { borderColor: '#059669', bgcolor: alpha('#059669', 0.05) }, transition: 'all 0.15s' }}>
              <MyLocation sx={{ fontSize: 16, color: fs.proximity ? '#059669' : '#999' }} />
              <Box sx={{ flex: 1 }}>
                <Typography fontSize={12.5} fontWeight={700} color={fs.proximity ? '#059669' : '#333'}>
                  À proximité de moi
                </Typography>
                <Typography fontSize={10.5} color="#64748B">{userCity || userDept}</Typography>
              </Box>
              {fs.proximity && <Check sx={{ fontSize: 14, color: '#059669' }} />}
            </Box>
          </Box>
        </FilterSection>
      )}

      {/* ── DÉPARTEMENT ── */}
      <FilterSection title="Département" count={fs.dept ? 1 : 0} defaultOpen={false}>
        <Box sx={{ px: 1.5 }}>
          <RadioRow active={!fs.dept} label="Tout Haïti" color={ORANGE}
            onClick={() => setFs({ ...fs, dept: '', proximity: false })} />
          {HAITI_DEPTS.map(d => (
            <RadioRow key={d} active={fs.dept === d} label={d} color="#6366F1"
              onClick={() => setFs({ ...fs, dept: d, proximity: false })} />
          ))}
        </Box>
      </FilterSection>

      {/* ── CATEGORIES ── */}
      <FilterSection title="Catégories" count={fs.category ? 1 : 0}>
        <Box sx={{ px: 0.5 }}>
          <RadioRow active={!fs.category} label="Toutes les catégories" color={ORANGE}
            onClick={() => setFs({ ...fs, category: '' })} />
          {catList.map((c: any) => (
            <RadioRow key={c.id || c.slug} active={fs.category === c.slug} label={c.name} color={ORANGE}
              onClick={() => setFs({ ...fs, category: c.slug })} />
          ))}
        </Box>
      </FilterSection>

      {/* ── PRIX ── */}
      <FilterSection title="Prix (HTG)" count={fs.priceRange[0] > 0 || fs.priceRange[1] < 50000 ? 1 : 0}>
        <Box sx={{ px: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 1.5 }}>
            {[[0, 2000, '< 2 000'], [2000, 8000, '2k – 8k'], [8000, 20000, '8k – 20k'], [20000, 50000, '> 20k']].map(([min, max, lbl]) => {
              const active = fs.priceRange[0] === min && fs.priceRange[1] === max;
              return (
                <Box key={String(lbl)} onClick={() => setFs({ ...fs, priceRange: [min as number, max as number] })}
                  sx={{ px: 1.1, py: 0.35, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    border: `1.5px solid ${active ? ORANGE : '#E0E0E0'}`,
                    bgcolor: active ? alpha(ORANGE, 0.08) : 'white', color: active ? ORANGE : '#555',
                    transition: 'all 0.15s', '&:hover': { borderColor: ORANGE, color: ORANGE } }}>
                  {lbl}
                </Box>
              );
            })}
          </Box>
          <Slider value={fs.priceRange} onChange={(_, v) => setFs({ ...fs, priceRange: v as [number, number] })}
            min={0} max={50000} step={500} valueLabelDisplay="auto"
            valueLabelFormat={(v: number) => `${v.toLocaleString()} HTG`}
            sx={{ color: ORANGE,
              '& .MuiSlider-thumb': { width: 16, height: 16, bgcolor: 'white',
                border: `2.5px solid ${ORANGE}`, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' },
              '& .MuiSlider-track': { height: 4 }, '& .MuiSlider-rail': { height: 4, bgcolor: '#E8E8E8' },
            }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography fontSize={11} color="#666">{fs.priceRange[0].toLocaleString()} HTG</Typography>
            <Typography fontSize={11} color="#666">{fs.priceRange[1].toLocaleString()} HTG</Typography>
          </Box>
        </Box>
      </FilterSection>

      {/* ── TOGGLES ── */}
      <FilterSection title="Options" count={[fs.verified, fs.delivery, fs.onSale, fs.inStock].filter(Boolean).length}>
        <ToggleRow active={fs.verified} label="Vendeur vérifié" color="#3B82F6"
          icon={<Verified sx={{ fontSize: 15 }} />}
          onChange={(e: any) => setFs({ ...fs, verified: e.target.checked })} />
        <ToggleRow active={fs.delivery} label="Livraison disponible" color="#059669"
          icon={<LocalShipping sx={{ fontSize: 15 }} />}
          onChange={(e: any) => setFs({ ...fs, delivery: e.target.checked })} />
        <ToggleRow active={fs.onSale} label="En promotion" color="#CC0C39"
          icon={<FlashOn sx={{ fontSize: 15 }} />}
          onChange={(e: any) => setFs({ ...fs, onSale: e.target.checked })} />
        <ToggleRow active={fs.inStock} label="Disponible en stock" color="#6366F1"
          icon={<Inventory sx={{ fontSize: 15 }} />}
          onChange={(e: any) => setFs({ ...fs, inStock: e.target.checked })} />
      </FilterSection>

      {/* ── NOTE VENDEUR ── */}
      <FilterSection title="Note minimum" count={fs.minRating > 0 ? 1 : 0} defaultOpen={false}>
        <Box sx={{ px: 0.5 }}>
          <RadioRow active={fs.minRating === 0} label="Toutes les notes" color={ORANGE}
            onClick={() => setFs({ ...fs, minRating: 0 })} />
          {[4, 3, 2].map(r => (
            <RadioRow key={r} active={fs.minRating === r} color="#F59E0B"
              onClick={() => setFs({ ...fs, minRating: r })}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <Box sx={{ display: 'flex' }}>
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} sx={{ fontSize: 13, color: s <= r ? '#F59E0B' : '#E0E0E0' }} />
                  ))}
                </Box>
                <Typography fontSize={12} color={fs.minRating === r ? '#F59E0B' : '#666'}
                  fontWeight={fs.minRating === r ? 700 : 400}>& plus</Typography>
              </Box>
            </RadioRow>
          ))}
        </Box>
      </FilterSection>
    </Box>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const DEFAULT_FS: FilterState = {
  category: '', priceRange: [0, 50000], minRating: 0,
  verified: false, delivery: false, inStock: false, onSale: false, dept: '', proximity: false,
};

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const [fs, setFs] = useState<FilterState>({
    ...DEFAULT_FS,
    category: searchParams.get('category') || '',
    dept: searchParams.get('department') || '',
    onSale: searchParams.get('sponsored') === 'true',
  });
  const [sort, setSort] = useState(searchParams.get('sort') || 'latest');
  const [page, setPage] = useState(1);
  const [mobileFilter, setMobileFilter] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { location: locData } = useLocationStore();
  const userDept = locData?.department || localStorage.getItem('dealpam_dept') || localStorage.getItem('dealpam_city') || '';
  const userCity = locData?.city || '';
  const isServiceFilter = searchParams.get('productType') === 'SERVICE' || fs.category === 'services';

  // Sync searchParams → fs quand l'URL change
  useEffect(() => {
    const cat = searchParams.get('category') || '';
    const dept = searchParams.get('department') || '';
    setFs(f => {
      if (f.category === cat && f.dept === dept) return f;
      return { ...f, category: cat, dept };
    });
    setPage(1);
  }, [searchParams]);

  // Département effectif : filtre manuel OU proximité — jamais forcé sans action explicite
  const effectiveDept = fs.dept || (fs.proximity ? userDept : '');
  const effectiveCity = (!fs.dept && fs.proximity) ? userCity : '';

  const params: Record<string, string | number | boolean> = {
    sort, page, limit: 24,
    ...(fs.category && { category: fs.category }),
    ...(fs.priceRange[0] > 0 && { minPrice: fs.priceRange[0] }),
    ...(fs.priceRange[1] < 50000 && { maxPrice: fs.priceRange[1] }),
    ...(fs.minRating > 0 && { minRating: fs.minRating }),
    ...(fs.inStock && { inStock: 'true' }),
    ...(fs.onSale && { hasSale: 'true' }),
    ...(fs.verified && { storeVerified: 'true' }),
    ...(effectiveDept && { department: effectiveDept }),
    ...(effectiveCity && { city: effectiveCity }),
    ...(searchParams.get('productType') && { productType: searchParams.get('productType')! }),
  };
  Object.keys(params).forEach(k => { if (params[k] === '') delete params[k]; });

  const { data, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn: () => api.get('/products', { params }).then(r => r.data).catch(() => ({ data: [], total: 0, totalPages: 0 })),
  });
  const showSkel = useDelayedLoading(isLoading);

  // Fetch categories for horizontal chip bar
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data).catch(() => []),
  });
  const catList: Array<{ id?: string; slug: string; name: string }> =
    Array.isArray(categoriesData) && categoriesData.length > 0 ? categoriesData : [
      { slug: 'mode', name: 'Mode' }, { slug: 'electronique', name: 'Électronique' },
      { slug: 'maison', name: 'Maison' }, { slug: 'beaute', name: 'Beauté' },
      { slug: 'bijoux', name: 'Bijoux' }, { slug: 'sport', name: 'Sport' },
      { slug: 'vehicules', name: 'Véhicules' }, { slug: 'chaussures', name: 'Chaussures' },
      { slug: 'sacs', name: 'Sacs' }, { slug: 'jeux', name: 'Jeux & Tech' },
    ];

  const activeCount = [
    fs.category, fs.priceRange[0] > 0 || fs.priceRange[1] < 50000,
    fs.minRating > 0, fs.verified, fs.delivery, fs.inStock, fs.onSale,
    fs.dept || fs.proximity,
  ].filter(Boolean).length;

  // Active filter chips (excluding category, shown as pills above)
  const activeFilterChips: Array<{ label: string; onDelete: () => void }> = [
    ...(fs.dept ? [{ label: fs.dept, onDelete: () => setFs(f => ({ ...f, dept: '' })) }] : []),
    ...(fs.proximity && userDept ? [{ label: userCity || userDept, onDelete: () => setFs(f => ({ ...f, proximity: false })) }] : []),
    ...((fs.priceRange[0] > 0 || fs.priceRange[1] < 50000) ? [{ label: `${fs.priceRange[0].toLocaleString()}–${fs.priceRange[1].toLocaleString()} HTG`, onDelete: () => setFs(f => ({ ...f, priceRange: [0, 50000] })) }] : []),
    ...(fs.verified ? [{ label: 'Vérifié ✓', onDelete: () => setFs(f => ({ ...f, verified: false })) }] : []),
    ...(fs.delivery ? [{ label: 'Livraison', onDelete: () => setFs(f => ({ ...f, delivery: false })) }] : []),
    ...(fs.onSale ? [{ label: 'Promotion 🔥', onDelete: () => setFs(f => ({ ...f, onSale: false })) }] : []),
    ...(fs.inStock ? [{ label: 'En stock', onDelete: () => setFs(f => ({ ...f, inStock: false })) }] : []),
    ...(fs.minRating > 0 ? [{ label: `${fs.minRating}★ & +`, onDelete: () => setFs(f => ({ ...f, minRating: 0 })) }] : []),
  ];

  return (
    <Box sx={{ bgcolor: '#F4F5F7', minHeight: '100vh' }}>

      {/* ── TOP SECTION (white card, full width) ── */}
      <Box sx={{
        bgcolor: 'white',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        borderBottom: '1px solid #EBEBEB',
      }}>
        <Box sx={{ maxWidth: '100%', px: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 2 }, pb: 0 }}>

          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Typography
              component={Link} to="/"
              sx={{ fontSize: 12, color: '#64748B', textDecoration: 'none', '&:hover': { color: ORANGE } }}>
              Accueil
            </Typography>
            <Typography fontSize={12} color="#D1D5DB">›</Typography>
            <Typography fontSize={12} color="#64748B">Produits</Typography>
            {(fs.category || isServiceFilter) && (
              <>
                <Typography fontSize={12} color="#D1D5DB">›</Typography>
                <Typography fontSize={12} color={ORANGE} fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                  {fs.category || 'Services'}
                </Typography>
              </>
            )}
          </Box>

          {/* Title row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography fontWeight={900} sx={{ fontSize: { xs: 20, md: 26 }, letterSpacing: '-0.5px', color: '#111827' }}>
                  {fs.category
                    ? fs.category.charAt(0).toUpperCase() + fs.category.slice(1)
                    : isServiceFilter
                      ? 'Services'
                      : 'Tous les produits'}
                </Typography>
                {data?.total > 0 && (
                  <Box sx={{
                    px: 1.2, py: 0.3, borderRadius: '20px', flexShrink: 0,
                    bgcolor: alpha(ORANGE, 0.1), border: `1px solid ${alpha(ORANGE, 0.25)}`,
                  }}>
                    <Typography fontSize={12} fontWeight={700} color={ORANGE} noWrap>
                      {data.total.toLocaleString()} résultats
                    </Typography>
                  </Box>
                )}
                {(fs.dept || fs.proximity) && (fs.dept || userDept) && (
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 0.4,
                    px: 1.2, py: 0.3, borderRadius: '20px',
                    bgcolor: '#ECFDF5', border: '1px solid #A7F3D0',
                  }}>
                    <FmdGood sx={{ fontSize: 13, color: '#059669' }} />
                    <Typography fontSize={12} fontWeight={700} color="#059669">{fs.dept || userCity || userDept}</Typography>
                  </Box>
                )}
                {searchParams.get('q') && (
                  <Typography fontSize={13} color="#6B7280">
                    pour &laquo; {searchParams.get('q')} &raquo;
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Sort + mobile filter */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
              {isMobile && (
                <Button
                  variant="outlined" startIcon={<FilterList />}
                  onClick={() => setMobileFilter(true)} size="small"
                  sx={{
                    borderRadius: '20px', fontSize: 12, fontWeight: 700, px: 1.5,
                    borderColor: activeCount > 0 ? ORANGE : 'rgba(0,0,0,0.18)',
                    color: activeCount > 0 ? ORANGE : '#374151',
                    bgcolor: activeCount > 0 ? alpha(ORANGE, 0.06) : 'transparent',
                  }}>
                  Filtres{activeCount > 0 ? ` (${activeCount})` : ''}
                </Button>
              )}
              <FormControl size="small" sx={{ minWidth: 155 }}>
                <InputLabel sx={{ fontSize: 12.5 }}>Trier par</InputLabel>
                <Select value={sort} label="Trier par"
                  onChange={e => { setSort(e.target.value); setPage(1); }}
                  sx={{ borderRadius: '20px', bgcolor: '#FAFAFA', fontSize: 13 }}>
                  <MenuItem value="latest">Plus récents</MenuItem>
                  <MenuItem value="popular">Populaires</MenuItem>
                  <MenuItem value="price_asc">Prix croissant</MenuItem>
                  <MenuItem value="price_desc">Prix décroissant</MenuItem>
                  <MenuItem value="rating">Mieux notés</MenuItem>
                  <MenuItem value="discount">Meilleures promos</MenuItem>
                  <MenuItem value="views">Les plus vus</MenuItem>
                  <MenuItem value="newest">Nouveautés</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* ── Horizontal category chips ── */}
          <Box sx={{
            display: 'flex', gap: 1, overflowX: 'auto', pb: 1.5,
            scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
            borderTop: '1px solid #F3F4F6', pt: 1.5,
          }}>
            <Box onClick={() => { setFs(f => ({ ...f, category: '' })); setPage(1); }}
              sx={{
                flexShrink: 0, px: 1.8, py: 0.55, borderRadius: '20px', cursor: 'pointer',
                border: `1.5px solid ${!fs.category ? ORANGE : '#E5E7EB'}`,
                bgcolor: !fs.category ? ORANGE : 'white',
                color: !fs.category ? 'white' : '#374151',
                fontWeight: 700, fontSize: 13, transition: 'all 0.18s',
                '&:hover': { borderColor: ORANGE, color: !fs.category ? 'white' : ORANGE },
              }}>
              Tous
            </Box>
            {catList.map(c => {
              const active = fs.category === c.slug;
              return (
                <Box key={c.id || c.slug}
                  onClick={() => { setFs(f => ({ ...f, category: active ? '' : c.slug })); setPage(1); }}
                  sx={{
                    flexShrink: 0, px: 1.8, py: 0.55, borderRadius: '20px', cursor: 'pointer',
                    border: `1.5px solid ${active ? ORANGE : '#E5E7EB'}`,
                    bgcolor: active ? ORANGE : 'white',
                    color: active ? 'white' : '#374151',
                    fontWeight: active ? 700 : 500, fontSize: 13, transition: 'all 0.18s',
                    '&:hover': { borderColor: ORANGE, color: active ? 'white' : ORANGE },
                  }}>
                  {c.name}
                </Box>
              );
            })}
          </Box>

          {/* ── Active filter chips ── */}
          {activeFilterChips.length > 0 && (
            <Box sx={{
              display: 'flex', gap: 0.8, flexWrap: 'wrap',
              borderTop: '1px solid #F3F4F6', pt: 1, pb: 1.5,
            }}>
              {activeFilterChips.map((chip, i) => (
                <Chip
                  key={i} label={chip.label} size="small"
                  onDelete={chip.onDelete}
                  sx={{
                    fontSize: 12, fontWeight: 600, borderRadius: '20px',
                    bgcolor: '#F3F4F6', color: '#374151',
                    '& .MuiChip-deleteIcon': { color: '#64748B', '&:hover': { color: '#EF4444' } },
                  }}
                />
              ))}
              <Chip
                label="Tout effacer" size="small"
                onClick={() => { setFs(DEFAULT_FS); setPage(1); }}
                sx={{
                  fontSize: 12, fontWeight: 700, borderRadius: '20px',
                  bgcolor: '#FFF1F2', color: '#EF4444', cursor: 'pointer',
                  '&:hover': { bgcolor: '#FFE4E6' },
                }}
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* ── MAIN LAYOUT (sidebar + products) ── */}
      <Box sx={{
        display: 'flex', alignItems: 'flex-start', gap: 2,
        px: { xs: 1.5, md: 2.5 }, py: 2.5,
      }}>

        {/* Sticky sidebar */}
        {!isMobile && (
          <Box sx={{ flexShrink: 0, width: 260, position: 'sticky', top: 80 }}>
            <FilterPanel fs={fs} setFs={v => { setFs(v); setPage(1); }} />
          </Box>
        )}

        {/* Products area */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {isLoading ? (
            showSkel ? (
              <Box sx={{
                display: 'grid',
                gap: { xs: '10px', sm: '12px', md: '14px' },
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                  xl: 'repeat(5, 1fr)',
                },
              }}>
                {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </Box>
            ) : null
          ) : (data?.data || []).length === 0 ? (
            <Box sx={{
              textAlign: 'center', py: 12, bgcolor: 'white', borderRadius: 3,
              border: '1px solid #E8E8E8', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
            }}>
              <Typography fontSize={60} lineHeight={1} mb={2}>🔍</Typography>
              <Typography variant="h6" fontWeight={800} mb={0.8} color="#111827">
                Aucun produit trouvé
              </Typography>
              <Typography variant="body2" color="#6B7280" mb={3} sx={{ maxWidth: 340, mx: 'auto' }}>
                Aucun résultat pour ces critères. Essayez de modifier les filtres ou de changer de catégorie.
              </Typography>
              <Button
                variant="contained" onClick={() => { setFs(DEFAULT_FS); setPage(1); }}
                sx={{
                  bgcolor: ORANGE, color: 'white', fontWeight: 700, borderRadius: '20px',
                  px: 3, textTransform: 'none', '&:hover': { bgcolor: '#E68900' },
                }}>
                Réinitialiser les filtres
              </Button>
            </Box>
          ) : (
            <>
              <Box sx={{
                display: 'grid',
                gap: { xs: '10px', sm: '12px', md: '14px' },
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                  xl: 'repeat(5, 1fr)',
                },
              }}>
                {(data?.data || []).map((p: any) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </Box>
              {data?.totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                  <Pagination count={data.totalPages} page={page}
                    onChange={(_, v) => { setPage(v); window.scrollTo(0, 0); }}
                    color="primary" shape="rounded"
                    sx={{ '& .MuiPaginationItem-root': { fontWeight: 700, borderRadius: 1.5 } }} />
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Mobile filter drawer */}
      <Drawer anchor="left" open={mobileFilter} onClose={() => setMobileFilter(false)}
        PaperProps={{ sx: { borderRadius: '0 20px 20px 0', maxWidth: 320, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <FilterPanel fs={fs} setFs={v => { setFs(v); setPage(1); }}
            onClose={() => setMobileFilter(false)} />
        </Box>
        {/* Apply button pinned at bottom */}
        <Box sx={{ p: 2, borderTop: '1px solid #F0F0F0', bgcolor: 'white', flexShrink: 0 }}>
          <Button fullWidth variant="contained" onClick={() => setMobileFilter(false)}
            sx={{ bgcolor: ORANGE, color: 'white', fontWeight: 800, fontSize: 14, borderRadius: '12px', py: 1.3,
              '&:hover': { bgcolor: '#E68900' }, textTransform: 'none', boxShadow: `0 4px 14px rgba(255,153,0,0.4)` }}>
            Voir les résultats{data?.total > 0 ? ` (${data.total.toLocaleString()})` : ''}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}
