import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, TextField, MenuItem, Select, FormControl,
  InputLabel, CircularProgress, Button, Dialog, DialogContent,
} from '@mui/material';
import {
  CalendarMonth, Person, Phone, Email, AccessTime, Store,
  CheckCircle, Cancel, Schedule, Done, Search, ChatBubbleOutline,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { ListSkeleton } from '../../components/shared/Skeletons';
import DateRangeFilter from '../../components/shared/DateRangeFilter';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const SUB2 = '#64748B';
const GRN  = '#10B981';
const RED  = '#EF4444';
const YLW  = '#F59E0B';
const BLU  = '#3B82F6';

// Valeurs alignées sur l'enum Prisma AppointmentStatus (PENDING/CONFIRMED/
// CANCELLED/COMPLETED) — 'REFUSED'/'DONE' n'existent pas dans l'enum et
// faisaient echouer la mise a jour en base sans jamais remonter d'erreur
// visible (Prisma rejette la valeur, le mutation n'avait pas de onError).
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING:   { label: 'En attente',  color: YLW, icon: Schedule },
  CONFIRMED: { label: 'Confirmé',    color: GRN, icon: CheckCircle },
  COMPLETED: { label: 'Terminé',     color: BLU, icon: Done },
  CANCELLED: { label: 'Annulé',      color: RED, icon: Cancel },
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
  const navigate = useNavigate();
  const [note, setNote] = useState(appt.sellerNote ?? '');

  // Compte enregistré → vraies infos (relation user) ; sinon réservation invité (clientName/Phone/Email).
  const clientName  = appt.user ? `${appt.user.firstName ?? ''} ${appt.user.lastName ?? ''}`.trim() : appt.clientName;
  const clientPhone = appt.user?.phone ?? appt.clientPhone;
  const clientEmail = appt.user?.email ?? appt.clientEmail;

  const { enqueueSnackbar } = useSnackbar();
  const mut = useMutation({
    mutationFn: ({ status, sellerNote }: { status: string; sellerNote?: string }) =>
      api.patch(`/appointments/${appt.id}/status`, { status, sellerNote }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sellerAppointments'] }); onClose(); },
    onError: (e: any) => enqueueSnackbar(e?.response?.data?.message || 'Erreur lors de la mise à jour', { variant: 'error' }),
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography fontSize={11} fontWeight={700} color={SUB} sx={{ textTransform: 'uppercase', letterSpacing: '0.8px' }}>Client</Typography>
              {appt.userId && (
                <Button size="small" startIcon={<ChatBubbleOutline sx={{ fontSize: 15 }} />}
                  onClick={() => navigate(`/seller/chat?userId=${appt.userId}`)}
                  sx={{ py: 0.3, px: 1.2, borderRadius: '8px', fontSize: 12, fontWeight: 700, textTransform: 'none',
                    color: OR, bgcolor: `${OR}12`, '&:hover': { bgcolor: `${OR}22` } }}>
                  Contacter
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person sx={{ fontSize: 14, color: SUB }} />
                <Typography fontSize={13} color={TXT}>{clientName || 'Compte enregistré'}</Typography>
              </Box>
              {clientPhone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone sx={{ fontSize: 14, color: SUB }} />
                  <Typography fontSize={13} color={TXT}>{clientPhone}</Typography>
                </Box>
              )}
              {clientEmail && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email sx={{ fontSize: 14, color: SUB }} />
                  <Typography fontSize={13} color={TXT}>{clientEmail}</Typography>
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
              <Button fullWidth onClick={() => mut.mutate({ status: 'CANCELLED', sellerNote: note })}
                disabled={mut.isPending}
                sx={{ py: 1.2, borderRadius: '10px', fontWeight: 700, fontSize: 13, bgcolor: 'rgba(239,68,68,0.12)', color: RED, border: `1px solid ${RED}30`, textTransform: 'none', '&:hover': { bgcolor: 'rgba(239,68,68,0.2)' } }}>
                <Cancel sx={{ fontSize: 16, mr: 0.8 }} />Refuser
              </Button>
            </Box>
          )}
          {appt.status === 'CONFIRMED' && (
            <Button fullWidth onClick={() => mut.mutate({ status: 'COMPLETED', sellerNote: note })}
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
  const name = appt.user ? `${appt.user.firstName ?? ''} ${appt.user.lastName ?? ''}`.trim() : appt.clientName;
  const initial = (name || 'C')[0]?.toUpperCase();
  const scheduled = new Date(appt.scheduledAt);
  const dayLabel = scheduled.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  return (
    <Box onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: '16px', cursor: 'pointer', transition: 'all 0.16s',
        bgcolor: CARD, border: `1px solid ${isPending ? `${YLW}35` : BORD}`,
        '&:hover': { borderColor: 'rgba(15,23,42,0.14)', boxShadow: '0 6px 20px rgba(15,23,42,0.06)', transform: 'translateY(-1px)' },
      }}>

      {/* Date block */}
      <Box sx={{ flexShrink: 0, width: 56, height: 56, borderRadius: '13px', bgcolor: `${OR}12`, border: `1px solid ${OR}25`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography fontSize={10.5} fontWeight={800} color={OR} sx={{ textTransform: 'uppercase' }}>{dayLabel.split(' ')[1]}</Typography>
        <Typography fontSize={17} fontWeight={900} color={OR} lineHeight={1}>{dayLabel.split(' ')[0]}</Typography>
      </Box>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4, flexWrap: 'wrap' }}>
          <Typography fontSize={14} fontWeight={800} color={TXT} noWrap>{appt.product?.name ?? '—'}</Typography>
          {appt.serviceType && <Typography fontSize={12} color={SUB} noWrap>· {appt.serviceType}</Typography>}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <AccessTime sx={{ fontSize: 13, color: SUB }} />
            <Typography fontSize={12.5} color={SUB2}>{formatTime(appt.scheduledAt)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: 'rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Typography fontSize={9} fontWeight={800} color={SUB2}>{initial}</Typography>
            </Box>
            <Typography fontSize={12.5} color={SUB2} noWrap>{name || 'Compte enregistré'}</Typography>
          </Box>
          {(appt.user?.phone ?? appt.clientPhone) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <Phone sx={{ fontSize: 12, color: SUB }} />
              <Typography fontSize={12.5} color={SUB2}>{appt.user?.phone ?? appt.clientPhone}</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Store sx={{ fontSize: 12, color: SUB }} />
            <Typography fontSize={12.5} color={SUB}>{appt.store?.name}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.3, py: 0.6, borderRadius: '9px', bgcolor: `${cfg.color}12`, border: `1px solid ${cfg.color}30`, flexShrink: 0 }}>
        <StatusIcon sx={{ fontSize: 13, color: cfg.color }} />
        <Typography fontSize={11.5} fontWeight={700} color={cfg.color}>{cfg.label}</Typography>
      </Box>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const { data: appts = [], isLoading } = useQuery({
    queryKey: ['sellerAppointments'],
    queryFn: () => api.get('/appointments/seller').then(r => r.data),
    refetchInterval: 30000,
  });
  const showSkel = useDelayedLoading(isLoading);

  const pending = appts.filter((a: any) => a.status === 'PENDING').length;

  const filtered = appts.filter((a: any) => {
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (dateFrom && new Date(a.scheduledAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(a.scheduledAt) > new Date(`${dateTo}T23:59:59`)) return false;
    if (search) {
      const q = search.toLowerCase();
      const registeredName = a.user ? `${a.user.firstName ?? ''} ${a.user.lastName ?? ''}` : '';
      return (
        a.product?.name?.toLowerCase().includes(q) ||
        registeredName.toLowerCase().includes(q) ||
        a.clientName?.toLowerCase().includes(q) ||
        (a.user?.phone ?? a.clientPhone)?.includes(q) ||
        a.serviceType?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pageCount   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters  = filterStatus !== 'ALL' || !!search || !!dateFrom || !!dateTo;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG, p: { xs: 2, md: 3 } }}>
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>

        {/* Hero header */}
        <Box sx={{
          mb: 3, p: { xs: 2.5, md: 3 }, borderRadius: '20px', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 55%,#1E293B 100%)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2,
        }}>
          <Box sx={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%',
            background: `radial-gradient(circle,${OR}33,transparent 70%)` }} />
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: `${OR}22`, border: `1px solid ${OR}44` }}>
              <CalendarMonth sx={{ color: OR, fontSize: 26 }} />
            </Box>
            <Box>
              <Typography fontWeight={900} fontSize={{ xs: 19, md: 23 }} color="#fff" letterSpacing="-0.4px">Rendez-vous</Typography>
              <Typography fontSize={12.5} color="rgba(255,255,255,0.55)">Gérez les demandes de vos clients</Typography>
            </Box>
          </Box>
          {pending > 0 && (
            <Box sx={{ position: 'relative', px: 2, py: 0.9, borderRadius: '11px', bgcolor: `${YLW}20`, border: `1px solid ${YLW}45` }}>
              <Typography fontSize={12.5} fontWeight={700} color={YLW}>{pending} en attente de confirmation</Typography>
            </Box>
          )}
        </Box>

        {/* Stats bar */}
        <Box sx={{ display: 'flex', gap: 1.2, mb: 2, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = appts.filter((a: any) => a.status === key).length;
            if (count === 0) return null;
            const SIcon = cfg.icon;
            const active = filterStatus === key;
            return (
              <Box key={key} onClick={() => { setFilterStatus(active ? 'ALL' : key); setPage(1); }}
                sx={{ px: 1.6, py: 0.9, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 0.8,
                  bgcolor: active ? `${cfg.color}12` : CARD, border: `1px solid ${active ? cfg.color + '45' : BORD}`,
                  '&:hover': { borderColor: `${cfg.color}45` } }}>
                <SIcon sx={{ fontSize: 14, color: cfg.color }} />
                <Typography fontSize={12.5} fontWeight={600} color={cfg.color}>{cfg.label}</Typography>
                <Typography fontSize={12.5} fontWeight={800} color={TXT}>{count}</Typography>
              </Box>
            );
          })}
        </Box>

        {/* Search + status + date range */}
        <Box sx={{ p: 1.8, borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, mb: 2.5,
          display: 'flex', flexWrap: 'wrap', gap: 1.2, alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.2, borderRadius: '10px', bgcolor: 'rgba(15,23,42,0.03)', border: `1px solid ${BORD}` }}>
            <Search sx={{ fontSize: 16, color: SUB, flexShrink: 0 }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher par nom, téléphone, service…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: TXT, padding: '9px 0' }} />
          </Box>
          <FormControl sx={{ minWidth: 150 }}>
            <Select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} MenuProps={darkMenu}
              sx={{ height: 40, bgcolor: 'rgba(15,23,42,0.03)', borderRadius: '10px', fontSize: 13, color: TXT, '& .MuiOutlinedInput-notchedOutline': { borderColor: BORD }, '& .MuiSelect-icon': { color: SUB } }}>
              <MenuItem value="ALL">Tous les statuts</MenuItem>
              {Object.entries(STATUS_CONFIG).map(([k, c]) => <MenuItem key={k} value={k}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>
          <DateRangeFilter
            from={dateFrom} to={dateTo}
            onFromChange={v => { setDateFrom(v); setPage(1); }}
            onToChange={v => { setDateTo(v); setPage(1); }}
            textColor={TXT} subColor={SUB} borderColor={BORD}
          />
          {hasFilters && (
            <Typography onClick={() => { setFilterStatus('ALL'); setSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}
              sx={{ fontSize: 12, color: SUB, cursor: 'pointer', textDecoration: 'underline', '&:hover': { color: TXT } }}>
              Réinitialiser
            </Typography>
          )}
        </Box>

        {/* List */}
        {isLoading ? (
          showSkel ? <ListSkeleton rows={5} /> : null
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 10, textAlign: 'center', borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}` }}>
            <CalendarMonth sx={{ fontSize: 48, color: BORD, mb: 1.5 }} />
            <Typography fontSize={16} fontWeight={700} color={SUB2} mb={0.5}>
              {appts.length === 0 ? 'Aucun rendez-vous pour l\'instant' : 'Aucun résultat'}
            </Typography>
            <Typography fontSize={13} color={SUB}>
              {appts.length === 0 ? 'Les demandes de vos clients apparaîtront ici.' : 'Essayez d\'autres filtres.'}
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {paged.map((appt: any) => (
                <ApptCard key={appt.id} appt={appt} onClick={() => setSelectedAppt(appt)} />
              ))}
            </Box>

            {filtered.length > PAGE_SIZE && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, px: 0.5 }}>
                <Typography fontSize={12} color={SUB}>Page {currentPage} / {pageCount}</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: TXT, border: `1px solid ${BORD}`, borderRadius: '9px', px: 1.6, bgcolor: CARD, '&.Mui-disabled': { color: SUB, opacity: 0.5 } }}>
                    Précédent
                  </Button>
                  <Button size="small" disabled={currentPage >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: TXT, border: `1px solid ${BORD}`, borderRadius: '9px', px: 1.6, bgcolor: CARD, '&.Mui-disabled': { color: SUB, opacity: 0.5 } }}>
                    Suivant
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>

      {selectedAppt && <ApptDialog appt={selectedAppt} onClose={() => setSelectedAppt(null)} />}
    </Box>
  );
}
