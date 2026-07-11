import { useState, useCallback } from 'react';
import { IconButton, Typography, Box, alpha, Tooltip } from '@mui/material';
import { Favorite, FavoriteBorder } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { useEventTracker } from '../../hooks/useEventTracker';

interface Props {
  productId: string;
  productSlug?: string;
  initialLiked?: boolean;
  initialCount?: number;
  size?: 'small' | 'medium';
  showCount?: boolean;
  categorySlug?: string;
}

const ORANGE = '#FF6B00';
const RED    = '#EF4444';

export default function LikeButton({
  productId, productSlug, initialLiked = false, initialCount = 0,
  size = 'small', showCount = false, categorySlug,
}: Props) {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const track = useEventTracker();

  const [liked,  setLiked]  = useState(initialLiked);
  const [count,  setCount]  = useState(initialCount);
  const [anim,   setAnim]   = useState(false);
  const [busy,   setBusy]   = useState(false);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    if (busy) return;

    // Optimiste : on met à jour l'affichage TOUT DE SUITE (avant même que la
    // requête parte), et on ne fait la requête réseau qu'en arrière-plan. Avant
    // ce correctif, le cœur ne changeait qu'une fois la réponse serveur reçue —
    // ça donnait une impression de lenteur/lag à chaque clic. En cas d'échec
    // réseau, on annule juste le changement visuel.
    const wasLiked = liked;
    if (wasLiked) {
      setLiked(false);
      setCount(c => Math.max(0, c - 1));
    } else {
      setLiked(true);
      setCount(c => c + 1);
      setAnim(true);
      setTimeout(() => setAnim(false), 700);
    }
    setBusy(true);

    const request = wasLiked
      ? api.delete(`/wishlist/${productId}`)
      : api.post('/wishlist', { productId });

    request
      .then(() => {
        track({ eventType: wasLiked ? 'UNLIKE' : 'LIKE', productId, categorySlug });
        if (!wasLiked) enqueueSnackbar('Ajouté aux favoris', { variant: 'success', autoHideDuration: 2000 });
        qc.invalidateQueries({ queryKey: ['wishlist'] });
        qc.invalidateQueries({ queryKey: ['wishlist-count'] });
      })
      .catch(() => {
        // Rollback — l'action n'a pas pu être enregistrée côté serveur.
        setLiked(wasLiked);
        setCount(c => wasLiked ? c + 1 : Math.max(0, c - 1));
        enqueueSnackbar('Erreur', { variant: 'error', autoHideDuration: 1500 });
      })
      .finally(() => setBusy(false));
  }, [liked, busy, user, productId, navigate, track, categorySlug, enqueueSnackbar, qc]);

  const iconSx = {
    fontSize: size === 'small' ? 18 : 22,
    color: liked ? RED : '#64748B',
    transform: anim ? 'scale(1.5)' : 'scale(1)',
    transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.2s',
  };

  return (
    <Tooltip title={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'} arrow>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
        <IconButton
          size={size}
          onClick={toggle}
          sx={{
            p: size === 'small' ? 0.5 : 0.8,
            bgcolor: liked ? alpha(RED, 0.08) : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(4px)',
            border: `1px solid ${liked ? alpha(RED, 0.25) : 'rgba(0,0,0,0.08)'}`,
            '&:hover': {
              bgcolor: liked ? alpha(RED, 0.14) : alpha(RED, 0.06),
              borderColor: alpha(RED, 0.3),
            },
            transition: 'all 0.2s',
          }}
        >
          {liked
            ? <Favorite sx={iconSx} />
            : <FavoriteBorder sx={{ ...iconSx, color: '#64748B' }} />}
        </IconButton>
        {showCount && count > 0 && (
          <Typography fontSize={11} fontWeight={700} color="#64748B" sx={{ lineHeight: 1, minWidth: 14, textAlign: 'center' }}>
            {count > 999 ? '999+' : count}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}
