import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Badge } from '@mui/material';
import {
  HomeRounded, SearchRounded, FavoriteRounded,
  ChatBubbleRounded, PersonRounded,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/auth.store';
import { useWishlistCount } from '../../hooks/useNotifications';

const ORANGE = '#FF6B00';
const BG     = '#0F172A';

export default function MobileBottomNav() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { user }      = useAuthStore();
  const wishlistCount = useWishlistCount();
  const hasToken      = !!localStorage.getItem('accessToken');

  const role = user?.role;

  // Resolve destination per tab
  const profileDest  = !user ? '/login'
    : role === 'SELLER' ? '/seller'
    : (role === 'ADMIN' || role === 'SUPER_ADMIN') ? '/admin'
    : '/account/profile';

  const messagesDest = !hasToken ? '/login?next=/account/messages'
    : role === 'SELLER' ? '/seller/chat'
    : '/account/messages';

  const favorisDest  = user && hasToken ? '/account/wishlist' : '/login?next=/account/wishlist';

  const TABS = [
    { label: 'Accueil',  icon: HomeRounded,      dest: '/home' },
    { label: 'Chercher', icon: SearchRounded,     dest: '/search' },
    { label: 'Favoris',  icon: FavoriteRounded,   dest: favorisDest },
    { label: 'Messages', icon: ChatBubbleRounded,  dest: messagesDest },
    { label: 'Profil',   icon: PersonRounded,      dest: profileDest },
  ];

  const activePath = (dest: string) => {
    const base = dest.split('?')[0];
    if (base === '/') return location.pathname === '/';
    return location.pathname.startsWith(base);
  };

  return (
    <Box sx={{
      display: { xs: 'flex', md: 'none' },
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1300,
      bgcolor: BG,
      borderTop: '1.5px solid rgba(255,255,255,0.07)',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.45)',
      minHeight: 56,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      alignItems: 'stretch',
      transform: 'translateZ(0)',
      willChange: 'transform',
    }}>
      {TABS.map(({ label, icon: Icon, dest }) => {
        const active = activePath(dest);
        const showBadge = label === 'Favoris' && wishlistCount > 0 && user && hasToken;

        return (
          <Box
            key={label}
            onClick={() => navigate(dest)}
            sx={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 0.4,
              cursor: 'pointer',
              minHeight: 60,
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              '&:active': { opacity: 0.55 },
            }}
          >
            {/* Active top bar */}
            {active && (
              <Box sx={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 32, height: 3,
                bgcolor: ORANGE,
                borderRadius: '0 0 6px 6px',
              }} />
            )}

            {/* Icon bubble */}
            <Box sx={{
              width: 42, height: 32,
              borderRadius: 2.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: active ? `${ORANGE}22` : 'transparent',
              transition: 'background 0.18s',
            }}>
              <Badge
                badgeContent={showBadge ? wishlistCount : 0}
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#EF4444', color: 'white',
                    fontSize: 9, minWidth: 15, height: 15,
                    borderRadius: 8, border: `1.5px solid ${BG}`,
                    top: 2, right: 2,
                  },
                }}
              >
                <Icon sx={{
                  fontSize: 22,
                  color: active ? ORANGE : 'rgba(255,255,255,0.4)',
                  transition: 'color 0.18s',
                  filter: active ? `drop-shadow(0 0 5px ${ORANGE}99)` : 'none',
                }} />
              </Badge>
            </Box>

            <Typography sx={{
              fontSize: 9.5,
              fontWeight: active ? 700 : 400,
              color: active ? ORANGE : 'rgba(255,255,255,0.35)',
              lineHeight: 1,
              letterSpacing: 0.2,
              transition: 'all 0.18s',
            }}>
              {label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
