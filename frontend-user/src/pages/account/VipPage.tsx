import { useState } from 'react';
import { Box, Typography, Chip, Button, CircularProgress, alpha } from '@mui/material';
import { WorkspacePremium, Lock, CheckCircle, Star, StarBorder } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

// ─── Palette sombre, façon "BetMines" ───────────────────────────────────────
const BG     = '#0B0E17';
const PANEL  = '#12151F';
const ROW    = '#171B27';
const ROW_ALT= '#12151F';
const BORDER = 'rgba(255,255,255,0.07)';
const TXT    = '#F1F5F9';
const SUB    = '#8B93A7';
const OR     = '#FF6B00';
const GRN    = '#22C55E';
const RED    = '#EF4444';

const STATUS_COLOR: Record<string, string> = { WON: GRN, LOST: RED, VOID: '#64748B', PENDING: OR };
const STATUS_LABEL: Record<string, string> = { WON: 'Gagné', LOST: 'Perdu', VOID: 'Annulé', PENDING: 'En cours' };

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
    onSuccess: (data: any) => { if (data?.redirect_url) window.location.href = data.redirect_url; },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const isActive = !!vip?.active;
  const endDate = vip?.endDate ? new Date(vip.endDate).toLocaleDateString('fr-FR') : null;

  const pending = (predictions || []).filter((p: any) => p.status === 'PENDING' || p.locked);
  const safePicks = pending.filter((p: any) => p.locked || (p.confidence ?? 0) >= 75);
  const riskyPicks = pending.filter((p: any) => !p.locked && (p.confidence ?? 0) < 75);

  const comboOdds = (list: any[]) => list.reduce((acc, p) => acc * (Number(p.odds) || 1), 1);

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', color: TXT }}>
      {/* Header bar */}
      <Box sx={{ px: { xs: 2, md: 4 }, py: 2.5, borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${OR}, #B84800)`, boxShadow: `0 4px 14px ${alpha(OR, 0.4)}` }}>
            <WorkspacePremium sx={{ fontSize: 20, color: '#fff' }} />
          </Box>
          <Box>
            <Typography fontWeight={900} fontSize={{ xs: 18, md: 21 }} letterSpacing="-0.3px">Pronostics VIP</Typography>
            <Typography fontSize={12.5} color={SUB}>Sélectionnés par l'équipe DealPam</Typography>
          </Box>
        </Box>

        {isActive ? (
          <Chip icon={<CheckCircle sx={{ fontSize: 16, color: `${GRN} !important` }} />}
            label={`VIP actif — jusqu'au ${endDate}`}
            sx={{ bgcolor: alpha(GRN, 0.12), color: GRN, fontWeight: 700, border: `1px solid ${alpha(GRN, 0.3)}`, px: 0.5 }} />
        ) : !loadingVip && (
          <Box sx={{ display: 'flex', gap: 1.2 }}>
            <Button
              variant="contained"
              disabled={subscribeMut.isPending}
              onClick={() => { setPayingWith('MONCASH'); subscribeMut.mutate('MONCASH'); }}
              sx={{ bgcolor: OR, fontWeight: 800, borderRadius: '10px', px: 2.2, '&:hover': { bgcolor: '#E05A00' } }}
            >
              {payingWith === 'MONCASH' ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Devenir VIP — MonCash'}
            </Button>
            <Button
              variant="outlined"
              disabled={subscribeMut.isPending}
              onClick={() => { setPayingWith('CRYPTO'); subscribeMut.mutate('CRYPTO'); }}
              sx={{ borderColor: BORDER, color: TXT, fontWeight: 700, borderRadius: '10px', '&:hover': { borderColor: OR, color: OR } }}
            >
              {payingWith === 'CRYPTO' ? <CircularProgress size={16} /> : 'Payer en crypto'}
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ px: { xs: 2, md: 4 }, py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* Combos style "Daily Bets" — Prudent / Risqué, dérivés des pronostics existants */}
        {isActive && (safePicks.length > 0 || riskyPicks.length > 0) && (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            {safePicks.length > 1 && <ComboCard title="Prudent" color={GRN} picks={safePicks} totalOdd={comboOdds(safePicks)} />}
            {riskyPicks.length > 1 && <ComboCard title="Risqué" color={RED} picks={riskyPicks} totalOdd={comboOdds(riskyPicks)} />}
          </Box>
        )}

        {/* Table des pronostics */}
        <Box sx={{ bgcolor: PANEL, borderRadius: '14px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${BORDER}` }}>
            <Typography fontWeight={800} fontSize={15}>Tous les pronostics</Typography>
          </Box>

          {loadingPredictions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={26} sx={{ color: OR }} /></Box>
          ) : !predictions?.length ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography fontSize={14} color={SUB}>Aucun pronostic publié pour le moment — revenez bientôt.</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <Box component="thead">
                  <Box component="tr" sx={{ '& th': { textAlign: 'left', fontSize: 12, color: SUB, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', px: 2, py: 1.2, borderBottom: `1px solid ${BORDER}` } }}>
                    <Box component="th">Match</Box>
                    <Box component="th">Marché</Box>
                    <Box component="th">BetMines</Box>
                    <Box component="th" sx={{ textAlign: 'right !important' }}>Cote</Box>
                    <Box component="th" sx={{ textAlign: 'right !important' }}>Confiance</Box>
                    <Box component="th" sx={{ textAlign: 'right !important' }}>Statut</Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {predictions.map((p: any, i: number) => (
                    <Box component="tr" key={p.id} sx={{
                      bgcolor: i % 2 === 0 ? ROW : ROW_ALT,
                      '&:hover': { bgcolor: alpha(OR, 0.05) },
                      '& td': { px: 2, py: 1.6, borderBottom: `1px solid ${BORDER}`, fontSize: 13.5 },
                    }}>
                      <Box component="td">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {p.locked ? <StarBorder sx={{ fontSize: 15, color: SUB }} /> : <Star sx={{ fontSize: 15, color: OR }} />}
                          <Box>
                            <Typography fontSize={12} color={SUB}>{p.competition}</Typography>
                            <Typography fontWeight={700} fontSize={13.5}>{p.homeTeam} - {p.awayTeam}</Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Box component="td" sx={{ color: SUB }}>{p.locked ? '—' : p.market}</Box>
                      <Box component="td">
                        {p.locked ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: SUB }}>
                            <Lock sx={{ fontSize: 14 }} />
                            <Typography fontSize={12.5}>VIP uniquement</Typography>
                          </Box>
                        ) : (
                          <Typography fontWeight={700} fontSize={13.5} color={TXT}>{p.pick}</Typography>
                        )}
                      </Box>
                      <Box component="td" sx={{ textAlign: 'right', fontWeight: 800, color: p.locked ? SUB : OR }}>
                        {p.locked ? <Lock sx={{ fontSize: 14 }} /> : Number(p.odds).toFixed(2)}
                      </Box>
                      <Box component="td" sx={{ textAlign: 'right' }}>
                        {p.locked ? <Lock sx={{ fontSize: 14, color: SUB }} /> : (
                          <Typography fontWeight={700} fontSize={13} color={GRN}>{p.confidence}%</Typography>
                        )}
                      </Box>
                      <Box component="td" sx={{ textAlign: 'right' }}>
                        <Chip size="small" label={STATUS_LABEL[p.status] || p.status}
                          sx={{ bgcolor: alpha(STATUS_COLOR[p.status] || SUB, 0.14), color: STATUS_COLOR[p.status] || SUB, fontWeight: 700, fontSize: 11.5, height: 22 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function ComboCard({ title, color, picks, totalOdd }: { title: string; color: string; picks: any[]; totalOdd: number }) {
  return (
    <Box sx={{ bgcolor: PANEL, borderRadius: '14px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
      <Box sx={{ px: 2.5, py: 1.6, textAlign: 'center', borderBottom: `1px solid ${BORDER}`, bgcolor: alpha(color, 0.08) }}>
        <Typography fontWeight={900} fontSize={15} color={color}>{title}</Typography>
      </Box>
      {picks.slice(0, 4).map((p: any, i: number) => (
        <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.2, py: 1.4,
          borderBottom: i < Math.min(picks.length, 4) - 1 ? `1px solid ${BORDER}` : 'none' }}>
          <Box>
            <Typography fontSize={11.5} color={SUB}>{p.competition}</Typography>
            <Typography fontWeight={700} fontSize={13}>{p.homeTeam} - {p.awayTeam}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            {p.locked ? <Lock sx={{ fontSize: 15, color: SUB }} /> : (
              <>
                <Typography fontSize={12} color={SUB}>{p.market}</Typography>
                <Typography fontWeight={800} fontSize={13.5} color={color}>{Number(p.odds).toFixed(2)}</Typography>
              </>
            )}
          </Box>
        </Box>
      ))}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2.2, py: 1.6, bgcolor: alpha(color, 0.06) }}>
        <Typography fontWeight={700} fontSize={13} color={SUB}>Cote totale</Typography>
        <Typography fontWeight={900} fontSize={16} color={color}>{totalOdd.toFixed(2)}</Typography>
      </Box>
    </Box>
  );
}
