import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, alpha, InputBase } from '@mui/material';
import {
  StorefrontOutlined, BarChartOutlined, PhoneIphoneOutlined,
  ChatBubbleOutlineRounded, CheckCircle, ArrowForward, LockOutlined,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

const ORANGE = '#FF6B00';
const PURPLE = '#8B5CF6';

function Field({
  label, value, onChange, placeholder, type = 'text', multiline, rows, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; multiline?: boolean; rows?: number; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Box>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, mb: 0.75, letterSpacing: '0.4px',
        color: focused ? alpha(ORANGE, 0.85) : '#64748B', transition: 'color 0.2s' }}>
        {label}{required && <Box component="span" sx={{ color: ORANGE, ml: 0.3 }}>*</Box>}
      </Typography>
      <Box sx={{
        display: 'flex', alignItems: multiline ? 'flex-start' : 'center',
        px: 1.5, pt: multiline ? 1.5 : 0, pb: multiline ? 1.5 : 0,
        minHeight: multiline ? undefined : 48,
        bgcolor: focused ? '#FFFFFF' : '#F7F8FA',
        border: `1.5px solid ${focused ? ORANGE : 'rgba(15,23,42,0.09)'}`,
        borderRadius: '14px',
        boxShadow: focused ? `0 0 0 3px ${alpha(ORANGE, 0.12)}` : 'none',
        transition: 'all 0.22s',
      }}>
        <InputBase
          value={value}
          onChange={e => onChange(e.target.value)}
          type={type}
          placeholder={placeholder}
          multiline={multiline}
          rows={rows}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          sx={{
            flex: 1,
            '& input, & textarea': {
              color: '#0F172A', fontSize: 14, fontWeight: 500, p: 0, lineHeight: '24px',
              '&::placeholder': { color: '#64748B', opacity: 1 },
            },
          }}
        />
      </Box>
    </Box>
  );
}

const PERKS = [
  { Icon: StorefrontOutlined,       title: 'Boutique en ligne',         sub: 'Publiez vos produits en quelques minutes.' },
  { Icon: ChatBubbleOutlineRounded, title: 'Chat avec vos clients',      sub: 'Répondez, négociez, concluez en temps réel.' },
  { Icon: BarChartOutlined,         title: 'Dashboard des ventes',       sub: 'Suivez vos revenus et commandes.' },
  { Icon: PhoneIphoneOutlined,      title: 'Paiements MonCash & NatCash',sub: "L'argent arrive directement sur votre téléphone." },
];

export default function BecomeSellerPage() {
  const navigate = useNavigate();
  const { user, setUser, refreshProfile, updateUser } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading]         = useState(false);
  const [syncing, setSyncing]         = useState(false);
  const [storeName, setStoreName]     = useState('');
  const [storeDesc, setStoreDesc]     = useState('');
  const [nif, setNif]                 = useState('');
  const [error, setError]             = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) { setError('Le nom de boutique est requis'); return; }
    setLoading(true); setError(''); setSuggestions([]);
    try {
      const { data } = await api.post('/sellers/become', {
        storeName: storeName.trim(),
        storeDescription: storeDesc.trim() || undefined,
        nif: nif.trim() || undefined,
      });
      if (data.user) setUser(data.user, localStorage.getItem('accessToken') || '', localStorage.getItem('refreshToken') || '');
      enqueueSnackbar('Votre boutique est créée !', { variant: 'success' });
      navigate('/seller');
    } catch (err: any) {
      const resp = err.response?.data;
      // Backend says already a seller → sync profile and redirect
      if (resp?.message?.includes('déjà un compte vendeur')) {
        setSyncing(true);
        await refreshProfile();
        updateUser({ role: 'SELLER' });
        enqueueSnackbar('Compte vendeur détecté — redirection…', { variant: 'info' });
        navigate('/seller', { replace: true });
        return;
      }
      if (resp?.suggestions?.length) {
        setError(resp.message || 'Ce nom est déjà utilisé.');
        setSuggestions(resp.suggestions);
      } else {
        setError(resp?.message || "Erreur lors de la création de la boutique");
      }
    } finally {
      setLoading(false);
    }
  };

  // If store already knows user is SELLER, redirect immediately
  if (user?.role === 'SELLER') {
    navigate('/seller', { replace: true });
    return null;
  }

  if (syncing) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <CircularProgress sx={{ color: ORANGE }} />
        <Typography sx={{ color: '#64748B', fontSize: 14 }}>Synchronisation du compte…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F7F8FA' }}>

      {/* ── LEFT panel ── */}
      <Box sx={{
        flex: 1, display: { xs: 'none', lg: 'flex' }, flexDirection: 'column', justifyContent: 'center',
        p: { lg: 7, xl: 10 }, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(155deg, rgba(255,107,0,0.08) 0%, rgba(255,107,0,0.02) 50%, #F1F5F9 100%)',
      }}>
        <Box sx={{ position: 'absolute', width: 600, height: 600, top: '-15%', left: '-15%', borderRadius: '50%', pointerEvents: 'none',
          background: `radial-gradient(circle, ${alpha(ORANGE, 0.1)} 0%, transparent 60%)` }} />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 440 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 3.5,
            px: 1.5, py: 0.7, borderRadius: '20px',
            bgcolor: alpha(ORANGE, 0.12), border: `1px solid ${alpha(ORANGE, 0.28)}` }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ORANGE,
              animation: 'pulse 2s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: ORANGE }}>+340 boutiques actives ce mois</Typography>
          </Box>

          <Typography sx={{ fontWeight: 900, fontSize: { lg: 38, xl: 46 }, color: '#0F172A', lineHeight: 1.1, letterSpacing: '-1.5px', mb: 2.5 }}>
            Transformez votre activité<br />en boutique en ligne,<br />
            <Box component="span" sx={{ color: ORANGE }}>dès aujourd'hui.</Box>
          </Typography>

          <Typography sx={{ color: '#475569', fontSize: 15, lineHeight: 1.85, mb: 5 }}>
            Rejoignez des centaines de vendeurs qui développent leur activité sur DealPam — la plus grande marketplace d'Haïti.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 5 }}>
            {PERKS.map(({ Icon, title, sub }) => (
              <Box key={title} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.8 }}>
                <Box sx={{ width: 38, height: 38, borderRadius: '11px', flexShrink: 0,
                  bgcolor: alpha(ORANGE, 0.1), border: `1px solid ${alpha(ORANGE, 0.18)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon sx={{ fontSize: 18, color: ORANGE }} />
                </Box>
                <Box sx={{ pt: 0.2 }}>
                  <Typography sx={{ color: '#0F172A', fontSize: 13.5, fontWeight: 700, lineHeight: 1.35 }}>{title}</Typography>
                  <Typography sx={{ color: '#64748B', fontSize: 12.5, lineHeight: 1.65, mt: 0.25 }}>{sub}</Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Quote */}
          <Box sx={{ p: 2.2, borderRadius: '16px', bgcolor: '#FFFFFF', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
            <Box sx={{ width: 24, height: 2, bgcolor: ORANGE, borderRadius: 1, mb: 1.5, opacity: 0.6 }} />
            <Typography sx={{ fontSize: 13.5, color: '#475569', fontStyle: 'italic', lineHeight: 1.75, mb: 1.5 }}>
              "J'ai mis mes premiers produits un vendredi soir. Le samedi matin j'avais déjà deux commandes."
            </Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>Marie-Claire J.</Typography>
            <Typography sx={{ fontSize: 11.5, color: '#64748B', mt: 0.2 }}>Boutique Mode — Port-au-Prince</Typography>
          </Box>
        </Box>
      </Box>

      {/* ── RIGHT panel ── */}
      <Box sx={{
        width: { xs: '100%', lg: 520 }, flexShrink: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 3, sm: 6 }, py: 5,
        bgcolor: '#FFFFFF',
        borderLeft: '1px solid rgba(15,23,42,0.09)',
        overflowY: 'auto', position: 'relative',
      }}>
        <Box sx={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px',
          background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)`, opacity: 0.5 }} />

        <Box sx={{ maxWidth: 400, width: '100%', mx: 'auto' }}>

          {/* Icon */}
          <Box sx={{ width: 56, height: 56, borderRadius: '16px', mb: 3,
            background: `linear-gradient(135deg, ${alpha(ORANGE, 0.2)}, ${alpha(ORANGE, 0.07)})`,
            border: `1.5px solid ${alpha(ORANGE, 0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 24px ${alpha(ORANGE, 0.2)}` }}>
            <StorefrontOutlined sx={{ fontSize: 28, color: ORANGE }} />
          </Box>

          <Typography sx={{ fontWeight: 900, fontSize: { xs: 22, sm: 26 }, color: '#0F172A', letterSpacing: '-0.6px', mb: 0.6 }}>
            Ouvrir ma boutique
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#64748B', mb: 3.5, lineHeight: 1.7 }}>
            Votre compte acheteur sera converti en compte vendeur. Vos commandes et favoris sont conservés.
          </Typography>

          {/* Free badge */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 4, flexWrap: 'wrap' }}>
            {[
              { icon: <CheckCircle sx={{ fontSize: 14 }} />, label: 'Inscription gratuite' },
              { icon: <CheckCircle sx={{ fontSize: 14 }} />, label: 'Prêt en 5 minutes' },
              { icon: <LockOutlined sx={{ fontSize: 14 }} />, label: 'Données sécurisées' },
            ].map(({ icon, label }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6,
                px: 1.3, py: 0.55, borderRadius: '20px',
                bgcolor: alpha('#10B981', 0.1), border: `1px solid ${alpha('#10B981', 0.25)}` }}>
                <Box sx={{ color: '#34D399', display: 'flex' }}>{icon}</Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#34D399' }}>{label}</Typography>
              </Box>
            ))}
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Field label="Nom de la boutique" required value={storeName} onChange={setStoreName} placeholder="Ex: Tech Store Haïti" />
            <Field label="Description" value={storeDesc} onChange={setStoreDesc} placeholder="Décrivez ce que vous vendez…" multiline rows={3} />
            <Field label="NIF (optionnel)" value={nif} onChange={setNif} placeholder="Numéro d'identification fiscale" />

            {error && (
              <Box>
                <Typography sx={{ fontSize: 12.5, color: '#F87171', px: 0.5, mb: suggestions.length ? 1.2 : 0 }}>{error}</Typography>
                {suggestions.length > 0 && (
                  <Box>
                    <Typography sx={{ fontSize: 11.5, color: '#64748B', mb: 0.8, px: 0.5 }}>
                      Noms disponibles — cliquez pour utiliser :
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.7 }}>
                      {suggestions.map(s => (
                        <Box key={s} onClick={() => { setStoreName(s); setError(''); setSuggestions([]); }} sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          px: 1.5, py: 1, borderRadius: '12px', cursor: 'pointer',
                          border: `1.5px solid ${alpha(ORANGE, 0.2)}`,
                          bgcolor: alpha(ORANGE, 0.05),
                          transition: 'all 0.15s',
                          '&:hover': { bgcolor: alpha(ORANGE, 0.12), borderColor: alpha(ORANGE, 0.45) },
                        }}>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>{s}</Typography>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: ORANGE }}>Utiliser</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            <Button type="submit" fullWidth variant="contained" disabled={loading || !storeName.trim()}
              endIcon={!loading && <ArrowForward />}
              sx={{
                mt: 1, py: 1.55, fontWeight: 800, fontSize: 15, borderRadius: '14px', textTransform: 'none',
                background: `linear-gradient(135deg, ${ORANGE}, #e05e00)`,
                color: 'white',
                boxShadow: `0 8px 24px ${alpha(ORANGE, 0.38)}`,
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 12px 32px ${alpha(ORANGE, 0.5)}` },
                '&:active': { transform: 'translateY(0)' },
                '&.Mui-disabled': { background: alpha(ORANGE, 0.15), color: 'rgba(255,255,255,0.2)' },
                transition: 'all 0.22s',
              }}>
              {loading ? <CircularProgress size={20} sx={{ color: 'rgba(255,255,255,0.5)' }} /> : 'Créer ma boutique'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
