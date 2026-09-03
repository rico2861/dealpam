import { Box, Typography, alpha } from '@mui/material';
import { VerifiedUser } from '@mui/icons-material';

const BG     = '#0B1120';
const ACCENT = '#6366F1';

/**
 * Écran neutre affiché pendant qu'un retour MonCash est en cours de
 * vérification et qu'on ne sait pas encore à quelle app appartient la
 * transaction (voir App.tsx HomeRedirect, MainLayout, ThankYouPage). Jamais
 * de marque DealPam ici — design volontairement générique/pro, utilisable
 * pour n'importe quel client (DealPam ou une app externe).
 */
export default function PaymentVerifyingScreen() {
  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      px: 2, position: 'relative', overflow: 'hidden',
      background: `radial-gradient(circle at 50% 0%, ${alpha(ACCENT, 0.16)} 0%, ${BG} 55%)`,
      color: '#fff',
    }}>
      {/* Grille subtile en fond, purement décorative */}
      <Box sx={{
        position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${alpha('#fff', 0.04)} 1px, transparent 1px), linear-gradient(90deg, ${alpha('#fff', 0.04)} 1px, transparent 1px)`,
        backgroundSize: '44px 44px',
        maskImage: 'radial-gradient(ellipse at 50% 30%, black 0%, transparent 70%)',
      }} />

      <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380, width: '100%' }}>
        <Box sx={{
          width: 84, height: 84, borderRadius: '24px', mx: 'auto', mb: 3.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          <Box sx={{
            position: 'absolute', inset: 0, borderRadius: '24px',
            border: `2px solid ${alpha(ACCENT, 0.35)}`,
            animation: 'pv-ring 1.8s ease-in-out infinite',
            '@keyframes pv-ring': {
              '0%,100%': { transform: 'scale(1)', opacity: 0.7 },
              '50%':      { transform: 'scale(1.14)', opacity: 0.15 },
            },
          }} />
          <Box sx={{
            width: 60, height: 60, borderRadius: '18px',
            background: `linear-gradient(135deg, ${alpha(ACCENT, 0.35)}, ${alpha(ACCENT, 0.12)})`,
            border: `1px solid ${alpha(ACCENT, 0.45)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 28px ${alpha(ACCENT, 0.35)}`,
          }}>
            <VerifiedUser sx={{ fontSize: 28, color: '#A5B4FC' }} />
          </Box>
        </Box>

        <Typography sx={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px', mb: 1.2 }}>
          Vérification du paiement
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: alpha('#fff', 0.55), lineHeight: 1.7, mb: 3.5 }}>
          Un instant — nous confirmons votre transaction en toute sécurité.
        </Typography>

        {/* Barre de progression indéterminée, sobre */}
        <Box sx={{ width: '100%', height: 3, borderRadius: 2, bgcolor: alpha('#fff', 0.08), overflow: 'hidden' }}>
          <Box sx={{
            height: '100%', width: '40%', borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
            animation: 'pv-slide 1.4s ease-in-out infinite',
            '@keyframes pv-slide': {
              '0%':   { transform: 'translateX(-120%)' },
              '100%': { transform: 'translateX(340%)' },
            },
          }} />
        </Box>

        <Typography sx={{ fontSize: 11.5, color: alpha('#fff', 0.35), mt: 3, letterSpacing: '0.3px' }}>
          Merci de ne pas fermer cette page
        </Typography>
      </Box>
    </Box>
  );
}
