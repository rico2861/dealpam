import { Box, Container, Typography, alpha } from '@mui/material';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Checkroom, PhoneAndroid, Home as HomeIcon, LocalFlorist,
  Diamond, FitnessCenter, DirectionsCar, RestaurantMenu,
  WorkOutline, DirectionsRun, SportsEsports, MiscellaneousServices,
  Smartphone, ChairOutlined, MedicalServices, MenuBook,
  ArrowForward, LocalOffer,
} from '@mui/icons-material';
import api from '../../api/axios';

const ORANGE = '#FF6B00';
const BG     = '#0F172A';

interface CatMeta {
  icon: React.ElementType;
  color: string;
  darkBg: string;
  lightBg: string;
}

const CAT_META: Record<string, CatMeta> = {
  mode:         { icon: Checkroom,          color: '#EC4899', darkBg: '#2D1B2E', lightBg: '#FDF2F8' },
  electronique: { icon: PhoneAndroid,       color: '#60A5FA', darkBg: '#1B2440', lightBg: '#EFF6FF' },
  smartphones:  { icon: Smartphone,         color: '#34D399', darkBg: '#0E2D1E', lightBg: '#F0FDF4' },
  maison:       { icon: HomeIcon,           color: '#FBBF24', darkBg: '#2D2200', lightBg: '#FFFBEB' },
  beaute:       { icon: LocalFlorist,       color: '#C084FC', darkBg: '#231B3A', lightBg: '#FAF5FF' },
  bijoux:       { icon: Diamond,            color: '#F9A825', darkBg: '#2D2100', lightBg: '#FFFDE7' },
  sport:        { icon: FitnessCenter,      color: '#F87171', darkBg: '#2D1B1B', lightBg: '#FEF2F2' },
  vehicules:    { icon: DirectionsCar,      color: '#22D3EE', darkBg: '#0E2530', lightBg: '#ECFEFF' },
  alimentation: { icon: RestaurantMenu,     color: '#86EFAC', darkBg: '#0E2D1E', lightBg: '#F0FDF4' },
  alimentaire:  { icon: RestaurantMenu,     color: '#86EFAC', darkBg: '#0E2D1E', lightBg: '#F0FDF4' },
  sacs:         { icon: WorkOutline,        color: '#FB923C', darkBg: '#2D1800', lightBg: '#FFF7ED' },
  chaussures:   { icon: DirectionsRun,      color: '#2DD4BF', darkBg: '#0E2820', lightBg: '#F0FDFB' },
  jeux:         { icon: SportsEsports,      color: '#A78BFA', darkBg: '#1E1533', lightBg: '#F5F3FF' },
  jouets:       { icon: SportsEsports,      color: '#A78BFA', darkBg: '#1E1533', lightBg: '#F5F3FF' },
  services:     { icon: MiscellaneousServices, color: '#818CF8', darkBg: '#1A1B40', lightBg: '#EEF2FF' },
  meubles:      { icon: ChairOutlined,      color: '#D97706', darkBg: '#2D1E00', lightBg: '#FFFBEB' },
  sante:        { icon: MedicalServices,    color: '#34D399', darkBg: '#0E2D1E', lightBg: '#F0FDF4' },
  livres:       { icon: MenuBook,           color: '#818CF8', darkBg: '#1A1B40', lightBg: '#EEF2FF' },
};

const DEFAULT_META: CatMeta = {
  icon: LocalOffer, color: '#94A3B8', darkBg: '#1E293B', lightBg: '#F8FAFC',
};

interface CategoryItem { id?: string; slug: string; name: string; productCount?: number }

const FALLBACK_CATEGORIES: CategoryItem[] = [
  { slug: 'mode',         name: 'Mode & Vêtements' },
  { slug: 'electronique', name: 'Électronique' },
  { slug: 'smartphones',  name: 'Smartphones' },
  { slug: 'maison',       name: 'Maison & Déco' },
  { slug: 'beaute',       name: 'Beauté & Soin' },
  { slug: 'meubles',      name: 'Meubles' },
  { slug: 'chaussures',   name: 'Chaussures' },
  { slug: 'sacs',         name: 'Sacs & Bagages' },
  { slug: 'bijoux',       name: 'Bijoux' },
  { slug: 'sport',        name: 'Sport & Fitness' },
  { slug: 'alimentation', name: 'Alimentation' },
  { slug: 'vehicules',    name: 'Véhicules' },
  { slug: 'jeux',         name: 'Jeux & Loisirs' },
  { slug: 'services',     name: 'Services' },
];

function CategoryCard({ cat }: { cat: CategoryItem }) {
  const meta = CAT_META[cat.slug] ?? DEFAULT_META;
  const Icon = meta.icon;

  return (
    <Box
      component={Link}
      to={`/products?category=${cat.slug}`}
      sx={{
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        p: { xs: 2, sm: 2.5, md: 3 },
        borderRadius: '18px',
        bgcolor: 'white',
        border: `1px solid #E2E8F0`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'all 0.22s ease',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 32px ${alpha(meta.color, 0.18)}`,
          borderColor: alpha(meta.color, 0.4),
          '& .cat-icon-box': { bgcolor: meta.darkBg },
          '& .cat-icon': { color: meta.color },
          '& .cat-name': { color: meta.color },
          '& .cat-arrow': { opacity: 1, transform: 'translateX(3px)' },
        },
      }}
    >
      <Box
        className="cat-icon-box"
        sx={{
          width: { xs: 52, sm: 60, md: 68 },
          height: { xs: 52, sm: 60, md: 68 },
          borderRadius: '16px',
          bgcolor: meta.lightBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.22s',
          flexShrink: 0,
        }}
      >
        <Icon
          className="cat-icon"
          sx={{
            fontSize: { xs: 26, sm: 30, md: 34 },
            color: meta.color,
            transition: 'color 0.22s',
          }}
        />
      </Box>

      <Box sx={{ textAlign: 'center', width: '100%' }}>
        <Typography
          className="cat-name"
          fontWeight={700}
          fontSize={{ xs: 12, sm: 13, md: 14 }}
          color="#1E293B"
          lineHeight={1.3}
          sx={{ transition: 'color 0.22s' }}
        >
          {cat.name}
        </Typography>
        {cat.productCount != null && cat.productCount > 0 && (
          <Typography fontSize={{ xs: 10, sm: 11 }} color="#94A3B8" mt={0.4}>
            {cat.productCount.toLocaleString()} produits
          </Typography>
        )}
      </Box>

      <ArrowForward
        className="cat-arrow"
        sx={{
          fontSize: 14,
          color: meta.color,
          opacity: 0,
          transition: 'all 0.22s',
          mt: -0.5,
        }}
      />
    </Box>
  );
}

export default function CategoriesPage() {
  const { data: apiCategories } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data).catch(() => []),
  });

  const categories: CategoryItem[] =
    Array.isArray(apiCategories) && apiCategories.length > 0
      ? apiCategories
      : FALLBACK_CATEGORIES;

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pb: 8 }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: BG, pt: { xs: 4, md: 6 }, pb: { xs: 5, md: 8 } }}>
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: 540 }}>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 1.4, py: 0.5, borderRadius: '8px',
              bgcolor: alpha(ORANGE, 0.15), border: `1px solid ${alpha(ORANGE, 0.3)}`,
              mb: 2,
            }}>
              <LocalOffer sx={{ fontSize: 13, color: ORANGE }} />
              <Typography fontSize={11} fontWeight={700} color={ORANGE} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Marketplace
              </Typography>
            </Box>
            <Typography
              variant="h3"
              fontWeight={900}
              color="white"
              sx={{ fontSize: { xs: 26, md: 36 }, letterSpacing: '-0.5px', lineHeight: 1.1, mb: 1.5 }}
            >
              Toutes les catégories
            </Typography>
            <Typography fontSize={{ xs: 14, md: 15 }} color="rgba(255,255,255,0.5)" lineHeight={1.7}>
              Explorez nos {categories.length} catégories et trouvez exactement ce que vous cherchez parmi des milliers de produits haïtiens.
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: { xs: -3, md: -4 } }}>

        {/* ── Promo banner ──────────────────────────────────────────── */}
        <Box
          component={Link}
          to="/products?hasSale=true"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            textDecoration: 'none',
            borderRadius: '20px',
            px: { xs: 3, md: 4 },
            py: { xs: 2.5, md: 3.5 },
            mb: { xs: 3, md: 4 },
            background: `linear-gradient(135deg, ${ORANGE} 0%, #FF9500 60%, #FFBA00 100%)`,
            boxShadow: `0 8px 32px ${alpha(ORANGE, 0.4)}`,
            transition: 'all 0.22s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 16px 48px ${alpha(ORANGE, 0.5)}`,
              '& .promo-arrow': { transform: 'translateX(5px)' },
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box sx={{ width: { xs: 44, md: 52 }, height: { xs: 44, md: 52 }, borderRadius: '14px', bgcolor: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LocalOffer sx={{ fontSize: { xs: 22, md: 26 }, color: 'white' }} />
            </Box>
            <Box>
              <Typography fontWeight={900} fontSize={{ xs: 16, md: 20 }} color="white" lineHeight={1.2} mb={0.4}>
                Voir toutes les promotions
              </Typography>
              <Typography fontSize={{ xs: 12, md: 13.5 }} color="rgba(255,255,255,0.82)">
                Meilleures offres et réductions du moment
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexShrink: 0 }}>
            <Typography fontSize={{ xs: 13, md: 14 }} fontWeight={700} color="white" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Voir les offres
            </Typography>
            <ArrowForward className="promo-arrow" sx={{ fontSize: 20, color: 'white', transition: 'transform 0.22s' }} />
          </Box>
        </Box>

        {/* ── Section label ─────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Typography fontWeight={800} fontSize={{ xs: 15, md: 17 }} color="#0F172A">
            Parcourir par catégorie
          </Typography>
          <Typography fontSize={13} color="#94A3B8">
            {categories.length} catégories
          </Typography>
        </Box>

        {/* ── Grid ──────────────────────────────────────────────────── */}
        <Box sx={{
          display: 'grid',
          gap: { xs: '12px', sm: '14px', md: '16px' },
          gridTemplateColumns: {
            xs: 'repeat(3, 1fr)',
            sm: 'repeat(4, 1fr)',
            md: 'repeat(5, 1fr)',
            lg: 'repeat(7, 1fr)',
          },
        }}>
          {categories.map(cat => (
            <CategoryCard key={cat.id ?? cat.slug} cat={cat} />
          ))}
        </Box>

        {/* ── Bottom CTA ────────────────────────────────────────────── */}
        <Box sx={{
          mt: { xs: 4, md: 6 },
          p: { xs: 3, md: 4 },
          bgcolor: BG,
          borderRadius: '20px',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}>
          <Box>
            <Typography fontWeight={800} fontSize={{ xs: 16, md: 18 }} color="white" mb={0.5}>
              Vous êtes vendeur ?
            </Typography>
            <Typography fontSize={13.5} color="rgba(255,255,255,0.5)">
              Publiez vos produits et rejoignez des milliers de vendeurs sur DealPam.
            </Typography>
          </Box>
          <Box
            component={Link}
            to="/register?role=SELLER"
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 3, py: 1.4, borderRadius: '12px',
              bgcolor: ORANGE, color: 'white',
              textDecoration: 'none', fontWeight: 700, fontSize: 14,
              flexShrink: 0, whiteSpace: 'nowrap',
              transition: 'all 0.18s',
              '&:hover': { bgcolor: '#E05A00', transform: 'translateY(-1px)', boxShadow: `0 6px 20px ${alpha(ORANGE, 0.5)}` },
            }}
          >
            Vendre sur DealPam
            <ArrowForward sx={{ fontSize: 16 }} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
