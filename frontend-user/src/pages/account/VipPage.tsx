import { useMemo, useState } from 'react';
import { Box, Typography, Chip, Button, CircularProgress, alpha, InputBase } from '@mui/material';
import { WorkspacePremium, Lock, CheckCircle, Search, ChecklistRtl, Speed, Diamond, Podcasts } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

// ─── Palette sombre, façon terminal de pronostics ────────────────────────────
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
const BLUE   = '#3B82F6';

const STATUS_LABEL: Record<string, string> = { WON: 'Gagné', LOST: 'Perdu', VOID: 'Annulé', PENDING: 'À venir' };
const STATUS_COLOR: Record<string, string> = { WON: GRN, LOST: RED, VOID: '#64748B', PENDING: BLUE };

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function dayLabel(d: Date, today: Date) {
  const diff = Math.round((new Date(d).setHours(0,0,0,0) - new Date(today).setHours(0,0,0,0)) / 86400000);
  const wd = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
  const dd = d.toLocaleDateString('fr-FR', { day: '2-digit' });
  return { label: `${wd} ${dd}`, isToday: diff === 0 };
}

export default function VipPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [payingWith, setPayingWith] = useState<'MONCASH' | 'CRYPTO' | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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
  const list = predictions || [];

  // Onglets de dates — les 7 prochains jours à partir d'aujourd'hui.
  const today = new Date();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() + i);
    return d;
  }), []); // eslint-disable-line

  const dayKey = (d: Date | string) => new Date(d).toDateString();
  const activeDayKey = selectedDay ?? dayKey(today);

  const filtered = list.filter((p: any) => {
    if (dayKey(p.matchDate) !== activeDayKey) return false;
    if (search && !`${p.homeTeam} ${p.awayTeam} ${p.competition}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Statistiques dérivées des pronostics déjà saisis (aucune donnée externe / live).
  const unlocked = list.filter((p: any) => !p.locked);
  const avgConfidence = unlocked.length ? Math.round(unlocked.reduce((s: number, p: any) => s + (p.confidence || 0), 0) / unlocked.length) : 0;
  const valueBets = unlocked.filter((p: any) => Number(p.odds) >= 2 && (p.confidence || 0) >= 60).length;

  const stats = [
    { icon: ChecklistRtl, color: OR, value: filtered.length, label: 'Pronostics du jour' },
    { icon: Speed, color: GRN, value: `${avgConfidence}%`, label: 'Confiance moyenne' },
    { icon: Diamond, color: BLUE, value: valueBets, label: 'Value bets détectés' },
    { icon: Podcasts, color: RED, value: 0, label: 'Matchs en direct' },
  ];

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', color: TXT }}>
      {/* Header */}
      <Box sx={{ px: { xs: 2, md: 4 }, py: 2.5, borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${OR}, #B84800)`, boxShadow: `0 4px 14px ${alpha(OR, 0.4)}` }}>
            <WorkspacePremium sx={{ fontSize: 20, color: '#fff' }} />
          </Box>
          <Box>
            <Typography fontWeight={900} fontSize={{ xs: 18, md: 21 }} letterSpacing="-0.3px">Pronostics VIP</Typography>
            <Typography fontSize={12.5} color={SUB}>Analyses et probabilités DealPam pour chaque rencontre</Typography>
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
              {payingWith === 'MONCASH' ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Devenir Premium — MonCash'}
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

      <Box sx={{ px: { xs: 2, md: 4 }, py: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        {/* Cartes statistiques */}
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' } }}>
          {stats.map((s, i) => (
            <Box key={i} sx={{ bgcolor: PANEL, borderRadius: '12px', border: `1px solid ${BORDER}`, p: 2, display: 'flex', alignItems: 'center', gap: 1.4 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(s.color, 0.14) }}>
                <s.icon sx={{ fontSize: 19, color: s.color }} />
              </Box>
              <Box>
                <Typography fontWeight={900} fontSize={19}>{s.value}</Typography>
                <Typography fontSize={11.5} color={SUB}>{s.label}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Onglets de dates */}
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
          {days.map((d, i) => {
            const { label, isToday } = dayLabel(d, today);
            const active = dayKey(d) === activeDayKey;
            return (
              <Box key={i} onClick={() => setSelectedDay(dayKey(d))} sx={{
                cursor: 'pointer', flexShrink: 0, px: 2, py: 1, borderRadius: '10px', textAlign: 'center', minWidth: 76,
                bgcolor: active ? '#fff' : PANEL, border: `1px solid ${active ? '#fff' : BORDER}`,
                color: active ? '#0B0E17' : TXT, transition: 'all 0.15s',
              }}>
                <Typography fontWeight={800} fontSize={13}>{label}</Typography>
                {isToday && <Typography fontSize={9.5} sx={{ color: active ? OR : SUB, fontWeight: 800, letterSpacing: '0.03em' }}>AUJOURD'HUI</Typography>}
              </Box>
            );
          })}
        </Box>

        {/* Recherche */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: PANEL, border: `1px solid ${BORDER}`, borderRadius: '10px', px: 1.6, py: 1 }}>
          <Search sx={{ fontSize: 18, color: SUB }} />
          <InputBase placeholder="Équipe, ligue ou pays" value={search} onChange={e => setSearch(e.target.value)}
            sx={{ flex: 1, color: TXT, fontSize: 13.5, '& input::placeholder': { color: SUB, opacity: 1 } }} />
        </Box>

        {/* Table des pronostics */}
        <Box sx={{ bgcolor: PANEL, borderRadius: '14px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {loadingPredictions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={26} sx={{ color: OR }} /></Box>
          ) : !filtered.length ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography fontSize={14} color={SUB}>Aucun pronostic pour cette date.</Typography>
            </Box>
          ) : (
            (Object.entries(
              filtered.reduce((acc: Record<string, any[]>, p: any) => {
                (acc[p.competition] ||= []).push(p);
                return acc;
              }, {} as Record<string, any[]>)
            ) as [string, any[]][]).map(([competition, picks]) => (
              <Box key={competition}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, px: 2.2, py: 1.4, bgcolor: '#0F1420', borderBottom: `1px solid ${BORDER}` }}>
                  <Box sx={{ width: 22, height: 22, borderRadius: '6px', bgcolor: alpha(OR, 0.15), color: OR, fontSize: 10, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(competition).slice(0,2)}</Box>
                  <Typography fontWeight={800} fontSize={13.5}>{competition}</Typography>
                </Box>
                {picks.map((p: any, i: number) => (
                  <Box key={p.id} sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
                    px: 2.2, py: 1.6, bgcolor: i % 2 === 0 ? ROW : ROW_ALT,
                    borderBottom: `1px solid ${BORDER}`, '&:hover': { bgcolor: alpha(OR, 0.05) },
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, minWidth: 220 }}>
                      <Typography fontSize={12} color={SUB} sx={{ minWidth: 42 }}>{new Date(p.matchDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Typography>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                          <Box sx={{ width: 18, height: 18, borderRadius: '5px', bgcolor: alpha(BLUE, 0.18), color: BLUE, fontSize: 8.5, fontWeight: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(p.homeTeam)}</Box>
                          <Typography fontWeight={700} fontSize={13.5}>{p.homeTeam}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mt: 0.4 }}>
                          <Box sx={{ width: 18, height: 18, borderRadius: '5px', bgcolor: alpha(RED, 0.18), color: RED, fontSize: 8.5, fontWeight: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(p.awayTeam)}</Box>
                          <Typography fontWeight={700} fontSize={13.5}>{p.awayTeam}</Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Chip size="small" label={STATUS_LABEL[p.status] || p.status}
                      sx={{ bgcolor: alpha(STATUS_COLOR[p.status] || SUB, 0.14), color: STATUS_COLOR[p.status] || SUB, fontWeight: 700, fontSize: 11, height: 22 }} />

                    <Typography fontSize={12.5} color={SUB} sx={{ minWidth: 100, textAlign: 'center' }}>{p.locked ? '—' : p.market}</Typography>

                    {p.locked ? (
                      <Chip icon={<Lock sx={{ fontSize: 13, color: `${OR} !important` }} />} label="VIP"
                        sx={{ bgcolor: alpha(OR, 0.14), color: OR, fontWeight: 800, fontSize: 11.5, height: 24 }} />
                    ) : (
                      <Typography fontWeight={700} fontSize={13} color={TXT} sx={{ minWidth: 130, textAlign: 'center' }}>{p.pick}</Typography>
                    )}

                    <Box sx={{ minWidth: 56, textAlign: 'right' }}>
                      {p.locked ? (
                        <Box sx={{ width: 44, height: 26, borderRadius: '7px', bgcolor: alpha(TXT, 0.06), display: 'inline-block' }} />
                      ) : (
                        <Typography fontWeight={900} fontSize={14} color={OR}>{Number(p.odds).toFixed(2)}</Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}
