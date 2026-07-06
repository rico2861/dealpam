import { Link } from 'react-router-dom';
import { Box, Typography, Button, alpha } from '@mui/material';
import { HomeOutlined, ArrowBack, SearchOutlined } from '@mui/icons-material';

const ORANGE = '#FF6B00';

export default function NotFoundPage() {
  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(145deg, #F7F8FA 0%, #F1F5F9 60%, #F7F8FA 100%)',
      position: 'relative', overflow: 'hidden', px: 3,
    }}>
      {/* Background glows */}
      <Box sx={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', top: '-20%', left: '-15%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${alpha(ORANGE, 0.06)} 0%, transparent 60%)` }} />
      <Box sx={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', bottom: '-15%', right: '-10%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 60%)' }} />

      <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 520 }}>

        {/* 404 number */}
        <Box sx={{ position: 'relative', mb: 2 }}>
          <Typography sx={{
            fontSize: { xs: 120, sm: 160, md: 200 },
            fontWeight: 900, lineHeight: 1,
            background: `linear-gradient(135deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.03) 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-8px',
            userSelect: 'none',
            filter: 'drop-shadow(0 0 60px rgba(255,107,0,0.08))',
          }}>
            404
          </Typography>
          {/* Orange underline accent */}
          <Box sx={{
            position: 'absolute', bottom: { xs: 12, md: 20 }, left: '50%', transform: 'translateX(-50%)',
            width: { xs: 80, md: 120 }, height: 3, borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)`,
          }} />
        </Box>

        {/* Icon */}
        <Box sx={{
          width: 72, height: 72, borderRadius: '20px', mx: 'auto', mb: 3.5,
          background: `linear-gradient(135deg, ${alpha(ORANGE, 0.18)}, ${alpha(ORANGE, 0.06)})`,
          border: `1.5px solid ${alpha(ORANGE, 0.22)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 32px ${alpha(ORANGE, 0.15)}`,
          animation: 'float 3s ease-in-out infinite',
          '@keyframes float': {
            '0%,100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-8px)' },
          },
        }}>
          <SearchOutlined sx={{ fontSize: 34, color: ORANGE }} />
        </Box>

        <Typography sx={{ fontWeight: 900, fontSize: { xs: 22, sm: 28 }, color: '#0F172A', letterSpacing: '-0.5px', mb: 1.2 }}>
          Cette page n'existe pas
        </Typography>
        <Typography sx={{ fontSize: { xs: 14, sm: 15 }, color: '#94A3B8', lineHeight: 1.8, mb: 4.5, maxWidth: 380, mx: 'auto' }}>
          L'adresse que vous avez saisie est introuvable. Elle a peut-être été déplacée ou supprimée.
        </Typography>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            component={Link} to="/"
            variant="contained"
            startIcon={<HomeOutlined sx={{ fontSize: 18 }} />}
            sx={{
              background: `linear-gradient(135deg, ${ORANGE}, #e05e00)`,
              color: 'white', fontWeight: 800, fontSize: 14.5,
              borderRadius: '14px', textTransform: 'none', px: 3.5, py: 1.3,
              boxShadow: `0 8px 24px ${alpha(ORANGE, 0.38)}`,
              '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 12px 32px ${alpha(ORANGE, 0.5)}` },
              transition: 'all 0.22s',
            }}>
            Retour à l'accueil
          </Button>
          <Button
            onClick={() => window.history.back()}
            startIcon={<ArrowBack sx={{ fontSize: 17 }} />}
            sx={{
              color: '#475569', fontWeight: 700, fontSize: 14,
              borderRadius: '14px', textTransform: 'none', px: 3, py: 1.3,
              border: '1.5px solid rgba(15,23,42,0.1)',
              bgcolor: '#FFFFFF',
              '&:hover': { bgcolor: '#F1F5F9', color: '#0F172A', borderColor: 'rgba(15,23,42,0.18)' },
              transition: 'all 0.2s',
            }}>
            Page précédente
          </Button>
        </Box>

        {/* Bottom hint */}
        <Typography sx={{ mt: 5, fontSize: 12, color: '#94A3B8' }}>
          Vous cherchez quelque chose ?{' '}
          <Box component={Link} to="/products" sx={{ color: alpha(ORANGE, 0.7), textDecoration: 'none', fontWeight: 600,
            '&:hover': { color: ORANGE } }}>
            Explorer les produits →
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}
