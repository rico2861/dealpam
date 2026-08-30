import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, TextField, Chip,
  IconButton, Grid, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Tooltip,
} from '@mui/material';
import { Add, Edit, Delete, SportsSoccer } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

const ORANGE = '#FF9900';

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

const STATUS_LABEL: Record<string, string> = { PENDING: 'En attente', WON: 'Gagné', LOST: 'Perdu', VOID: 'Annulé' };
const STATUS_COLOR: Record<string, string> = { PENDING: '#64748B', WON: '#10B981', LOST: '#EF4444', VOID: '#94A3B8' };

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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>{isNew ? 'Publier un pronostic' : 'Modifier le pronostic'}</DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField label="Compétition *" value={form.competition || ''} onChange={set('competition')} fullWidth size="small" placeholder="Ligue 1, Serie A..." />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Équipe domicile *" value={form.homeTeam || ''} onChange={set('homeTeam')} fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Équipe extérieur *" value={form.awayTeam || ''} onChange={set('awayTeam')} fullWidth size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Date du match *" type="datetime-local" value={form.matchDate || ''} onChange={set('matchDate')}
              fullWidth size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Marché *" value={form.market || ''} onChange={set('market')} fullWidth size="small" placeholder="1X2, Over/Under 2.5..." />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Cote *" type="number" value={form.odds ?? ''} onChange={setN('odds')} fullWidth size="small" inputProps={{ step: 0.01, min: 1 }} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Pari conseillé *" value={form.pick || ''} onChange={set('pick')} fullWidth size="small" placeholder="Victoire Real Madrid" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Confiance (%)" type="number" value={form.confidence ?? ''} onChange={setN('confidence')} fullWidth size="small" inputProps={{ min: 0, max: 100 }} />
          </Grid>
          <Grid item xs={6}>
            <TextField select label="Résultat" value={form.status || 'PENDING'} onChange={set('status')} fullWidth size="small" SelectProps={{ native: true }}>
              <option value="PENDING">En attente</option>
              <option value="WON">Gagné</option>
              <option value="LOST">Perdu</option>
              <option value="VOID">Annulé</option>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Note (optionnel)" value={form.note || ''} onChange={set('note')} fullWidth size="small" multiline rows={2} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>Annuler</Button>
        <Button variant="contained" onClick={() => save.mutate()}
          disabled={!form.competition || !form.homeTeam || !form.awayTeam || !form.matchDate || !form.market || !form.pick || save.isPending}
          startIcon={save.isPending ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ borderRadius: 2, bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, fontWeight: 700 }}>
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Pronostics VIP</Typography>
          <Typography color="text.secondary" fontSize={14}>
            Pronostics football réservés aux clients avec un abonnement VIP actif.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogPrediction({ ...EMPTY })}
          sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, borderRadius: 2, fontWeight: 700 }}>
          Publier un pronostic
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: ORANGE }} />
        </Box>
      ) : predictions.length === 0 ? (
        <Card sx={{ borderRadius: 3, py: 6, textAlign: 'center' }}>
          <SportsSoccer sx={{ fontSize: 64, color: '#E2E8F0', mb: 2 }} />
          <Typography color="text.secondary">Aucun pronostic publié. Cliquez sur "Publier un pronostic" pour commencer.</Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {predictions.map(p => (
            <Grid item xs={12} md={6} lg={4} key={p.id}>
              <Card sx={{ borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography fontSize={12} color="text.secondary">{p.competition} — {new Date(p.matchDate).toLocaleString('fr-FR')}</Typography>
                    <Chip label={STATUS_LABEL[p.status]} size="small"
                      sx={{ bgcolor: `${STATUS_COLOR[p.status]}20`, color: STATUS_COLOR[p.status], fontWeight: 700 }} />
                  </Box>
                  <Typography fontWeight={800} fontSize={16} mb={1}>{p.homeTeam} vs {p.awayTeam}</Typography>
                  <Typography fontSize={13.5}><strong>Pari :</strong> {p.pick}</Typography>
                  <Typography fontSize={13.5}><strong>Marché :</strong> {p.market} · <strong>Cote :</strong> {p.odds}</Typography>
                  <Typography fontSize={13.5} color={ORANGE} fontWeight={700}>{p.confidence}% confiance</Typography>
                  {p.note && <Typography fontSize={12.5} color="text.secondary" mt={0.5}>{p.note}</Typography>}

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1.5 }}>
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => setDialogPrediction(p)} sx={{ '&:hover': { color: ORANGE } }}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton size="small" onClick={() => { if (confirm(`Supprimer le pronostic "${p.homeTeam} vs ${p.awayTeam}" ?`)) remove.mutate(p.id); }}
                        sx={{ '&:hover': { color: '#EF4444' } }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {dialogPrediction !== null && <PredictionDialog prediction={dialogPrediction} open={true} onClose={() => setDialogPrediction(null)} />}
    </Box>
  );
}
