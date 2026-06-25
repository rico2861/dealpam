import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  InputAdornment, IconButton, alpha, LinearProgress, Chip,
} from '@mui/material';
import {
  Visibility, VisibilityOff, ShoppingBag, Store, PersonOutline,
  EmailOutlined, LockOutlined, PhoneOutlined, Storefront,
  ArrowForward, ArrowBack, CheckCircle,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

const STEPS = ['Votre rôle', 'Informations', 'Finalisation'];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: '8 caractères min', ok: password.length >= 8 },
    { label: 'Majuscule', ok: /[A-Z]/.test(password) },
    { label: 'Chiffre', ok: /\d/.test(password) },
    { label: 'Minuscule', ok: /[a-z]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
  const labels = ['Faible', 'Moyen', 'Fort', 'Très fort'];
  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ height: 4, bgcolor: '#E2E8F0', borderRadius: 2, overflow: 'hidden', mb: 1 }}>
        <Box sx={{ height: '100%', width: `${(score / 4) * 100}%`, bgcolor: colors[score - 1] || '#E2E8F0', borderRadius: 2, transition: 'all 0.3s' }} />
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
        {checks.map(({ label, ok }) => (
          <Chip key={label} label={label} size="small" icon={ok ? <CheckCircle sx={{ fontSize: '13px !important', color: `#10B981 !important` }} /> : undefined}
            sx={{ height: 22, fontSize: 11, fontWeight: ok ? 600 : 400,
              bgcolor: ok ? alpha('#10B981', 0.1) : '#F1F5F9',
              color: ok ? '#059669' : 'text.disabled',
              border: `1px solid ${ok ? alpha('#10B981', 0.25) : 'transparent'}`,
            }} />
        ))}
      </Box>
    </Box>
  );
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState(searchParams.get('role') === 'SELLER' ? 'SELLER' : 'CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', storeName: '', storeDescription: '', nif: '' });
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => { if (user) navigate('/', { replace: true }); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/register', { ...form, role });
      setUser(data.user, data.accessToken, data.refreshToken);
      enqueueSnackbar('Compte créé avec succès ! Bienvenue sur Dealpam 🎉', { variant: 'success' });
      if (role === 'SELLER') navigate('/seller/subscription');
      else navigate('/account');
    } catch (e: any) {
      setError(e.response?.data?.message || "Erreur lors de l'inscription");
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return form.firstName.length >= 2 && form.lastName.length >= 2 && form.email.includes('@') && form.password.length >= 8;
    return true;
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#F8FAFC' }}>

      {/* ── Left decorative panel ── */}
      <Box sx={{
        flex: 1, display: { xs: 'none', lg: 'flex' }, flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #0A1628 0%, #0F2560 50%, #1D4ED8 100%)',
        position: 'relative', overflow: 'hidden', p: 7,
      }}>
        <Box sx={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 65%)', top: '-10%', left: '-10%', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 65%)', bottom: '-5%', right: '-5%', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 400 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'center', mb: 5 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 3, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 24 }}>D</Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 26, color: 'white', letterSpacing: '-0.5px' }}>
              deal<span style={{ color: '#93C5FD' }}>pam</span>
            </Typography>
          </Box>

          <Typography variant="h2" fontWeight={900} color="white" sx={{ letterSpacing: '-2px', lineHeight: 1.1, mb: 2.5, fontSize: { lg: 38 } }}>
            Rejoignez<br /><span style={{ color: '#93C5FD' }}>100 000+</span><br />membres
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 15.5, lineHeight: 1.8, mb: 5 }}>
            Achetez ou vendez facilement sur la plus grande marketplace d'Haïti.
          </Typography>

          {/* Role benefits */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {role === 'SELLER' ? [
              '✦ Boutique en ligne professionnelle',
              '✦ Accès à 100 000+ acheteurs potentiels',
              '✦ Tableau de bord avec analytics',
              '✦ Paiements via MonCash & NatCash',
            ] : [
              '✦ Accès à 50 000+ produits',
              '✦ Vendeurs vérifiés et produits authentiques',
              '✦ Suivi de commandes en temps réel',
              '✦ Paiement sécurisé garanti',
            ].map(item => (
              <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 14.5, textAlign: 'left' }}>{item}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── Right — form panel ── */}
      <Box sx={{
        width: { xs: '100%', lg: 540 }, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        px: { xs: 3, sm: 5, md: 6 }, py: 5, bgcolor: 'white',
        boxShadow: { lg: '-20px 0 60px rgba(0,0,0,0.08)' }, overflowY: 'auto',
      }}>
        <Box sx={{ width: '100%', maxWidth: 430 }}>

          {/* Mobile logo */}
          <Box sx={{ display: { lg: 'none' }, textAlign: 'center', mb: 4 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 3, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5, boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}>
              <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 24 }}>D</Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 21 }}>deal<span style={{ color: '#2563EB' }}>pam</span></Typography>
          </Box>

          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.8px', mb: 0.8 }}>Créer un compte</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
            Déjà membre ?{' '}
            <Link to="/login" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>Se connecter →</Link>
          </Typography>

          {/* Step progress */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              {STEPS.map((label, i) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Box sx={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: i < step ? '#10B981' : i === step ? 'primary.main' : '#E2E8F0',
                    transition: 'all 0.25s',
                  }}>
                    {i < step
                      ? <CheckCircle sx={{ fontSize: 16, color: 'white' }} />
                      : <Typography sx={{ color: i === step ? 'white' : '#94A3B8', fontSize: 11, fontWeight: 700 }}>{i + 1}</Typography>
                    }
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: i === step ? 700 : 400, color: i === step ? 'text.primary' : 'text.secondary', display: { xs: 'none', sm: 'block' }, fontSize: 12 }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
            <LinearProgress variant="determinate" value={(step / (STEPS.length - 1)) * 100}
              sx={{ height: 4, borderRadius: 2, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { borderRadius: 2, background: 'linear-gradient(90deg, #2563EB, #4F46E5)' } }} />
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }} onClose={() => setError('')}>{error}</Alert>}

          {/* ── Step 0: Role ── */}
          {step === 0 && (
            <Box>
              <Typography fontWeight={700} fontSize={15} mb={2} color="text.secondary">
                Je veux…
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 4 }}>
                {[
                  { value: 'CUSTOMER', label: 'Acheter', sublabel: 'Parcourir des produits', Icon: ShoppingBag, color: '#2563EB' },
                  { value: 'SELLER', label: 'Vendre', sublabel: 'Créer ma boutique', Icon: Store, color: '#8B5CF6' },
                ].map(({ value, label, sublabel, Icon, color }) => (
                  <Box key={value} onClick={() => setRole(value)}
                    sx={{
                      p: 2.5, textAlign: 'center', cursor: 'pointer', borderRadius: 3,
                      border: '2px solid', borderColor: role === value ? color : 'rgba(0,0,0,0.09)',
                      bgcolor: role === value ? alpha(color, 0.05) : 'white',
                      transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                      '&:hover': { borderColor: color, bgcolor: alpha(color, 0.04), transform: 'translateY(-2px)' },
                      boxShadow: role === value ? `0 8px 24px ${alpha(color, 0.2)}` : 'none',
                    }}>
                    {role === value && (
                      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                        <CheckCircle sx={{ fontSize: 18, color }} />
                      </Box>
                    )}
                    <Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: alpha(color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                      <Icon sx={{ color, fontSize: 24 }} />
                    </Box>
                    <Typography fontWeight={700} fontSize={15} color={role === value ? color : 'text.primary'}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary" fontSize={12}>{sublabel}</Typography>
                  </Box>
                ))}
              </Box>
              <Button fullWidth variant="contained" onClick={() => setStep(1)} endIcon={<ArrowForward />}
                sx={{ py: 1.6, borderRadius: 2.5, fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 6px 20px rgba(37,99,235,0.35)', '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 8px 28px rgba(37,99,235,0.45)' }, transition: 'all 0.2s' }}>
                Continuer
              </Button>
            </Box>
          )}

          {/* ── Step 1: Personal info ── */}
          {step === 1 && (
            <Box component="form" onSubmit={(e) => { e.preventDefault(); if (canNext()) setStep(2); }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <TextField label="Prénom *" value={form.firstName} onChange={f('firstName')} required autoFocus
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#F8FAFC' } }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ color: 'text.disabled', fontSize: 18 }} /></InputAdornment> }} />
                <TextField label="Nom *" value={form.lastName} onChange={f('lastName')} required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#F8FAFC' } }} />
              </Box>
              <TextField fullWidth label="Email *" type="email" value={form.email} onChange={f('email')} required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#F8FAFC' } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined sx={{ color: 'text.disabled', fontSize: 18 }} /></InputAdornment> }} />
              <TextField fullWidth label="Téléphone (+509)" value={form.phone} onChange={f('phone')} placeholder="+509 XXXX-XXXX"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#F8FAFC' } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><PhoneOutlined sx={{ color: 'text.disabled', fontSize: 18 }} /></InputAdornment> }} />
              <Box>
                <TextField fullWidth label="Mot de passe *" type={showPwd ? 'text' : 'password'} value={form.password} onChange={f('password')} required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#F8FAFC' } }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockOutlined sx={{ color: 'text.disabled', fontSize: 18 }} /></InputAdornment>,
                    endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small" tabIndex={-1}>{showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>,
                  }} />
                <PasswordStrength password={form.password} />
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                <Button onClick={() => setStep(0)} startIcon={<ArrowBack />} variant="outlined"
                  sx={{ flex: 1, borderRadius: 2.5, borderColor: 'rgba(0,0,0,0.12)', color: 'text.secondary', py: 1.4 }}>
                  Retour
                </Button>
                <Button type="submit" variant="contained" endIcon={<ArrowForward />} disabled={!canNext()}
                  sx={{ flex: 2, borderRadius: 2.5, py: 1.4, fontWeight: 700, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 6px 20px rgba(37,99,235,0.3)', '&:hover': { transform: 'translateY(-1px)' }, transition: 'all 0.2s' }}>
                  Continuer
                </Button>
              </Box>
            </Box>
          )}

          {/* ── Step 2: Finalize ── */}
          {step === 2 && (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {role === 'SELLER' ? (
                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: alpha('#2563EB', 0.04), border: `1.5px solid ${alpha('#2563EB', 0.15)}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Storefront sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography fontWeight={700} color="primary.main" fontSize={14.5}>Informations de votre boutique</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField fullWidth label="Nom de la boutique *" value={form.storeName} onChange={f('storeName')} required
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'white' } }} />
                    <TextField fullWidth label="Description (optionnel)" value={form.storeDescription} onChange={f('storeDescription')} multiline rows={2}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'white' } }} />
                    <TextField fullWidth label="NIF (optionnel)" value={form.nif} onChange={f('nif')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'white' } }} />
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 3, borderRadius: 3, bgcolor: alpha('#10B981', 0.05), border: `1.5px solid ${alpha('#10B981', 0.2)}`, textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 40, color: '#10B981', mb: 1 }} />
                  <Typography fontWeight={700} fontSize={15} mb={0.5}>Tout est prêt !</Typography>
                  <Typography variant="body2" color="text.secondary">Cliquez sur "Créer mon compte" pour rejoindre Dealpam.</Typography>
                </Box>
              )}

              {/* Summary */}
              <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>Récapitulatif</Typography>
                <Typography fontSize={13.5}><strong>{form.firstName} {form.lastName}</strong> · {form.email}</Typography>
                <Chip label={role === 'SELLER' ? 'Vendeur' : 'Acheteur'} size="small" sx={{ mt: 0.5, height: 20, fontSize: 11, fontWeight: 600, bgcolor: role === 'SELLER' ? alpha('#8B5CF6', 0.1) : alpha('#2563EB', 0.1), color: role === 'SELLER' ? '#7C3AED' : '#1D4ED8' }} />
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                <Button onClick={() => setStep(1)} startIcon={<ArrowBack />} variant="outlined"
                  sx={{ flex: 1, borderRadius: 2.5, borderColor: 'rgba(0,0,0,0.12)', color: 'text.secondary', py: 1.4 }}>
                  Retour
                </Button>
                <Button type="submit" variant="contained" disabled={loading}
                  sx={{ flex: 2, borderRadius: 2.5, py: 1.4, fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 6px 20px rgba(37,99,235,0.3)', '&:hover': { transform: 'translateY(-1px)' }, transition: 'all 0.2s' }}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Créer mon compte'}
                </Button>
              </Box>
            </Box>
          )}

          <Typography variant="caption" color="text.disabled" textAlign="center" display="block" mt={3} lineHeight={1.6}>
            En créant un compte, vous acceptez nos{' '}
            <Link to="/terms" style={{ color: '#94A3B8', textDecoration: 'none' }}>CGU</Link> et notre{' '}
            <Link to="/privacy" style={{ color: '#94A3B8', textDecoration: 'none' }}>Politique de confidentialité</Link>.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
