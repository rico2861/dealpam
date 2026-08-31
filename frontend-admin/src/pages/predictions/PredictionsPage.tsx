import { useState } from 'react';
import {
  Box, Typography, Button, TextField, Chip,
  IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Tooltip, CircularProgress, alpha,
} from '@mui/material';
import { Add, Edit, Delete, SportsSoccer, Star } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

// ─── Palette sombre, façon "BetMines" — cohérente avec la page VIP client ───
const BG     = '#0B0E17';
const PANEL  = '#12151F';
const ROW    = '#171B27';
const ROW_ALT= '#12151F';
const BORDER = 'rgba(255,255,255,0.07)';
const TXT    = '#F1F5F9';
const SUB    = '#8B93A7';
const OR     = '#FF9900';
const GRN    = '#22C55E';
const RED    = '#EF4444';

interface Prediction {
  id: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  market: string;
  pick: string;
  odds: number;
  confidence: number;
  note: string | null;
  status: 'PENDING' | 'WON' | 'LOST' | 'VOID';
  createdBy?: { firstName: string; lastName: string };
}

const EMPTY: Partial<Prediction> = {
  competition: '', homeTeam: '', awayTeam: '', matchDate: '', market: '', pick: '',
  odds: 1.5, confidence: 70, note: '', status: 'PENDING',
};

const STATUS_LABEL: Record<string, string> = { PENDING: 'En cours', WON: 'Gagné', LOST: 'Perdu', VOID: 'Annulé' };
const STATUS_COLOR: Record<string, string> = { PENDING: OR, WON: GRN, LOST: RED, VOID: '#64748B' };

const darkFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: TXT, bgcolor: '#0F1420', borderRadius: '8px',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: alpha(OR, 0.5) },
    '&.Mui-focused fieldset': { borderColor: OR },
  },
  '& .MuiInputLabel-root': { color: SUB },
  '& .MuiInputLabel-root.Mui-focused': { color: OR },
  '& input, & select': { color: TXT },
};

function PredictionDialog({ prediction, open, onClose }: { prediction: Partial<Prediction> | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const isNew = !prediction?.id;
  const [form, setForm] = useState<any>({
    ...prediction,
    matchDate: prediction?.matchDate ? prediction.matchDate.slice(0, 16) : '',
  });

  const set  = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));
  const setN = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: Number(e.target.value) }));

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, matchDate: form.matchDate ? new Date(form.matchDate).toISOString() : undefined };
      return isNew
        ? api.post('/predictions', body).then(r => r.data)
        : api.patch(`/predictions/${prediction!.id}`, body).then(r => r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-predictions'] }); onClose(); },
    onError: (e: any) => alert(e?.response?.data?.message || 'Erreur'),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, bgcolor: PANEL, border: `1px solid ${BORDER}`, color: TXT } }}>
      <DialogTitle fontWeight={800}>{isNew ? 'Publier un pronostic' : 'Modifier le pronostic'}</DialogTitle>
      <DialogContent sx={{ pt: '16px !important', display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
        <TextField label="Compétition *" value={form.competition || ''} onChange={set('competition')} fullWidth size="small" sx={{ ...darkFieldSx, gridColumn: '1 / -1' }} placeholder="Ligue 1, Serie A..." />
        <TextField label="Équipe domicile *" value={form.homeTeam || ''} onChange={set('homeTeam')} fullWidth size="small" sx={darkFieldSx} />
        <TextField label="Équipe extérieur *" value={form.awayTeam || ''} onChange={set('awayTeam')} fullWidth size="small" sx={darkFieldSx} />
        <TextField label="Date du match *" type="datetime-local" value={form.matchDate || ''} onChange={set('matchDate')}
          fullWidth size="small" InputLabelProps={{ shrink: true }} sx={{ ...darkFieldSx, gridColumn: '1 / -1' }} />
        <TextField label="Marché *" value={form.market || ''} onChange={set('market')} fullWidth size="small" sx={darkFieldSx} placeholder="1X2, Over/Under 2.5..." />
        <TextField label="Cote *" type="number" value={form.odds ?? ''} onChange={setN('odds')} fullWidth size="small" inputProps={{ step: 0.01, min: 1 }} sx={darkFieldSx} />
        <TextField label="Pari conseillé *" value={form.pick || ''} onChange={set('pick')} fullWidth size="small" sx={{ ...darkFieldSx, gridColumn: '1 / -1' }} placeholder="Victoire Real Madrid" />
        <TextField label="Confiance (%)" type="number" value={form.confidence ?? ''} onChange={setN('confidence')} fullWidth size="small" inputProps={{ min: 0, max: 100 }} sx={darkFieldSx} />
        <TextField select label="Résultat" value={form.status || 'PENDING'} onChange={set('status')} fullWidth size="small" SelectProps={{ native: true }} sx={darkFieldSx}>
          <option value="PENDING">En cours</option>
          <option value="WON">Gagné</option>
          <option value="LOST">Perdu</option>
          <option value="VOID">Annulé</option>
        </TextField>
        <TextField label="Note (optionnel)" value={form.note || ''} onChange={set('note')} fullWidth size="small" multiline rows={2} sx={{ ...darkFieldSx, gridColumn: '1 / -1' }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, color: SUB }}>Annuler</Button>
        <Button variant="contained" onClick={() => save.mutate()}
          disabled={!form.competition || !form.homeTeam || !form.awayTeam || !form.matchDate || !form.market || !form.pick || save.isPending}
          startIcon={save.isPending ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ borderRadius: 2, bgcolor: OR, '&:hover': { bgcolor: '#e68900' }, fontWeight: 700 }}>
          {isNew ? 'Publier' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function PredictionsPage() {
  const qc = useQueryClient();
  const [dialogPrediction, setDialogPrediction] = useState<Partial<Prediction> | null>(null);

  const { data: predictions = [], isLoading } = useQuery<Prediction[]>({
    queryKey: ['admin-predictions'],
    queryFn:  () => api.get('/predictions/admin/all').then(r => r.data),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/predictions/${id}`).then(r => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-predictions'] }),
    onError: (e: any) => alert(e?.response?.data?.message || 'Erreur lors de la suppression'),
  });

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', color: TXT, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color={TXT}>Pronostics VIP</Typography>
          <Typography color={SUB} fontSize={14}>
            Pronostics football réservés aux clients avec un abonnement VIP actif.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogPrediction({ ...EMPTY })}
          sx={{ bgcolor: OR, '&:hover': { bgcolor: '#e68900' }, borderRadius: 2, fontWeight: 700 }}>
          Publier un pronostic
        </Button>
      </Box>

      <Box sx={{ bgcolor: PANEL, borderRadius: '14px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: OR }} />
          </Box>
        ) : predictions.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <SportsSoccer sx={{ fontSize: 56, color: alpha(TXT, 0.15), mb: 2 }} />
            <Typography color={SUB}>Aucun pronostic publié. Cliquez sur "Publier un pronostic" pour commencer.</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <Box component="thead">
                <Box component="tr" sx={{ '& th': { textAlign: 'left', fontSize: 12, color: SUB, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', px: 2, py: 1.4, borderBottom: `1px solid ${BORDER}` } }}>
                  <Box component="th">Match</Box>
                  <Box component="th">Marché</Box>
                  <Box component="th">Pari</Box>
                  <Box component="th" sx={{ textAlign: 'right !important' }}>Cote</Box>
                  <Box component="th" sx={{ textAlign: 'right !important' }}>Confiance</Box>
                  <Box component="th">Statut</Box>
                  <Box component="th" sx={{ textAlign: 'right !important' }}>Actions</Box>
                </Box>
              </Box>
              <Box component="tbody">
                {predictions.map((p, i) => (
                  <Box component="tr" key={p.id} sx={{
                    bgcolor: i % 2 === 0 ? ROW : ROW_ALT,
                    '&:hover': { bgcolor: alpha(OR, 0.05) },
                    '& td': { px: 2, py: 1.6, borderBottom: `1px solid ${BORDER}`, fontSize: 13.5 },
                  }}>
                    <Box component="td">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Star sx={{ fontSize: 15, color: OR }} />
                        <Box>
                          <Typography fontSize={12} color={SUB}>{p.competition} — {new Date(p.matchDate).toLocaleString('fr-FR')}</Typography>
                          <Typography fontWeight={700} fontSize={13.5} color={TXT}>{p.homeTeam} - {p.awayTeam}</Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box component="td" sx={{ color: SUB }}>{p.market}</Box>
                    <Box component="td" sx={{ fontWeight: 700, color: TXT }}>{p.pick}</Box>
                    <Box component="td" sx={{ textAlign: 'right', fontWeight: 800, color: OR }}>{Number(p.odds).toFixed(2)}</Box>
                    <Box component="td" sx={{ textAlign: 'right', fontWeight: 700, color: GRN }}>{p.confidence}%</Box>
                    <Box component="td">
                      <Chip size="small" label={STATUS_LABEL[p.status]}
                        sx={{ bgcolor: alpha(STATUS_COLOR[p.status], 0.14), color: STATUS_COLOR[p.status], fontWeight: 700, fontSize: 11.5, height: 22 }} />
                    </Box>
                    <Box component="td" sx={{ textAlign: 'right' }}>
                      <Tooltip title="Modifier">
                        <IconButton size="small" onClick={() => setDialogPrediction(p)} sx={{ color: SUB, '&:hover': { color: OR } }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton size="small" onClick={() => { if (confirm(`Supprimer le pronostic "${p.homeTeam} vs ${p.awayTeam}" ?`)) remove.mutate(p.id); }}
                          sx={{ color: SUB, '&:hover': { color: RED } }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {dialogPrediction !== null && <PredictionDialog prediction={dialogPrediction} open={true} onClose={() => setDialogPrediction(null)} />}
    </Box>
  );
}
