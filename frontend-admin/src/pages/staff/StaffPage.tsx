import { useState } from 'react';
import {
  Container, Typography, Box, Card, Avatar, Chip, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  CircularProgress, alpha, Divider, Stack, Tooltip, InputAdornment, Collapse,
} from '@mui/material';
import {
  Add, HeadsetMic, Handshake, AccountBalance, AdminPanelSettings,
  CheckCircle, Block, FiberManualRecord, Visibility, VisibilityOff, Edit,
  Percent, LockReset, ContentCopy,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const ROLES = [
  {
    value: 'CUSTOMER_CARE',
    label: 'Customer Care',
    icon: HeadsetMic,
    color: '#3B82F6',
    description: 'Commandes, support chat, avis clients',
    access: ['Commandes', 'Support Chat', 'Avis'],
  },
  {
    value: 'PARTNER',
    label: 'Partenaire',
    icon: Handshake,
    color: '#10B981',
    description: 'Publicités, promotions, boutique DealPam',
    access: ['Publicités', 'Promotions', 'Boutique DealPam', 'Pubs Homepage'],
  },
  {
    value: 'ACCOUNTANT',
    label: 'Comptable',
    icon: AccountBalance,
    color: '#F97316',
    description: 'Paiements et abonnements uniquement',
    access: ['Paiements', 'Abonnements'],
  },
  {
    value: 'MODERATOR',
    label: 'Modérateur',
    icon: AdminPanelSettings,
    color: '#F59E0B',
    description: 'Vendeurs, produits, commandes, support',
    access: ['Vendeurs', 'Produits', 'Commandes', 'Avis', 'Support Chat'],
  },
];

const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.value, r]));

function RoleBadge({ role }: { role: string }) {
  const r = ROLE_MAP[role];
  if (!r) return null;
  return (
    <Chip
      icon={<r.icon sx={{ fontSize: '13px !important', color: `${r.color} !important` }} />}
      label={r.label}
      size="small"
      sx={{ height: 24, fontSize: 11.5, fontWeight: 700, bgcolor: alpha(r.color, 0.1), color: r.color, border: `1px solid ${alpha(r.color, 0.25)}` }}
    />
  );
}

export default function StaffPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen]           = useState(false);
  const [tempPwdDialog, setTempPwdDialog] = useState<{ open: boolean; name: string; pwd: string }>({ open: false, name: '', pwd: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: '', partnershipPercent: '', responsibilities: '', notes: '' });
  const [formError, setFormError] = useState('');
  const [editMeta, setEditMeta] = useState<{ open: boolean; id: string; name: string; partnershipPercent: string; responsibilities: string; notes: string }>({
    open: false, id: '', name: '', partnershipPercent: '', responsibilities: '', notes: '',
  });

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/users/staff/list').then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: typeof form) => api.post('/users/staff', {
      ...d,
      partnershipPercent: d.partnershipPercent ? Number(d.partnershipPercent) : undefined,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      setOpen(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: '', partnershipPercent: '', responsibilities: '', notes: '' });
      enqueueSnackbar('Compte créé avec succès', { variant: 'success' });
    },
    onError: (err: any) => setFormError(err.response?.data?.message || 'Erreur lors de la création'),
  });

  const resetPwdMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.post(`/users/staff/${id}/reset-password`).then(r => ({ ...r.data, name })),
    onSuccess: (d) => setTempPwdDialog({ open: true, name: d.name, pwd: d.tempPassword }),
    onError: () => enqueueSnackbar('Erreur lors de la réinitialisation', { variant: 'error' }),
  });

  const updateMetaMut = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/users/staff/${id}/meta`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); setEditMeta(s => ({ ...s, open: false })); enqueueSnackbar('Profil mis à jour', { variant: 'success' }); },
  });

  const disableMut = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); enqueueSnackbar('Compte désactivé', { variant: 'warning' }); },
  });

  const enableMut = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/enable`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); enqueueSnackbar('Compte réactivé', { variant: 'success' }); },
  });

  const handleSubmit = () => {
    setFormError('');
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.role) {
      setFormError('Tous les champs sont obligatoires'); return;
    }
    if (form.password.length < 6) { setFormError('Mot de passe minimum 6 caractères'); return; }
    createMut.mutate(form);
  };

  // Group staff by role
  const grouped = ROLES.map(r => ({
    ...r,
    members: staff.filter((s: any) => s.role === r.value),
  }));

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Gestion de l'équipe</Typography>
          <Typography fontSize={13} color="text.secondary" mt={0.5}>
            {staff.length} membre{staff.length > 1 ? 's' : ''} — Customer Care, Partenaires, Comptables, Modérateurs
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setFormError(''); setOpen(true); }}
          sx={{ borderRadius: 2.5, fontWeight: 700, px: 2.5, bgcolor: '#FF9900', '&:hover': { bgcolor: '#e68900' } }}>
          Nouveau membre
        </Button>
      </Box>

      {/* Role cards with members */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {grouped.map(({ value, label, icon: Icon, color, description, access, members }) => (
            <Card key={value} sx={{ p: 2.5, borderRadius: 3, border: `1.5px solid ${alpha(color, 0.2)}`, boxShadow: 'none' }}>
              {/* Role header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon sx={{ fontSize: 20, color }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={800} fontSize={15}>{label}</Typography>
                  <Typography fontSize={12} color="text.secondary">{description}</Typography>
                </Box>
                <Chip label={`${members.length}`} size="small"
                  sx={{ height: 22, fontWeight: 700, fontSize: 12, bgcolor: alpha(color, 0.1), color }} />
              </Box>

              {/* Access list */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 2, pb: 1.5, borderBottom: `1px solid ${alpha(color, 0.15)}` }}>
                {access.map(a => (
                  <Chip key={a} label={a} size="small" sx={{ height: 20, fontSize: 10.5, bgcolor: alpha(color, 0.06), color: alpha(color, 0.9) }} />
                ))}
              </Box>

              {/* Members */}
              {members.length === 0 ? (
                <Typography fontSize={12.5} color="text.disabled" sx={{ py: 1, textAlign: 'center' }}>
                  Aucun membre — cliquez sur "Nouveau membre" pour en ajouter.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {members.map((m: any) => {
                    const meta = m.staffMeta ? JSON.parse(m.staffMeta) : null;
                    return (
                      <Box key={m.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 2, bgcolor: '#FAFAFA', border: '1px solid #F0F0F0' }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(color, 0.15), color, fontSize: 13, fontWeight: 700 }}>
                            {m.firstName?.[0]}
                          </Avatar>
                          <Box sx={{ flex: 1, overflow: 'hidden' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <Typography fontSize={13} fontWeight={700} noWrap>{m.firstName} {m.lastName}</Typography>
                              {value === 'PARTNER' && meta?.partnershipPercent > 0 && (
                                <Chip label={`${meta.partnershipPercent}%`} size="small"
                                  sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: alpha(color, 0.12), color }} />
                              )}
                            </Box>
                            <Typography fontSize={11} color="text.secondary" noWrap>{m.email}</Typography>
                            {value === 'PARTNER' && meta?.responsibilities && (
                              <Typography fontSize={10.5} color="text.disabled" noWrap>{meta.responsibilities}</Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                              <FiberManualRecord sx={{ fontSize: 8, color: m.isActive ? '#10B981' : '#9CA3AF' }} />
                              <Typography fontSize={10.5} color={m.isActive ? '#059669' : '#9CA3AF'} fontWeight={600}>
                                {m.isActive ? 'Actif' : 'Inactif'}
                              </Typography>
                            </Box>
                            {value === 'PARTNER' && (
                              <Tooltip title="Modifier le profil">
                                <IconButton size="small" onClick={() => setEditMeta({ open: true, id: m.id, name: `${m.firstName} ${m.lastName}`, partnershipPercent: meta?.partnershipPercent ?? '', responsibilities: meta?.responsibilities ?? '', notes: meta?.notes ?? '' })}
                                  sx={{ color: color, '&:hover': { bgcolor: alpha(color, 0.08) } }}>
                                  <Edit sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {m.isActive ? (
                              <>
                                <Tooltip title="Réinitialiser le mot de passe">
                                  <IconButton size="small" onClick={() => resetPwdMut.mutate({ id: m.id, name: `${m.firstName} ${m.lastName}` })} sx={{ color: '#8B5CF6', '&:hover': { bgcolor: alpha('#8B5CF6', 0.08) } }}>
                                    <LockReset sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Désactiver">
                                  <IconButton size="small" onClick={() => disableMut.mutate(m.id)} sx={{ color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }}>
                                    <Block sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : (
                              <Tooltip title="Réactiver">
                                <IconButton size="small" onClick={() => enableMut.mutate(m.id)} sx={{ color: '#10B981', '&:hover': { bgcolor: alpha('#10B981', 0.08) } }}>
                                  <CheckCircle sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Card>
          ))}
        </Box>
      )}

      {/* Create Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={800} sx={{ pb: 0 }}>Créer un compte équipe</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{formError}</Alert>}

          {/* Role selector — visual cards */}
          <Typography fontSize={12} fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={1.5}>
            Rôle *
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 3 }}>
            {ROLES.map(({ value, label, icon: Icon, color, description }) => {
              const selected = form.role === value;
              return (
                <Box key={value} onClick={() => setForm(f => ({ ...f, role: value }))}
                  sx={{ p: 1.5, borderRadius: 2.5, border: `2px solid ${selected ? color : '#E5E7EB'}`, cursor: 'pointer',
                    bgcolor: selected ? alpha(color, 0.06) : 'transparent', transition: 'all 0.15s',
                    '&:hover': { borderColor: color, bgcolor: alpha(color, 0.04) } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Icon sx={{ fontSize: 18, color: selected ? color : '#9CA3AF' }} />
                    <Typography fontSize={13} fontWeight={700} color={selected ? color : 'text.primary'}>{label}</Typography>
                  </Box>
                  <Typography fontSize={11} color="text.secondary" lineHeight={1.4}>{description}</Typography>
                </Box>
              );
            })}
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <TextField label="Prénom *" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField label="Nom *" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
          <TextField label="Email *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            fullWidth size="small" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField
            label="Mot de passe *" type={showPwd ? 'text' : 'password'}
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            fullWidth size="small"
            InputProps={{ endAdornment: (
              <IconButton size="small" onClick={() => setShowPwd(p => !p)} edge="end">
                {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            )}}
            helperText="Minimum 6 caractères"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          {/* Partner-specific fields */}
          <Collapse in={form.role === 'PARTNER'}>
            <Divider sx={{ my: 2.5 }} />
            <Typography fontSize={12} fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={2}>
              Profil partenaire
            </Typography>
            <TextField
              label="Pourcentage dans l'entreprise *"
              type="number" inputProps={{ min: 0, max: 100, step: 0.01 }}
              value={form.partnershipPercent}
              onChange={e => setForm(f => ({ ...f, partnershipPercent: e.target.value }))}
              fullWidth size="small" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              InputProps={{ endAdornment: <InputAdornment position="end"><Percent sx={{ fontSize: 16, color: '#10B981' }} /></InputAdornment> }}
              helperText="Part du dividende calculée automatiquement sur les revenus de la plateforme"
            />
            <TextField
              label="Responsabilités" multiline rows={2}
              value={form.responsibilities}
              onChange={e => setForm(f => ({ ...f, responsibilities: e.target.value }))}
              fullWidth size="small" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              placeholder="Ex: Supervision des partenariats commerciaux, développement des marchés…"
            />
            <TextField
              label="Notes internes" multiline rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              placeholder="Informations confidentielles sur l'accord de partenariat…"
            />
          </Collapse>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpen(false)} sx={{ borderRadius: 2 }}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMut.isPending}
            sx={{ borderRadius: 2, bgcolor: '#FF9900', '&:hover': { bgcolor: '#e68900' }, minWidth: 140 }}>
            {createMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Créer le compte'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Temp Password Dialog */}
      <Dialog open={tempPwdDialog.open} onClose={() => setTempPwdDialog(s => ({ ...s, open: false }))} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={800} sx={{ pb: 0.5 }}>Mot de passe temporaire</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2, fontSize: 13 }}>
            Communiquez ce mot de passe à <strong>{tempPwdDialog.name}</strong> de façon sécurisée.<br />
            Il leur sera demandé de le changer dès la première connexion.
          </Alert>
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#1E1B4B', display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
            <Typography fontFamily="monospace" fontSize={18} fontWeight={900} color="#A5B4FC" letterSpacing="2px">
              {tempPwdDialog.pwd}
            </Typography>
            <Tooltip title="Copier">
              <IconButton size="small" onClick={() => { navigator.clipboard.writeText(tempPwdDialog.pwd); enqueueSnackbar('Copié !', { variant: 'success' }); }}
                sx={{ color: '#818CF8', '&:hover': { bgcolor: alpha('#818CF8', 0.1) } }}>
                <ContentCopy sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setTempPwdDialog(s => ({ ...s, open: false }))} variant="contained"
            sx={{ borderRadius: 2, bgcolor: '#FF9900', '&:hover': { bgcolor: '#e68900' } }}>
            Compris
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Partner Meta Dialog */}
      <Dialog open={editMeta.open} onClose={() => setEditMeta(s => ({ ...s, open: false }))} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={800} sx={{ pb: 0.5 }}>
          Profil partenaire — {editMeta.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Pourcentage dans l'entreprise"
            type="number" inputProps={{ min: 0, max: 100, step: 0.01 }}
            value={editMeta.partnershipPercent}
            onChange={e => setEditMeta(s => ({ ...s, partnershipPercent: e.target.value }))}
            fullWidth size="small" sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{ endAdornment: <InputAdornment position="end"><Percent sx={{ fontSize: 16, color: '#10B981' }} /></InputAdornment> }}
            helperText="Dividende calculé automatiquement sur les revenus totaux de la plateforme"
          />
          <TextField
            label="Responsabilités" multiline rows={3}
            value={editMeta.responsibilities}
            onChange={e => setEditMeta(s => ({ ...s, responsibilities: e.target.value }))}
            fullWidth size="small" sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
            label="Notes internes" multiline rows={2}
            value={editMeta.notes}
            onChange={e => setEditMeta(s => ({ ...s, notes: e.target.value }))}
            fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setEditMeta(s => ({ ...s, open: false }))} sx={{ borderRadius: 2 }}>Annuler</Button>
          <Button variant="contained" onClick={() => updateMetaMut.mutate({ id: editMeta.id, partnershipPercent: Number(editMeta.partnershipPercent), responsibilities: editMeta.responsibilities, notes: editMeta.notes })}
            disabled={updateMetaMut.isPending}
            sx={{ borderRadius: 2, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, minWidth: 120 }}>
            {updateMetaMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
