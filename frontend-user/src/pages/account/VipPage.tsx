import { useState } from 'react';
import { Box, Typography, Card, Chip, Button, CircularProgress, alpha } from '@mui/material';
import { WorkspacePremium, Lock, CheckCircle, TrendingUp } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const GRN  = '#10B981';

const STATUS_COLOR: Record<string, string> = { WON: GRN, LOST: '#EF4444', VOID: '#94A3B8', PENDING: OR };
const STATUS_LABEL: Record<string, string> = { WON: 'Gagné', LOST: 'Perdu', VOID: 'Annulé', PENDING: 'En attente' };

export default function VipPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [payingWith, setPayingWith] = useState<'MONCASH' | 'CRYPTO' | null>(null);

  const { data: vip, isLoading: loadingVip } = useQuery({
    queryKey: ['vip-status'],
    queryFn: () => api.get('/predictions/vip-status').then(r => r.data),
  });

  const { data: predictions, isLoading: loadingPredictions } = useQuery({
    queryKey: ['predictions'],
    queryFn: () => api.get('/predictions').then(r => r.data),
  });

  const subscribeMut = useMutation({
    mutationFn: (method: 'MONCASH' | 'CRYPTO') => api.post('/payments/vip/initiate', { method }).then(r => r.data),
    onSettled: () => setPayingWith(null),
    onSuccess: (data: any) => {
      if (data?.redirect_url) window.location.href = data.redirect_url;
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const isActive = !!vip?.active;
  const endDate = vip?.endDate ? new Date(vip.endDate).toLocaleDateString('fr-FR') : null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: '13px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${OR}, #E05A00)`, boxShadow: `0 6px 18px ${alpha(OR, 0.35)}` }}>
          <WorkspacePremium sx={{ fontSize: 22, color: '#fff' }} />
        </Box>
        <Box>
          <Typography fontWeight={900} fontSize={{ xs: 20, md: 25 }} color={TXT} letterSpacing="-0.5px">Pronostics VIP</Typography>
          <Typography fontSize={13} color={SUB}>Les meilleurs pronostics football, sélectionnés par notre équipe</Typography>
        </Box>
      </Box>

      {/* VIP status card */}
      {!loadingVip && (
        <Card sx={{ mb: 3, p: 2.5, borderRadius: '16px', border: `1px solid ${BORD}` }}>
          {isActive ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <CheckCircle sx={{ color: GRN }} />
              <Typography fontSize={14} color={TXT}>
                Abonnement VIP <strong>actif</strong> jusqu'au <strong>{endDate}</strong>
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography fontSize={14} color={TXT} sx={{ mb: 1.5 }}>
                Abonnez-vous pour débloquer tous les pronostics VIP (cote, pari conseillé, niveau de confiance).
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  disabled={subscribeMut.isPending}
                  onClick={() => { setPayingWith('MONCASH'); subscribeMut.mutate('MONCASH'); }}
                  sx={{ bgcolor: OR, '&:hover': { bgcolor: '#E05A00' } }}
                >
                  {payingWith === 'MONCASH' ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Payer avec MonCash'}
                </Button>
                <Button
                  variant="outlined"
                  disabled={subscribeMut.isPending}
                  onClick={() => { setPayingWith('CRYPTO'); subscribeMut.mutate('CRYPTO'); }}
                >
                  {payingWith === 'CRYPTO' ? <CircularProgress size={18} /> : 'Payer en crypto'}
                </Button>
              </Box>
            </Box>
          )}
        </Card>
      )}

      {/* Predictions list */}
      <Typography fontWeight={800} fontSize={16} color={TXT} sx={{ mb: 1.5 }}>Derniers pronostics</Typography>

      {loadingPredictions ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} sx={{ color: OR }} /></Box>
      ) : !predictions?.length ? (
        <Card sx={{ p: 4, borderRadius: '16px', border: `1px solid ${BORD}`, textAlign: 'center' }}>
          <Typography fontSize={14} color={SUB}>Aucun pronostic publié pour le moment — revenez bientôt.</Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {predictions.map((p: any) => (
            <Card key={p.id} sx={{ p: 2, borderRadius: '14px', border: `1px solid ${BORD}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography fontSize={12} color={SUB}>{p.competition} — {new Date(p.matchDate).toLocaleString('fr-FR')}</Typography>
                  <Typography fontWeight={700} fontSize={15} color={TXT}>{p.homeTeam} vs {p.awayTeam}</Typography>
                </Box>
                <Chip size="small" label={STATUS_LABEL[p.status] || p.status}
                  sx={{ bgcolor: alpha(STATUS_COLOR[p.status] || OR, 0.12), color: STATUS_COLOR[p.status] || OR, fontWeight: 700 }} />
              </Box>

              {p.locked ? (
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: SUB }}>
                  <Lock sx={{ fontSize: 16 }} />
                  <Typography fontSize={13}>Réservé aux membres VIP</Typography>
                </Box>
              ) : (
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Typography fontSize={13.5} color={TXT}><strong>Pari :</strong> {p.pick}</Typography>
                  <Typography fontSize={13.5} color={TXT}><strong>Marché :</strong> {p.market}</Typography>
                  <Typography fontSize={13.5} color={TXT}><strong>Cote :</strong> {p.odds}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TrendingUp sx={{ fontSize: 15, color: GRN }} />
                    <Typography fontSize={13.5} color={GRN} fontWeight={700}>{p.confidence}% confiance</Typography>
                  </Box>
                  {p.note && <Typography fontSize={12.5} color={SUB} sx={{ width: '100%' }}>{p.note}</Typography>}
                </Box>
              )}
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
