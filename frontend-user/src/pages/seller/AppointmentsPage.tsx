import { useState } from 'react';
import {
  Box, Typography, Chip, TextField, MenuItem, Select, FormControl,
  InputLabel, CircularProgress, Button, Dialog, DialogContent,
} from '@mui/material';
import {
  CalendarMonth, Person, Phone, Email, AccessTime, Store,
  CheckCircle, Cancel, Schedule, Done, Search, FilterList,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#94A3B8';
const SUB2 = '#94A3B8';
const GRN  = '#10B981';
const RED  = '#EF4444';
const YLW  = '#F59E0B';
const BLU  = '#3B82F6';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING:   { label: 'En attente',  color: YLW, icon: Schedule },
  CONFIRMED: { label: 'Confirmé',    color: GRN, icon: CheckCircle },
  DONE:      { label: 'Terminé',     color: BLU, icon: Done },
  CANCELLED: { label: 'Annulé',      color: RED, icon: Cancel },
  REFUSED:   { label: 'Refusé',      color: RED, icon: Cancel },
};

const darkMenu = {
  PaperProps: {
    sx: {
      bgcolor: '#FFFFFF', border: `1px solid ${BORD}`, borderRadius: '12px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
      '& .MuiMenuItem-root': {
        fontSize: 13, color: TXT, py: 1,
        '&:hover': { bgcolor: 'rgba(15,23,42,0.04)' },
        '&.Mui-selected': { bgcolor: 'rgba(255,107,0,0.14)', color: OR, fontWeight: 700 },
      },
    },
  },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'À l\'instant';
  if (h < 24) return `Il y a ${h}h`;
  const days = Math.floor(h / 24);
  return `Il y a ${days}j`;
}

// ── Appointment detail dialog ─────────────────────────────────────────────

function ApptDialog({ appt, onClose }: { appt: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(appt.sellerNote ?? '');

  const mut = useMutation({
    mutationFn: ({ status, sellerNote }: { status: string; sellerNote?: string }) =>
      api.patch(`/appointments/${appt.id}/status`, { status, sellerNote }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sellerAppointments'] }); onClose(); },
  });

  const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG['PENDING'];

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: '#F7F8FA', border: `1px solid ${BORD}`, borderRadius: '20px' } }}>
      <DialogContent sx={{ p: 0 }}>

        {/* Header */}
        <Box sx={{ p: 3, borderBottom: `1px solid ${BORD}`, background: 'linear-gradient(135deg, rgba(255,107,0,0.08) 0%, transparent 60%)' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
            <Typography fontSize={16} fontWeight={800} color={TXT}>{appt.product?.name ?? '—'}</Typography>
            <Box sx={{ px: 1.2, py: 0.4, borderRadius: '8px', bgcolor: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
              <Typography fontSize={11} fontWeight={700} color={cfg.color}>{cfg.label}</Typography>
            </Box>
          </Box>
          {appt.serviceType && (
            <Typography fontSize={12.5} color={SUB2}>{appt.serviceType}</Typography>
          )}
        </Box>

        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Date / Time */}
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarMonth sx={{ fontSize: 16, color: OR }} />
              <Box>
                <Typography fontSize={11} color={SUB}>Date</Typography>
                <Typography fontSize={13} fontWeight={600} color={TXT}>{formatDate(appt.scheduledAt)}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTime sx={{ fontSize: 16, color: OR }} />
              <Box>
                <Typography fontSize={11} color={SUB}>Heure</Typography>
                <Typography fontSize={13} fontWeight={600} color={TXT}>{formatTime(appt.scheduledAt)}</Typography>
              </Box>
            </Box>
            {appt.duration && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule sx={{ fontSize: 16, color: OR }} />
                <Box>
                  <Typography fontSize={11} color={SUB}>Durée</Typography>
                  <Typography fontSize={13} fontWeight={600} color={TXT}>{appt.duration} min</Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Client info */}
          <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
            <Typography fontSize={11} fontWeight={700} color={SUB} sx={{ textTransform: 'uppercase', letterSpacing: '0.8px', mb: 1.5 }}>Client</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person sx={{ fontSize: 14, color: SUB }} />
                <Typography fontSize={13} color={TXT}>{appt.clientName ?? 'Compte enregistré'}</Typography>
              </Box>
              {appt.clientPhone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone sx={{ fontSize: 14, color: SUB }} />
                  <Typography fontSize={13} color={TXT}>{appt.clientPhone}</Typography>
                </Box>
              )}
              {appt.clientEmail && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email sx={{ fontSize: 14, color: SUB }} />
                  <Typography fontSize={13} color={TXT}>{appt.clientEmail}</Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Client note */}
          {appt.note && (
            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
              <Typography fontSize={11} fontWeight={700} color={SUB} sx={{ textTransform: 'uppercase', letterSpacing: '0.8px', mb: 0.8 }}>Note du client</Typography>
              <Typography fontSize={13} color={SUB2}>{appt.note}</Typography>
            </Box>
          )}

          {/* Seller note */}
          <TextField fullWidth multiline rows={2} label="Votre note (optionnelle)" value={note}
            onChange={e => setNote(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#F7F8FA', borderRadius: '10px', fontSize: 13, color: TXT, '& fieldset': { borderColor: BORD }, '&:hover fieldset': { borderColor: 'rgba(15,23,42,0.09)' }, '&.Mui-focused fieldset': { borderColor: OR } }, '& .MuiInputLabel-root': { color: SUB, fontSize: 13 }, '& .MuiInputLabel-root.Mui-focused': { color: OR } }} />

          {/* Actions */}
          {appt.status === 'PENDING' && (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button fullWidth onClick={() => mut.mutate({ status: 'CONFIRMED', sellerNote: note })}
                disabled={mut.isPending}
                sx={{ py: 1.2, borderRadius: '10px', fontWeight: 700, fontSize: 13, bgcolor: GRN, color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#059669' } }}>
                <CheckCircle sx={{ fontSize: 16, mr: 0.8 }} />Confirmer
              </Button>
              <Button fullWidth onClick={() => mut.mutate({ status: 'REFUSED', sellerNote: note })}
                disabled={mut.isPending}
                sx={{ py: 1.2, borderRadius: '10px', fontWeight: 700, fontSize: 13, bgcolor: 'rgba(239,68,68,0.12)', color: RED, border: `1px solid ${RED}30`, textTransform: 'none', '&:hover': { bgcolor: 'rgba(239,68,68,0.2)' } }}>
                <Cancel sx={{ fontSize: 16, mr: 0.8 }} />Refuser
              </Button>
            </Box>
          )}
          {appt.status === 'CONFIRMED' && (
            <Button fullWidth onClick={() => mut.mutate({ status: 'DONE', sellerNote: note })}
              disabled={mut.isPending}
              sx={{ py: 1.2, borderRadius: '10px', fontWeight: 700, fontSize: 13, bgcolor: BLU, color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#2563EB' } }}>
              <Done sx={{ fontSize: 16, mr: 0.8 }} />Marquer comme terminé
            </Button>
          )}
          <Button onClick={onClose} sx={{ py: 1, borderRadius: '10px', fontSize: 13, color: SUB, textTransform: 'none' }}>
            Fermer
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// ── Appointment card ──────────────────────────────────────────────────────

function ApptCard({ appt, onClick }: { appt: any; onClick: () => void }) {
  const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG['PENDING'];
  const StatusIcon = cfg.icon;
  const isPending = appt.status === 'PENDING';

  return (
    <Box onClick={onClick}
      sx={{
        p: 2.5, borderRadius: '14px', cursor: 'pointer', transition: 'all 0.15s',
        bgcolor: isPending ? `${YLW}08` : CARD,
        border: `1px solid ${isPending ? `${YLW}25` : BORD}`,
        '&:hover': { border: `1px solid rgba(15,23,42,0.09)`, transform: 'translateY(-1px)' },
      }}>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
          <Typography fontSize={14} fontWeight={700} color={TXT} noWrap>{appt.product?.name ?? '—'}</Typography>
          {appt.serviceType && (
            <Typography fontSize={12} color={SUB} mt={0.2}>{appt.serviceType}</Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.2, py: 0.4, borderRadius: '8px', bgcolor: `${cfg.color}15`, border: `1px solid ${cfg.color}25`, flexShrink: 0 }}>
          <StatusIcon sx={{ fontSize: 12, color: cfg.color }} />
          <Typography fontSize={11} fontWeight={700} color={cfg.color}>{cfg.label}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <CalendarMonth sx={{ fontSize: 13, color: OR }} />
          <Typography fontSize={12} color={SUB2}>{formatDate(appt.scheduledAt)} à {formatTime(appt.scheduledAt)}</Typography>
        </Box>
        {(appt.clientName || appt.userId) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Person sx={{ fontSize: 13, color: SUB }} />
            <Typography fontSize={12} color={SUB2}>{appt.clientName ?? 'Compte enregistré'}</Typography>
          </Box>
        )}
        {appt.clientPhone && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Phone sx={{ fontSize: 13, color: SUB }} />
            <Typography fontSize={12} color={SUB2}>{appt.clientPhone}</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Store sx={{ fontSize: 13, color: SUB }} />
          <Typography fontSize={12} color={SUB}>{appt.store?.name}</Typography>
        </Box>
      </Box>

      {isPending && (
        <Box sx={{ mt: 1.5, px: 1.5, py: 0.7, borderRadius: '8px', bgcolor: `${YLW}15`, border: `1px solid ${YLW}25`, display: 'inline-block' }}>
          <Typography fontSize={11} fontWeight={600} color={YLW}>⏳ Action requise — Confirmez ou refusez ce rendez-vous</Typography>
        </Box>
      )}
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data: appts = [], isLoading } = useQuery({
    queryKey: ['sellerAppointments'],
    queryFn: () => api.get('/appointments/seller').then(r => r.data),
    refetchInterval: 30000,
  });

  const pending = appts.filter((a: any) => a.status === 'PENDING').length;

  const filtered = appts.filter((a: any) => {
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.product?.name?.toLowerCase().includes(q) ||
        a.clientName?.toLowerCase().includes(q) ||
        a.clientPhone?.includes(q) ||
        a.serviceType?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG, p: { xs: 2, md: 3 } }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: `${OR}18`, border: `1px solid ${OR}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarMonth sx={{ fontSize: 22, color: OR }} />
              </Box>
              <Box>
                <Typography fontSize={20} fontWeight={800} color={TXT}>Rendez-vous</Typography>
                <Typography fontSize={12} color={SUB}>Gérez les demandes de vos clients</Typography>
              </Box>
            </Box>
          </Box>
          {pending > 0 && (
            <Box sx={{ px: 2, py: 0.8, borderRadius: '10px', bgcolor: `${YLW}15`, border: `1px solid ${YLW}30` }}>
              <Typography fontSize={13} fontWeight={700} color={YLW}>{pending} en attente de confirmation</Typography>
            </Box>
          )}
        </Box>

        {/* Stats bar */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = appts.filter((a: any) => a.status === key).length;
            if (count === 0) return null;
            const SIcon = cfg.icon;
            return (
              <Box key={key} onClick={() => setFilterStatus(filterStatus === key ? 'ALL' : key)}
                sx={{ px: 1.5, py: 0.8, borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.8, bgcolor: filterStatus === key ? `${cfg.color}15` : CARD, border: `1px solid ${filterStatus === key ? cfg.color + '40' : BORD}`, '&:hover': { border: `1px solid ${cfg.color}30` } }}>
                <SIcon sx={{ fontSize: 14, color: cfg.color }} />
                <Typography fontSize={12} fontWeight={600} color={cfg.color}>{cfg.label}</Typography>
                <Typography fontSize={12} fontWeight={700} color={TXT}>{count}</Typography>
              </Box>
            );
          })}
        </Box>

        {/* Search + filter */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0, borderRadius: '10px', bgcolor: CARD, border: `1px solid ${BORD}` }}>
            <Search sx={{ fontSize: 16, color: SUB, flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, téléphone, service…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: TXT, padding: '10px 0' }} />
          </Box>
          <FormControl sx={{ minWidth: 150 }}>
            <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} MenuProps={darkMenu}
              sx={{ height: 42, bgcolor: CARD, borderRadius: '10px', fontSize: 13, color: TXT, '& .MuiOutlinedInput-notchedOutline': { borderColor: BORD }, '& .MuiSelect-icon': { color: SUB } }}>
              <MenuItem value="ALL">Tous</MenuItem>
              {Object.entries(STATUS_CONFIG).map(([k, c]) => <MenuItem key={k} value={k}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {/* List */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: OR }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <CalendarMonth sx={{ fontSize: 48, color: BORD, mb: 1.5 }} />
            <Typography fontSize={16} fontWeight={700} color={SUB2} mb={0.5}>
              {appts.length === 0 ? 'Aucun rendez-vous pour l\'instant' : 'Aucun résultat'}
            </Typography>
            <Typography fontSize={13} color={SUB}>
              {appts.length === 0 ? 'Les demandes de vos clients apparaîtront ici.' : 'Essayez d\'autres filtres.'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {filtered.map((appt: any) => (
              <ApptCard key={appt.id} appt={appt} onClick={() => setSelectedAppt(appt)} />
            ))}
          </Box>
        )}
      </Box>

      {selectedAppt && <ApptDialog appt={selectedAppt} onClose={() => setSelectedAppt(null)} />}
    </Box>
  );
}
