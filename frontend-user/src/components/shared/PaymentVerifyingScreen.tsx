import { Box, Typography, alpha } from '@mui/material';
import { VerifiedUser, LockOutlined, CheckCircleRounded } from '@mui/icons-material';

const BG     = '#0A0E1A';
const CARD   = 'rgba(255,255,255,0.045)';
const BORD   = 'rgba(255,255,255,0.09)';
const ACCENT = '#6366F1';
const ACCENT_SOFT = '#A5B4FC';

const STEPS = [
  'Connexion sécurisée établie',
  'Vérification auprès du fournisseur de paiement',
  'Confirmation de votre transaction',
];

/**
 * Écran neutre affiché pendant qu'un retour MonCash est en cours de
 * vérification et qu'on ne sait pas encore à quelle app appartient la
 * transaction (voir App.tsx HomeRedirect, MainLayout, ThankYouPage). Jamais
 * de marque DealPam ici — design volontairement générique/pro, utilisable
 * pour n'importe quel client (DealPam ou une app externe).
 *
 * Les 3 étapes ci-dessous ne reflètent pas une vraie progression mesurée
 * (le backend répond en un seul appel, pas en flux) — elles s'animent sur
 * une base de temps fixe pour donner un repère visuel pendant l'attente,
 * ce qui réduit la latence perçue sur un appel réseau qui peut prendre
 * plusieurs secondes (compte à froid, aller-retour vers une app externe).
 */
export default function PaymentVerifyingScreen() {
  return (
    <Box sx={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      px: { xs: 2.5, sm: 3 }, py: 4, position: 'relative', overflow: 'hidden',
      background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${alpha(ACCENT, 0.22)} 0%, transparent 60%), ${BG}`,
      color: '#fff',
    }}>
      {/* Grille subtile en fond, purement décorative */}
      <Box sx={{
        position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${alpha('#fff', 0.04)} 1px, transparent 1px), linear-gradient(90deg, ${alpha('#fff', 0.04)} 1px, transparent 1px)`,
        backgroundSize: { xs: '32px 32px', sm: '44px 44px' },
        maskImage: 'radial-gradient(ellipse at 50% 20%, black 0%, transparent 70%)',
      }} />

      <Box sx={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 400,
        bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: { xs: '20px', sm: '24px' },
        backdropFilter: 'blur(20px)', px: { xs: 3, sm: 4 }, py: { xs: 4, sm: 4.5 },
        boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
      }}>
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          <Box sx={{
            width: { xs: 68, sm: 76 }, height: { xs: 68, sm: 76 }, borderRadius: '20px', mx: 'auto', mb: 2.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            <Box sx={{
              position: 'absolute', inset: 0, borderRadius: '20px',
              border: `2px solid ${alpha(ACCENT, 0.35)}`,
              animation: 'pv-ring 1.8s ease-in-out infinite',
              '@keyframes pv-ring': {
                '0%,100%': { transform: 'scale(1)', opacity: 0.7 },
                '50%':      { transform: 'scale(1.16)', opacity: 0.1 },
              },
            }} />
            <Box sx={{
              width: '100%', height: '100%', borderRadius: '20px',
              background: `linear-gradient(135deg, ${alpha(ACCENT, 0.4)}, ${alpha(ACCENT, 0.14)})`,
              border: `1px solid ${alpha(ACCENT, 0.5)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 10px 30px ${alpha(ACCENT, 0.4)}`,
            }}>
              <VerifiedUser sx={{ fontSize: { xs: 26, sm: 30 }, color: ACCENT_SOFT }} />
            </Box>
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: { xs: 17, sm: 19 }, letterSpacing: '-0.3px', mb: 1 }}>
            Vérification du paiement
          </Typography>
          <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, color: alpha('#fff', 0.55), lineHeight: 1.6 }}>
            Un instant — nous confirmons votre transaction en toute sécurité.
          </Typography>
        </Box>

        {/* Étapes — repère visuel de progression pendant l'attente */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4, mb: 3 }}>
          {STEPS.map((label, i) => (
            <Box key={label} sx={{
              display: 'flex', alignItems: 'center', gap: 1.4,
              opacity: 0,
              animation: `pv-step-in 0.4s ease-out forwards`,
              animationDelay: `${i * 0.9}s`,
              '@keyframes pv-step-in': {
                to: { opacity: 1 },
              },
            }}>
              <Box sx={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha('#10B981', 0.16), border: `1px solid ${alpha('#10B981', 0.4)}`,
              }}>
                <CheckCircleRounded sx={{ fontSize: 13, color: '#34D399' }} />
              </Box>
              <Typography sx={{ fontSize: 12.5, color: alpha('#fff', 0.75) }}>{label}</Typography>
            </Box>
          ))}
        </Box>

        {/* Barre de progression indéterminée, sobre */}
        <Box sx={{ width: '100%', height: 3, borderRadius: 2, bgcolor: alpha('#fff', 0.08), overflow: 'hidden', mb: 2.5 }}>
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

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8 }}>
          <LockOutlined sx={{ fontSize: 13, color: alpha('#fff', 0.35) }} />
          <Typography sx={{ fontSize: 11, color: alpha('#fff', 0.4), letterSpacing: '0.2px' }}>
            Connexion chiffrée — ne fermez pas cette page
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
