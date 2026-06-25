import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Grid, Typography, Box, Card, FormControl, InputLabel, Select, MenuItem,
  Button, Pagination, CircularProgress, Drawer, IconButton, Slider, Chip,
  useMediaQuery, useTheme, alpha, Collapse, Switch, Tooltip,
} from '@mui/material';
import {
  FilterList, Close, Star, ExpandMore, ExpandLess, Check,
  Verified, LocalShipping, FlashOn, Inventory, LocationOn,
  MyLocation, FmdGood,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

const ORANGE = '#FF9900';
const HAITI_DEPTS = [
  'Ouest', 'Nord', 'Nord-Est', 'Nord-Ouest', 'Artibonite',
  'Centre', 'Sud', 'Sud-Est', 'Grande-Anse', 'Nippes',
];

// ─── PREMIUM PRODUCT CARD ─────────────────────────────────────────────────────

function ProductCard({ p }: { p: any }) {
  const [hovered, setHovered] = useState(false);
  const isOnSale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const discount = isOnSale ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
  const img1 = p.images?.[0]?.urlMedium || p.images?.[0]?.urlFull;
  const img2 = p.images?.[1]?.urlMedium || p.images?.[1]?.urlFull || img1;
  const displayImg = hovered && img2 ? img2 : img1;

  return (
    <Card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column', position: 'relative',
        border: '1px solid #E8E8E8', boxShadow: 'none', borderRadius: 2,
        transition: 'all 0.22s',
        ...(hovered && { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', borderColor: ORANGE }),
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

      {/* Verified badge top-right — shows on hover */}
      {(p.store?.isVerified || hovered) && p.store?.isVerified && (
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
          <Box component="img"
            src={displayImg || 'https://placehold.co/400x300/F5F5F5/AAAAAA?text=Photo'}
            alt={p.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover',
              transition: 'opacity 0.3s, transform 0.4s',
              opacity: hovered ? 0.97 : 1,
              transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
        </Box>

        {/* Content */}
        <Box sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Store */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.4 }}>
            <Typography fontSize={10.5} color="#888" fontWeight={500} noWrap sx={{ flex: 1 }}>
              {p.store?.name}
            </Typography>
            {p.store?.isVerified && !hovered && (
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
              <Typography fontSize={10.5} color="#888">
                {p.avgRating?.toFixed(1)} ({(p.totalReviews || 0).toLocaleString()})
              </Typography>
            </Box>
          )}

          {/* Hover extra info */}
          {hovered && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.8, pt: 0.8, borderTop: '1px solid #F0F0F0' }}>
              {p.hasDelivery && (
                <Chip icon={<LocalShipping sx={{ fontSize: 11 }} />} label="Livraison" size="small"
                  sx={{ fontSize: 9.5, height: 20, bgcolor: '#ECFDF5', color: '#059669', fontWeight: 600 }} />
              )}
              {p.stock > 0 && (
                <Chip icon={<Inventory sx={{ fontSize: 11 }} />} label="En stock" size="small"
                  sx={{ fontSize: 9.5, height: 20, bgcolor: '#EFF6FF', color: '#3B82F6', fontWeight: 600 }} />
              )}
              {isOnSale && (
                <Chip icon={<FlashOn sx={{ fontSize: 11 }} />} label={`-${discount}%`} size="small"
                  sx={{ fontSize: 9.5, height: 20, bgcolor: '#FFF1F2', color: '#CC0C39', fontWeight: 700 }} />
              )}
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
  const city = localStorage.getItem('dealpam_city') || '';

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
          {fs.proximity && city && <Chip label={`📍 ${city}`} size="small" onDelete={() => setFs({ ...fs, proximity: false })}
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
      {city && (
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
                <Typography fontSize={10.5} color="#888">{city}</Typography>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [fs, setFs] = useState<FilterState>({
    ...DEFAULT_FS,
    category: searchParams.get('category') || '',
    dept: searchParams.get('department') || localStorage.getItem('dealpam_city') || '',
    onSale: searchParams.get('sponsored') === 'true',
  });
  const [sort, setSort] = useState(searchParams.get('sort') || 'latest');
  const [page, setPage] = useState(1);
  const [mobileFilter, setMobileFilter] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Sync searchParams → fs on first load
  useEffect(() => {
    const cat = searchParams.get('category') || '';
    const dept = searchParams.get('department') || '';
    if (cat !== fs.category || dept !== fs.dept) setFs(f => ({ ...f, category: cat, dept }));
  }, []);

  const params: any = {
    sort, page, limit: 24,
    ...(fs.category && { category: fs.category }),
    ...(fs.priceRange[0] > 0 && { minPrice: fs.priceRange[0] }),
    ...(fs.priceRange[1] < 50000 && { maxPrice: fs.priceRange[1] }),
    ...(fs.minRating > 0 && { minRating: fs.minRating }),
    ...(fs.verified && { verified: 'true' }),
    ...(fs.delivery && { inStock: 'true' }),  // reuse inStock for now
    ...(fs.inStock && { inStock: 'true' }),
    ...(fs.onSale && { sponsored: 'true' }),
    ...((fs.proximity || fs.dept) && { department: fs.dept || localStorage.getItem('dealpam_city') || '' }),
  };
  // Remove empty
  Object.keys(params).forEach(k => params[k] === '' && delete params[k]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn: () => api.get('/products', { params }).then(r => r.data).catch(() => ({ data: [], total: 0, totalPages: 0 })),
  });

  const activeCount = [
    fs.category, fs.priceRange[0] > 0 || fs.priceRange[1] < 50000,
    fs.minRating > 0, fs.verified, fs.delivery, fs.inStock, fs.onSale,
    fs.dept || fs.proximity,
  ].filter(Boolean).length;

  const city = localStorage.getItem('dealpam_city') || '';

  return (
    <Box sx={{ bgcolor: '#F1F5F9', minHeight: '100vh' }}>
      {/* Full width — no Container wrapper at root level */}
      <Box sx={{ maxWidth: '100%', px: { xs: 1.5, md: 2.5 }, py: { xs: 1.5, md: 2.5 } }}>

        {/* ── TOP BAR ── */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: '-0.5px', fontSize: { xs: 18, md: 22 } }}>
              Produits
              {fs.category && (
                <Typography component="span" variant="h5" color="primary.main" fontWeight={900}
                  sx={{ fontSize: 'inherit' }}> · {fs.category}</Typography>
              )}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {data?.total > 0 && (
                <Typography fontSize={12} color="#666">
                  {data.total.toLocaleString()} résultats
                </Typography>
              )}
              {(fs.dept || fs.proximity) && city && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <FmdGood sx={{ fontSize: 13, color: '#059669' }} />
                  <Typography fontSize={12} color="#059669" fontWeight={600}>{city}</Typography>
                </Box>
              )}
              {searchParams.get('q') && (
                <Typography fontSize={12} color="#888">pour « {searchParams.get('q')} »</Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {isMobile && (
              <Button variant="outlined" startIcon={<FilterList />} onClick={() => setMobileFilter(true)}
                size="small" sx={{ borderRadius: 2, fontSize: 12, fontWeight: 600,
                  borderColor: activeCount > 0 ? ORANGE : 'rgba(0,0,0,0.15)',
                  color: activeCount > 0 ? ORANGE : 'text.primary' }}>
                Filtres{activeCount > 0 ? ` (${activeCount})` : ''}
              </Button>
            )}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel sx={{ fontSize: 12.5 }}>Trier par</InputLabel>
              <Select value={sort} label="Trier par"
                onChange={e => { setSort(e.target.value); setPage(1); }}
                sx={{ borderRadius: 2, bgcolor: 'white', fontSize: 13 }}>
                <MenuItem value="latest">Plus récents</MenuItem>
                <MenuItem value="popular">Populaires</MenuItem>
                <MenuItem value="price_asc">Prix croissant</MenuItem>
                <MenuItem value="price_desc">Prix décroissant</MenuItem>
                <MenuItem value="rating">Mieux notés</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* ── LAYOUT ── */}
        <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>

          {/* Sidebar — always visible on desktop */}
          {!isMobile && (
            <Grid item md={2.8} lg={2.4} xl={2}>
              <Box sx={{ position: 'sticky', top: 80 }}>
                <FilterPanel fs={fs} setFs={v => { setFs(v); setPage(1); }} />
              </Box>
            </Grid>
          )}

          {/* Products grid */}
          <Grid item xs={12} md={9.2} lg={9.6} xl={10}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress sx={{ color: ORANGE }} />
              </Box>
            ) : (data?.data || []).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'white', borderRadius: 2,
                border: '1px solid #E8E8E8' }}>
                <Typography variant="h6" fontWeight={700} mb={1} color="#333">Aucun produit trouvé</Typography>
                <Typography variant="body2" color="#888" mb={2}>Essayez d'autres filtres ou une autre zone.</Typography>
                <Button variant="outlined" onClick={() => { setFs(DEFAULT_FS); setPage(1); }}
                  sx={{ borderColor: ORANGE, color: ORANGE, borderRadius: 2 }}>
                  Réinitialiser les filtres
                </Button>
              </Box>
            ) : (
              <>
                <Grid container spacing={{ xs: 1.2, sm: 1.5, md: 2 }}>
                  {(data?.data || []).map((p: any) => (
                    <Grid item xs={6} sm={4} md={4} lg={3} xl={2.4} key={p.id}>
                      <ProductCard p={p} />
                    </Grid>
                  ))}
                </Grid>
                {data?.totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Pagination count={data.totalPages} page={page}
                      onChange={(_, v) => { setPage(v); window.scrollTo(0, 0); }}
                      color="primary" shape="rounded"
                      sx={{ '& .MuiPaginationItem-root': { fontWeight: 600, borderRadius: 1.5 } }} />
                  </Box>
                )}
              </>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Mobile filter drawer */}
      <Drawer anchor="left" open={mobileFilter} onClose={() => setMobileFilter(false)}
        PaperProps={{ sx: { borderRadius: '0 16px 16px 0', maxWidth: 310 } }}>
        <FilterPanel fs={fs} setFs={v => { setFs(v); setPage(1); }}
          onClose={() => setMobileFilter(false)} />
      </Drawer>
    </Box>
  );
}
