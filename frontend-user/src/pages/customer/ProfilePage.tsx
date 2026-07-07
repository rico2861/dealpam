import { useState } from 'react';
import { Box, Typography, Avatar, IconButton, CircularProgress, InputBase, alpha } from '@mui/material';
import {
  EditRounded, SaveRounded, CloseRounded, PersonOutlined,
  EmailOutlined, PhoneOutlined, LocationOnOutlined, LogoutRounded,
  ShoppingBagOutlined, FavoriteBorderOutlined, ArrowForward,
  LockOutlined, StorefrontOutlined, AdminPanelSettingsOutlined,
  CheckCircleOutlined, CameraAltOutlined,
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { useLocationStore } from '../../store/location.store';

const ORANGE = '#FF6B00';
const GREEN  = '#10B981';
const BLUE   = '#3B82F6';
const PURPLE = '#8B5CF6';
const PINK   = '#EC4899';

const ROLE_META: Record<string, { label: string; color: string; Icon: any }> = {
  BUYER:       { label: 'Acheteur',    color: BLUE,   Icon: PersonOutlined },
  SELLER:      { label: 'Vendeur',     color: ORANGE, Icon: StorefrontOutlined },
  ADMIN:       { label: 'Admin',       color: PURPLE, Icon: AdminPanelSettingsOutlined },
  SUPER_ADMIN: { label: 'Super Admin', color: PINK,   Icon: AdminPanelSettingsOutlined },
  MODERATOR:   { label: 'Modérateur',  color: GREEN,  Icon: AdminPanelSettingsOutlined },
};

function Field({ label, value, onChange, Icon, placeholder, disabled }: {
  label: string; value: string; onChange?: (v: string) => void;
  Icon: any; placeholder?: string; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Box>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, mb: 0.6, letterSpacing: '0.5px', textTransform: 'uppercase',
        color: focused ? alpha(ORANGE, 0.9) : '#64748B', transition: 'color 0.2s' }}>
        {label}
      </Typography>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.2, px: 1.5, minHeight: 48,
        bgcolor: disabled ? '#F1F5F9' : (focused ? '#FFFFFF' : '#F7F8FA'),
        border: `1.5px solid ${disabled ? 'rgba(15,23,42,0.12)' : (focused ? ORANGE : 'rgba(15,23,42,0.09)')}`,
        borderRadius: '14px',
        boxShadow: focused ? `0 0 0 3px ${alpha(ORANGE, 0.1)}` : 'none',
        transition: 'all 0.2s',
      }}>
        <Icon sx={{ fontSize: 17, color: focused ? ORANGE : '#64748B', flexShrink: 0, transition: 'color 0.2s' }} />
        <InputBase
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          sx={{ flex: 1, '& input': {
            color: disabled ? '#64748B' : '#0F172A',
            fontSize: 14, fontWeight: 500, p: 0,
            '&::placeholder': { color: '#64748B', opacity: 1 },
          }}}
        />
      </Box>
    </Box>
  );
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuthStore();
  const { location: userLocation } = useLocationStore();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    phone:     (user as any)?.phone ?? '',
  });

  const { data: ordersCount } = useQuery({
    queryKey: ['my-orders-count'],
    queryFn: () => api.get('/orders/me').then(r => Array.isArray(r.data) ? r.data.length : 0).catch(() => 0),
    enabled: !!user,
  });
  const { data: wishCount } = useQuery({
    queryKey: ['wishlist-count'],
    queryFn: () => api.get('/wishlist').then(r => Array.isArray(r.data) ? r.data.length : (r.data?.items?.length ?? 0)).catch(() => 0),
    enabled: !!user,
  });

  if (!user) { navigate('/login'); return null; }

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  const roleMeta = ROLE_META[user.role] ?? ROLE_META.BUYER;
  const RoleIcon = roleMeta.Icon;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me', form);
      updateUser({ firstName: form.firstName, lastName: form.lastName });
      enqueueSnackbar('Profil mis à jour', { variant: 'success' });
      setEditing(false);
    } catch {
      enqueueSnackbar('Erreur lors de la mise à jour', { variant: 'error' });
    } finally { setSaving(false); }
  };

  const quickLinks = [
    { Icon: ShoppingBagOutlined,   label: 'Mes commandes',  sub: 'Suivre vos achats',       to: '/account/orders',   color: ORANGE },
    { Icon: FavoriteBorderOutlined,label: 'Mes favoris',    sub: 'Articles sauvegardés',    to: '/account/wishlist', color: PURPLE },
    { Icon: LockOutlined,          label: 'Sécurité',       sub: 'Changer le mot de passe', to: '/forgot-password',  color: BLUE   },
    ...(user.role === 'SELLER' ? [{ Icon: StorefrontOutlined, label: 'Ma boutique', sub: 'Gérer mon espace vendeur', to: '/seller', color: ORANGE }] : []),
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F7F8FA' }}>

      {/* ── Top banner ── */}
      <Box sx={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, rgba(255,107,0,0.08) 0%, rgba(255,107,0,0.02) 60%, #F7F8FA 100%)',
        pt: { xs: 3, sm: 4 }, pb: { xs: 9, sm: 11 },
        px: { xs: 2, sm: 4 },
      }}>
        {/* Glows */}
        <Box sx={{ position: 'absolute', width: 500, height: 500, top: '-30%', right: '-10%', borderRadius: '50%', pointerEvents: 'none',
          background: `radial-gradient(circle, ${alpha(ORANGE, 0.07)} 0%, transparent 60%)` }} />
        {/* Top orange accent */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: `linear-gradient(90deg, transparent 10%, ${ORANGE} 50%, transparent 90%)`, opacity: 0.45 }} />

        <Box sx={{ maxWidth: 680, mx: 'auto', position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: 18, sm: 22 }, color: '#0F172A', letterSpacing: '-0.4px' }}>
            Mon profil
          </Typography>
          <Box onClick={() => { logout(); navigate('/home'); }} sx={{
            display: 'flex', alignItems: 'center', gap: 0.8, cursor: 'pointer',
            px: 1.5, py: 0.8, borderRadius: '12px',
            border: '1px solid rgba(239,68,68,0.2)', bgcolor: 'rgba(239,68,68,0.06)',
            transition: 'all 0.18s',
            '&:hover': { bgcolor: 'rgba(239,68,68,0.13)', borderColor: 'rgba(239,68,68,0.4)' },
          }}>
            <LogoutRounded sx={{ fontSize: 15, color: '#EF4444' }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>Déconnexion</Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Content ── */}
      <Box sx={{ maxWidth: 680, mx: 'auto', px: { xs: 2, sm: 3 }, mt: { xs: '-64px', sm: '-72px' }, pb: 6, position: 'relative', zIndex: 2 }}>

        {/* ── Avatar card ── */}
        <Box sx={{
          borderRadius: '24px', overflow: 'hidden', mb: 2,
          background: '#FFFFFF',
          border: '1px solid rgba(15,23,42,0.09)',
          boxShadow: '0 8px 32px rgba(15,23,42,0.08)',
        }}>
          {/* Colored top strip */}
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${roleMeta.color}, ${alpha(roleMeta.color, 0.3)})` }} />

          <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 2, sm: 2.5 }, flexWrap: 'wrap' }}>

              {/* Avatar */}
              <Box sx={{ position: 'relative', flexShrink: 0 }}>
                <Avatar sx={{
                  width: { xs: 72, sm: 84 }, height: { xs: 72, sm: 84 },
                  bgcolor: ORANGE, fontSize: { xs: 26, sm: 30 }, fontWeight: 900, color: 'white',
                  border: `3px solid ${alpha(ORANGE, 0.3)}`,
                  boxShadow: `0 8px 28px ${alpha(ORANGE, 0.4)}`,
                }}>
                  {initials || <PersonOutlined />}
                </Avatar>
                {/* Online dot */}
                <Box sx={{ position: 'absolute', bottom: 2, right: 2,
                  width: 16, height: 16, borderRadius: '50%',
                  bgcolor: GREEN, border: '2.5px solid #FFFFFF',
                  boxShadow: `0 0 8px ${alpha(GREEN, 0.6)}` }} />
                {/* Camera overlay */}
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0)', transition: 'bgcolor 0.2s',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.45)', '& .cam-icon': { opacity: 1 } },
                }}>
                  <CameraAltOutlined className="cam-icon" sx={{ fontSize: 20, color: 'white', opacity: 0, transition: 'opacity 0.2s' }} />
                </Box>
              </Box>

              {/* Info */}
              <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, sm: 24 }, color: '#0F172A', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                    {user.firstName} {user.lastName}
                  </Typography>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6,
                    px: 1.2, py: 0.35, borderRadius: '20px',
                    bgcolor: alpha(roleMeta.color, 0.12), border: `1px solid ${alpha(roleMeta.color, 0.28)}` }}>
                    <RoleIcon sx={{ fontSize: 11, color: roleMeta.color }} />
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: roleMeta.color, letterSpacing: '0.3px' }}>
                      {roleMeta.label}
                    </Typography>
                  </Box>
                </Box>
                <Typography noWrap sx={{ fontSize: 13, color: '#64748B', mb: 1.5 }}>{user.email}</Typography>

                {/* Stats row */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {[
                    { label: 'Commandes', value: ordersCount ?? '—', color: ORANGE, to: '/account/orders' },
                    { label: 'Favoris',   value: wishCount   ?? '—', color: PURPLE, to: '/account/wishlist' },
                  ].map(({ label, value, color, to }) => (
                    <Box key={label} component={Link} to={to} sx={{
                      textDecoration: 'none', px: 1.8, py: 1, borderRadius: '12px',
                      bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.18)}`,
                      transition: 'all 0.18s',
                      '&:hover': { bgcolor: alpha(color, 0.15), borderColor: alpha(color, 0.35) },
                    }}>
                      <Typography sx={{ fontWeight: 900, fontSize: 18, color: '#0F172A', lineHeight: 1 }}>{value}</Typography>
                      <Typography sx={{ fontSize: 11, color: alpha(color, 0.8), fontWeight: 600, mt: 0.2 }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Informations ── */}
        <Box sx={{
          borderRadius: '20px', mb: 2, overflow: 'hidden',
          background: '#FFFFFF',
          border: '1px solid rgba(15,23,42,0.09)',
          boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
        }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: { xs: 2, sm: 2.5 }, py: 2, borderBottom: '1px solid rgba(15,23,42,0.09)' }}>
            <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: '#0F172A' }}>Informations personnelles</Typography>
            {!editing ? (
              <Box onClick={() => setEditing(true)} sx={{
                display: 'flex', alignItems: 'center', gap: 0.7, cursor: 'pointer',
                px: 1.4, py: 0.7, borderRadius: '10px',
                bgcolor: alpha(ORANGE, 0.09), border: `1px solid ${alpha(ORANGE, 0.2)}`,
                transition: 'all 0.15s', '&:hover': { bgcolor: alpha(ORANGE, 0.16) },
              }}>
                <EditRounded sx={{ fontSize: 14, color: ORANGE }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: ORANGE }}>Modifier</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 0.8 }}>
                <IconButton size="small" onClick={() => setEditing(false)} sx={{
                  bgcolor: '#F1F5F9', color: '#475569',
                  borderRadius: '10px', width: 34, height: 34,
                  '&:hover': { bgcolor: '#E2E8F0' },
                }}>
                  <CloseRounded sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={handleSave} disabled={saving} sx={{
                  bgcolor: ORANGE, color: 'white', borderRadius: '10px', width: 34, height: 34,
                  boxShadow: `0 4px 14px ${alpha(ORANGE, 0.4)}`,
                  '&:hover': { bgcolor: '#e05e00' },
                  '&.Mui-disabled': { bgcolor: alpha(ORANGE, 0.25), color: 'rgba(255,255,255,0.6)' },
                }}>
                  {saving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <SaveRounded sx={{ fontSize: 16 }} />}
                </IconButton>
              </Box>
            )}
          </Box>

          {/* Fields */}
          <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2.5 }}>
            {editing ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Field label="Prénom" value={form.firstName} onChange={v => setForm(f => ({ ...f, firstName: v }))} Icon={PersonOutlined} />
                  <Field label="Nom" value={form.lastName} onChange={v => setForm(f => ({ ...f, lastName: v }))} Icon={PersonOutlined} />
                </Box>
                <Field label="Téléphone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} Icon={PhoneOutlined} placeholder="+509 XXXX XXXX" />
                <Field label="Email" value={user.email} Icon={EmailOutlined} disabled />
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0 }}>
                {[
                  { Icon: PersonOutlined,     label: 'Prénom',      value: user.firstName,                                                hint: false },
                  { Icon: PersonOutlined,     label: 'Nom',         value: user.lastName,                                                 hint: false },
                  { Icon: EmailOutlined,      label: 'Email',       value: user.email,                                                    hint: false },
                  { Icon: PhoneOutlined,      label: 'Téléphone',   value: (user as any).phone || 'Non renseigné',                        hint: false },
                  { Icon: LocationOnOutlined, label: 'Ville',       value: userLocation?.city || user.city || '—',                        hint: true  },
                  { Icon: LocationOnOutlined, label: 'Département', value: userLocation?.department || user.department || '—',             hint: true  },
                ].map(({ Icon, label, value, hint }, i) => (
                  <Box key={label} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    py: 1.6, px: 0.5,
                    borderBottom: '1px solid rgba(15,23,42,0.06)',
                    '&:last-child': { borderBottom: 'none' },
                    '&:nth-of-type(odd)': { pr: { sm: 2 } },
                    '&:nth-of-type(even)': { pl: { sm: 2 }, borderLeft: { sm: '1px solid rgba(15,23,42,0.07)' } },
                  }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
                      bgcolor: '#F7F8FA', border: '1px solid rgba(15,23,42,0.09)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon sx={{ fontSize: 16, color: '#64748B' }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 10.5, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {label}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 600, color: '#475569', mt: 0.1 }}>
                        {value}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Quick links ── */}
        <Box sx={{
          borderRadius: '20px',
          background: '#FFFFFF',
          border: '1px solid rgba(15,23,42,0.09)',
          boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
          overflow: 'hidden',
        }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: '#0F172A',
            px: { xs: 2, sm: 2.5 }, py: 2, borderBottom: '1px solid rgba(15,23,42,0.09)' }}>
            Accès rapide
          </Typography>
          <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
            {quickLinks.map(({ Icon, label, sub, to, color }) => (
              <Box key={to} component={Link} to={to} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: { xs: 1.5, sm: 1.8 }, borderRadius: '14px', textDecoration: 'none',
                border: '1px solid rgba(15,23,42,0.07)',
                bgcolor: '#F7F8FA',
                transition: 'all 0.18s',
                '&:hover': {
                  bgcolor: alpha(color, 0.08),
                  borderColor: alpha(color, 0.25),
                  transform: 'translateY(-1px)',
                  '& .ql-arrow': { color, transform: 'translateX(3px)' },
                  '& .ql-icon': { color },
                },
              }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                  bgcolor: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.18)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon className="ql-icon" sx={{ fontSize: 19, color: alpha(color, 0.8), transition: 'color 0.18s' }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{label}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: '#64748B', mt: 0.15 }}>{sub}</Typography>
                </Box>
                <ArrowForward className="ql-arrow" sx={{ fontSize: 15, color: '#CBD5E1', transition: 'all 0.18s', flexShrink: 0 }} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Member since ── */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 11.5, color: '#CBD5E1' }}>
            Membre depuis {new Date((user as any).createdAt ?? Date.now()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </Typography>
        </Box>

      </Box>
    </Box>
  );
}
