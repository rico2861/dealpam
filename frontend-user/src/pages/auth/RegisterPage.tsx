import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Button, Alert, CircularProgress,
  InputAdornment, IconButton, alpha, Chip, InputBase,
} from '@mui/material';
import {
  Visibility, VisibilityOff, ShoppingBag, Store, PersonOutline,
  EmailOutlined, LockOutlined, PhoneOutlined, Storefront,
  ArrowForward, ArrowBack, CheckCircle, AlternateEmail,
  ErrorOutline, Inventory2Outlined, ChatBubbleOutlineRounded,
  BarChartRounded, PhoneIphoneOutlined, SearchRounded,
  VerifiedOutlined, LocationOnOutlined, TrendingUpRounded,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

const ORANGE  = '#FF6B00';
const PURPLE  = '#8B5CF6';
// Validation email plus stricte que ".includes('@')" — refuse au moins les
// formats grossierement invalides ("a@b", "test@", "@test.com"...).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STEPS   = ['Rôle', 'Informations', 'Finalisation'];

/* ── Password rules ── */
export const PASSWORD_RULES = [
  { label: '8 car. min',               ok: (p: string) => p.length >= 8 },
  { label: 'Minuscule',                ok: (p: string) => /[a-z]/.test(p) },
  { label: 'Majuscule',                ok: (p: string) => /[A-Z]/.test(p) },
  { label: 'Chiffre',                  ok: (p: string) => /\d/.test(p) },
  { label: 'Caractère spécial (!@#…)', ok: (p: string) => /[!@#$%^&*()\-_=+[\]{}|;:,.<>?/\\~`"']/.test(p) },
];

export function isPasswordValid(p: string) { return PASSWORD_RULES.every(r => r.ok(p)); }

const STRENGTH_COLORS = ['#EF4444', '#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#10B981'];
const STRENGTH_LABELS = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];

/* ── Custom Field (label above, glass input, no floating MUI label) ── */
interface FieldProps {
  label?: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  hint?: string;
  badge?: React.ReactNode;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  status?: 'idle' | 'checking' | 'ok' | 'taken';
  autoFocus?: boolean;
  multiline?: boolean;
  rows?: number;
  accentColor?: string;
}

function Field({
  label, required, type = 'text', value, onChange, placeholder,
  hint, badge, startIcon, endIcon, status = 'idle',
  autoFocus, multiline, rows, accentColor = ORANGE,
}: FieldProps) {
  const [focused, setFocused] = useState(false);

  const borderColor =
    status === 'ok'    ? '#34D399' :
    status === 'taken' ? '#F87171' :
    focused            ? accentColor :
    'rgba(15,23,42,0.12)';

  const glow =
    status === 'ok'    ? '0 0 0 3px rgba(52,211,153,0.12)' :
    status === 'taken' ? '0 0 0 3px rgba(248,113,113,0.12)' :
    focused            ? `0 0 0 3px ${alpha(accentColor, 0.12)}` : 'none';

  return (
    <Box>
      {label && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: focused ? alpha(accentColor, 0.85) : '#64748B', letterSpacing: '0.5px', transition: 'color 0.2s', userSelect: 'none' }}>
            {label}{required && <Box component="span" sx={{ color: accentColor, ml: 0.3 }}>*</Box>}
          </Typography>
          {badge}
        </Box>
      )}
      <Box sx={{
        display: 'flex', alignItems: multiline ? 'flex-start' : 'center',
        gap: 1.2, px: 1.5,
        pt: multiline ? 1.5 : 0,
        pb: multiline ? 1.5 : 0,
        minHeight: multiline ? undefined : 48,
        bgcolor: focused ? '#FFFFFF' : '#F7F8FA',
        border: `1.5px solid ${borderColor}`,
        borderRadius: '14px',
        transition: 'all 0.22s ease',
        boxShadow: glow,
        cursor: 'text',
      }}>
        {startIcon && (
          <Box sx={{ color: focused ? alpha(accentColor, 0.7) : '#64748B', flexShrink: 0, display: 'flex', mt: multiline ? 0.3 : 0, transition: 'color 0.2s' }}>
            {startIcon}
          </Box>
        )}
        <InputBase
          value={value}
          onChange={onChange}
          type={type}
          placeholder={placeholder}
          autoFocus={autoFocus}
          multiline={multiline}
          rows={rows}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          sx={{
            flex: 1,
            '& input, & textarea': {
              color: '#0F172A !important', WebkitTextFillColor: '#0F172A', fontSize: 14, fontWeight: 500,
              p: 0, lineHeight: '24px', caretColor: '#0F172A',
              // Italique : un exemple placeholder ("Marie", "Ma Super Boutique"…) ressemble
              // à une vraie réponse déjà saisie une fois affiché en texte droit normal — des
              // vendeurs ont cru que le champ était pré-rempli et n'y ont pas retapé leur
              // propre valeur. L'italique lève toute ambiguïté visuelle avec le texte réel.
              '&::placeholder': { color: '#64748B', opacity: 1, fontStyle: 'italic' },
              '&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus': {
                WebkitBoxShadow: '0 0 0 100px #FFFFFF inset',
                WebkitTextFillColor: '#0F172A',
                caretColor: '#0F172A',
                transition: 'background-color 9999s ease-in-out 0s',
              },
            },
          }}
        />
        {endIcon && <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{endIcon}</Box>}
      </Box>
      {hint && (
        <Typography sx={{ fontSize: 11.5, mt: 0.6, px: 0.5, lineHeight: 1.5, color: '#64748B' }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}

/* ── Status adornment ── */
function StatusIcon({ status }: { status: 'idle'|'checking'|'ok'|'taken' }) {
  if (status === 'checking') return <CircularProgress size={14} sx={{ color: '#64748B' }} />;
  if (status === 'ok')       return <CheckCircle sx={{ fontSize: 17, color: '#34D399' }} />;
  if (status === 'taken')    return <ErrorOutline sx={{ fontSize: 17, color: '#F87171' }} />;
  return null;
}

/* ── Step bar (top of right panel, all breakpoints) ── */
function StepBar({ step, accent }: { step: number; accent: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, position: 'relative' }}>
      {STEPS.map((label, i) => {
        const done    = i < step;
        const current = i === step;
        const color   = done ? '#10B981' : current ? accent : 'rgba(15,23,42,0.18)';
        return (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.7 }}>
              <Box sx={{
                width: current ? 34 : 28, height: current ? 34 : 28,
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
                bgcolor: done ? '#10B981' : current ? accent : '#F1F5F9',
                border: `2px solid ${color}`,
                boxShadow: current ? `0 0 0 4px ${alpha(accent, 0.18)}, 0 4px 16px ${alpha(accent, 0.3)}` : 'none',
              }}>
                {done
                  ? <CheckCircle sx={{ fontSize: 15, color: 'white' }} />
                  : <Typography sx={{ fontSize: current ? 13 : 11, fontWeight: 900, color: current ? 'white' : '#64748B', lineHeight: 1 }}>{i + 1}</Typography>
                }
              </Box>
              <Typography sx={{
                fontSize: 10.5, fontWeight: current ? 800 : 500, lineHeight: 1,
                color: current ? '#0F172A' : done ? '#10B981' : '#64748B',
                transition: 'color 0.3s', whiteSpace: 'nowrap',
              }}>
                {label}
              </Typography>
            </Box>
            {i < STEPS.length - 1 && (
              <Box sx={{
                flex: 1, height: 2, mx: 1.5, borderRadius: 1,
                bgcolor: i < step ? '#10B981' : 'rgba(15,23,42,0.09)',
                transition: 'background 0.4s',
                mb: 2.5,
              }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/* ── Password strength ── */
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const results = PASSWORD_RULES.map(r => r.ok(password));
  const score   = results.filter(Boolean).length;
  const color   = STRENGTH_COLORS[score] || '#555';
  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box sx={{ flex: 1, height: 3, bgcolor: 'rgba(15,23,42,0.09)', borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: `${(score / PASSWORD_RULES.length) * 100}%`, bgcolor: color, borderRadius: 3, transition: 'all 0.35s ease' }} />
        </Box>
        <Typography fontSize={11} fontWeight={700} color={color} sx={{ minWidth: 55, textAlign: 'right' }}>
          {STRENGTH_LABELS[score]}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
        {PASSWORD_RULES.map(({ label }, i) => {
          const ok = results[i];
          return (
            <Chip key={label} label={label} size="small"
              icon={ok ? <CheckCircle sx={{ fontSize: '11px !important', color: '#10B981 !important' }} /> : undefined}
              sx={{
                height: 20, fontSize: 10, fontWeight: ok ? 700 : 400,
                bgcolor: ok ? alpha('#10B981', 0.15) : 'rgba(15,23,42,0.05)',
                color: ok ? '#059669' : '#64748B',
                border: `1px solid ${ok ? alpha('#10B981', 0.3) : 'transparent'}`,
                transition: 'all 0.2s',
              }} />
          );
        })}
      </Box>
    </Box>
  );
}

function buildSuggestedUsername(first: string, last: string) {
  return `${first}_${last}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_]/g, '').slice(0, 25);
}

/* ── Left panel component ── */
function LeftPanel({ accent, badge, headline, sub, features, quote, stats }: {
  accent: string;
  badge: string;
  headline: React.ReactNode;
  sub: string;
  features: { Icon: React.ElementType; title: string; sub: string }[];
  quote?: { text: string; name: string; store: string };
  stats?: { value: string; label: string }[];
}) {
  return (
    <>
      {/* Live badge */}
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 3.5,
        px: 1.5, py: 0.7, borderRadius: '20px',
        bgcolor: alpha(accent, 0.12), border: `1px solid ${alpha(accent, 0.28)}` }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accent,
          boxShadow: `0 0 7px ${accent}`, animation: 'dp-blink 2s ease-in-out infinite',
          '@keyframes dp-blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: alpha(accent, 0.95), letterSpacing: '0.2px' }}>
          {badge}
        </Typography>
      </Box>

      {/* Headline */}
      <Typography sx={{ fontWeight: 900, fontSize: { lg: 36, xl: 44 }, color: '#0F172A', lineHeight: 1.12, letterSpacing: '-1.5px', mb: 2.5 }}>
        {headline}
      </Typography>

      {/* Sub */}
      <Typography sx={{ color: '#475569', fontSize: 14.5, lineHeight: 1.85, mb: 5 }}>
        {sub}
      </Typography>

      {/* Features */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: quote || stats ? 4.5 : 0 }}>
        {features.map(({ Icon, title, sub: fs }) => (
          <Box key={title} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.8 }}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '11px', flexShrink: 0,
              bgcolor: alpha(accent, 0.1), border: `1px solid ${alpha(accent, 0.18)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon sx={{ fontSize: 18, color: accent }} />
            </Box>
            <Box sx={{ pt: 0.2 }}>
              <Typography sx={{ color: '#0F172A', fontSize: 13.5, fontWeight: 700, lineHeight: 1.35 }}>{title}</Typography>
              <Typography sx={{ color: '#64748B', fontSize: 12.5, lineHeight: 1.65, mt: 0.25 }}>{fs}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Quote */}
      {quote && (
        <Box sx={{ p: 2.2, borderRadius: '16px', bgcolor: '#FFFFFF', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
          <Box sx={{ width: 24, height: 2, bgcolor: accent, borderRadius: 1, mb: 1.5, opacity: 0.6 }} />
          <Typography sx={{ fontSize: 13.5, color: '#475569', fontStyle: 'italic', lineHeight: 1.75, mb: 1.5 }}>
            "{quote.text}"
          </Typography>
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>{quote.name}</Typography>
            <Typography sx={{ fontSize: 11.5, color: '#64748B', mt: 0.2 }}>{quote.store}</Typography>
          </Box>
        </Box>
      )}

      {/* Stats bar */}
      {stats && (
        <Box sx={{ display: 'flex', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(15,23,42,0.09)' }}>
          {stats.map(({ value, label }, i) => (
            <Box key={label} sx={{ flex: 1, py: 2, textAlign: 'center',
              bgcolor: i % 2 === 0 ? '#FFFFFF' : '#F7F8FA',
              borderRight: i < stats.length - 1 ? '1px solid rgba(15,23,42,0.09)' : 'none' }}>
              <Typography sx={{ fontWeight: 900, fontSize: 18, color: accent, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</Typography>
              <Typography sx={{ fontSize: 11, color: '#64748B', mt: 0.5, fontWeight: 500 }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </>
  );
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { user, setUser } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();

  const [step, setStep]   = useState(0);
  const [role, setRole]   = useState(searchParams.get('role') === 'SELLER' ? 'SELLER' : 'CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    username: '', storeName: '', storeDescription: '', nif: '',
  });

  const [emailStatus,    setEmailStatus]    = useState<'idle'|'checking'|'ok'|'taken'>('idle');
  const [usernameStatus, setUsernameStatus] = useState<'idle'|'checking'|'ok'|'taken'>('idle');
  const emailTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkEmail = useCallback((val: string) => {
    if (emailTimer.current) clearTimeout(emailTimer.current);
    if (!val || !val.includes('@') || !val.includes('.')) { setEmailStatus('idle'); return; }
    setEmailStatus('checking');
    emailTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/check-availability?email=${encodeURIComponent(val)}`);
        setEmailStatus(data.emailTaken ? 'taken' : 'ok');
      } catch { setEmailStatus('idle'); }
    }, 600);
  }, []);

  const checkUsername = useCallback((val: string) => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (!val || val.length < 3) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/check-availability?username=${encodeURIComponent(val)}`);
        setUsernameStatus(data.usernameTaken ? 'taken' : 'ok');
      } catch { setUsernameStatus('idle'); }
    }, 600);
  }, []);

  const f = useCallback(
    (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setForm(p => ({ ...p, [k]: val }));
      if (k === 'email') { setEmailStatus('idle'); checkEmail(val); }
      if (k === 'username') checkUsername(val);
    }, [checkEmail, checkUsername],
  );

  useEffect(() => {
    if (!usernameTouched && (form.firstName || form.lastName)) {
      const suggested = buildSuggestedUsername(form.firstName, form.lastName);
      setForm(p => ({ ...p, username: suggested }));
      checkUsername(suggested);
    }
  }, [form.firstName, form.lastName, usernameTouched]);

  // Navigation handled in handleSubmit. LoginGuard blocks access when already authenticated.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailStatus === 'taken' || usernameStatus === 'taken') return;
    setLoading(true); setError('');
    try {
      const payload: any = { ...form, role };
      ['storeName', 'storeDescription', 'nif', 'username'].forEach(k => { if (!payload[k]) delete payload[k]; });
      const { data } = await api.post('/auth/register', payload);
      setUser(data.user, data.accessToken, data.refreshToken);
      if (role === 'SELLER') {
        enqueueSnackbar('Compte créé. Votre essai de 30 jours sur le plan Business a commencé. Complétez votre profil pour faire vérifier votre compte.', { variant: 'success' });
        navigate('/seller/profile');
      } else {
        enqueueSnackbar('Compte créé. Bienvenue sur DealPam.', { variant: 'success' });
        navigate('/account');
      }
    } catch (err: any) {
      const net = !err.response || err.code === 'ERR_NETWORK';
      setError(net ? 'Impossible de joindre le serveur.' :
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : err.response?.data?.message || "Erreur lors de l'inscription"));
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return (
      form.firstName.length >= 2 && form.lastName.length >= 2 &&
      EMAIL_RE.test(form.email) && isPasswordValid(form.password) &&
      form.phone.replace(/\D/g, '').length >= 8 &&
      emailStatus !== 'taken' && emailStatus !== 'checking' &&
      usernameStatus !== 'taken'
    );
    if (step === 2 && role === 'SELLER') return form.storeName.length >= 2;
    return true;
  };

  const accent = role === 'SELLER' ? PURPLE : ORANGE;

  const SELLER_PERKS = ['Boutique en ligne professionnelle', 'Accès à 100 000+ acheteurs', 'Dashboard analytics', 'Paiements MonCash & NatCash'];
  const BUYER_PERKS  = ['50 000+ produits disponibles', 'Vendeurs vérifiés & certifiés', 'Suivi de commande en temps réel', 'Paiement 100 % sécurisé'];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F7F8FA' }}>

      {/* ── LEFT panel ── */}
      <Box sx={{
        flex: 1, display: { xs: 'none', lg: 'flex' }, flexDirection: 'column', justifyContent: 'center',
        p: { lg: 7, xl: 10 }, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(155deg, #FFF4EB 0%, #FFF8F2 40%, #F7F3FE 100%)',
      }}>
        <Box sx={{ position: 'absolute', width: 700, height: 700, top: '-15%', left: '-15%', borderRadius: '50%', pointerEvents: 'none',
          background: `radial-gradient(circle, ${alpha(accent, 0.1)} 0%, transparent 60%)`, transition: 'background 0.5s' }} />
        <Box sx={{ position: 'absolute', width: 400, height: 400, bottom: '-10%', right: '-10%', borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 60%)' }} />
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025,
          backgroundImage: 'linear-gradient(rgba(15,23,42,1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,1) 1px, transparent 1px)',
          backgroundSize: '52px 52px' }} />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 440 }}>

          {role === 'SELLER' ? (
            /* ── SELLER ── */
            <LeftPanel
              accent={PURPLE}
              badge="Essai gratuit de 30 jours sur le plan Business"
              headline={<>Transformez vos produits<br />en revenus stables,<br /><Box component="span" sx={{ color: PURPLE }}>dès aujourd'hui.</Box></>}
              sub="Votre boutique en ligne, vos règles. Commandes, gestion et encaissements — depuis votre téléphone. Plan Business inclus pendant 30 jours."
              features={[
                { Icon: Inventory2Outlined,      title: 'Boutique complète en 5 min',      sub: 'Publiez vos produits avec photos, prix et stock.' },
                { Icon: ChatBubbleOutlineRounded, title: 'Discutez directement avec vos clients', sub: 'Répondez, négociez et concluez en temps réel.' },
                { Icon: BarChartRounded,          title: 'Ventes, revenus, commandes',       sub: 'Votre activité en un coup d\'oeil depuis le dashboard.' },
                { Icon: PhoneIphoneOutlined,      title: 'Encaissez via MonCash & NatCash',  sub: 'Pas de banque requise. L\'argent arrive sur votre téléphone.' },
              ]}
              quote={{ text: "J'ai mis mes premiers produits un vendredi soir. Le samedi matin j'avais déjà deux commandes.", name: 'Marie-Claire J.', store: 'Boutique Mode — Port-au-Prince' }}
            />
          ) : (
            /* ── BUYER ── */
            <LeftPanel
              accent={ORANGE}
              badge="+50 000 produits disponibles maintenant"
              headline={<>Des milliers de vendeurs.<br />Un seul endroit.<br /><Box component="span" sx={{ color: ORANGE }}>Les meilleurs prix.</Box></>}
              sub="Comparez, contactez, commandez — électronique, mode, alimentation, services et bien plus encore."
              features={[
                { Icon: SearchRounded,            title: 'Comparez avant d\'acheter',         sub: 'Voyez les prix de plusieurs vendeurs en quelques secondes.' },
                { Icon: VerifiedOutlined,         title: 'Vendeurs vérifiés par DealPam',     sub: 'Chaque boutique est contrôlée. Vous achetez en sécurité.' },
                { Icon: ChatBubbleOutlineRounded, title: 'Parlez au vendeur avant de payer',  sub: 'Posez vos questions, négociez, confirmez la disponibilité.' },
                { Icon: LocationOnOutlined,       title: 'Partout en Haïti',                  sub: 'Port-au-Prince, Cap-Haïtien, Pétion-Ville et au-delà.' },
              ]}
              stats={[
                { value: '50K+', label: 'Produits' },
                { value: '340+', label: 'Boutiques' },
                { value: '4.7 / 5', label: 'Note moyenne' },
              ]}
            />
          )}
        </Box>
      </Box>

      {/* ── RIGHT panel ── */}
      <Box sx={{
        width: { xs: '100%', lg: 540 }, flexShrink: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 3, sm: 6 }, py: 5,
        bgcolor: '#FFFFFF',
        borderLeft: '1px solid rgba(15,23,42,0.09)',
        overflowY: 'auto', position: 'relative',
      }}>
        {/* Top accent line */}
        <Box sx={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px',
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.5, transition: 'background 0.4s' }} />

        <Box sx={{ maxWidth: 420, width: '100%', mx: 'auto' }}>
          {/* Title */}
          <Typography sx={{ fontWeight: 900, fontSize: { xs: 22, sm: 26 }, color: '#0F172A', letterSpacing: '-0.6px', mb: 0.5 }}>
            Créer un compte
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748B', mb: 3.5 }}>
            Déjà membre ?{' '}
            <Link to="/login" style={{ color: ORANGE, fontWeight: 700, textDecoration: 'none' }}>Se connecter →</Link>
          </Typography>

          {/* Step bar */}
          <StepBar step={step} accent={accent} />

          {error && (
            <Alert severity="error" onClose={() => setError('')}
              sx={{ mb: 3, borderRadius: '12px', bgcolor: alpha('#EF4444', 0.08), color: '#FCA5A5',
                border: '1px solid rgba(239,68,68,0.18)', fontSize: 13, '& .MuiAlert-icon': { color: '#FCA5A5' } }}>
              {error}
            </Alert>
          )}

          {/* ══ Step 0: Role ══ */}
          {step === 0 && (
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', mb: 2 }}>
                Je souhaite…
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 4 }}>
                {[
                  { value: 'CUSTOMER', label: 'Acheter', sub: 'Parcourir des produits', Icon: ShoppingBag, color: ORANGE },
                  { value: 'SELLER',   label: 'Vendre',  sub: 'Créer ma boutique',     Icon: Store,       color: PURPLE },
                ].map(({ value, label, sub, Icon, color }) => {
                  const active = role === value;
                  return (
                    <Box key={value} onClick={() => setRole(value)} sx={{
                      p: 3, textAlign: 'center', cursor: 'pointer', borderRadius: '18px',
                      border: `1.5px solid ${active ? color : 'rgba(15,23,42,0.09)'}`,
                      bgcolor: active ? alpha(color, 0.09) : '#FFFFFF',
                      transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
                      position: 'relative', overflow: 'hidden',
                      boxShadow: active ? `0 8px 28px ${alpha(color, 0.22)}, inset 0 1px 0 ${alpha(color, 0.1)}` : '0 2px 12px rgba(15,23,42,0.05)',
                      '&:hover': { borderColor: alpha(color, 0.55), bgcolor: alpha(color, 0.06), transform: 'translateY(-3px)', boxShadow: `0 12px 32px ${alpha(color, 0.15)}` },
                    }}>
                      {active && (
                        <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
                          <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle sx={{ fontSize: 14, color: 'white' }} />
                          </Box>
                        </Box>
                      )}
                      <Box sx={{ width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 1.8,
                        background: active ? `linear-gradient(135deg, ${alpha(color, 0.25)}, ${alpha(color, 0.1)})` : '#F1F5F9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${active ? alpha(color, 0.3) : 'rgba(15,23,42,0.09)'}`,
                        transition: 'all 0.25s',
                        boxShadow: active ? `0 4px 16px ${alpha(color, 0.2)}` : 'none',
                      }}>
                        <Icon sx={{ color: active ? color : '#64748B', fontSize: 26, transition: 'color 0.25s' }} />
                      </Box>
                      <Typography sx={{ fontWeight: 800, fontSize: 15, color: active ? color : '#475569', transition: 'color 0.25s' }}>
                        {label}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#64748B', mt: 0.4 }}>{sub}</Typography>
                    </Box>
                  );
                })}
              </Box>
              {role === 'SELLER' && (
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, mb: 3,
                  p: 1.8, borderRadius: '14px',
                  bgcolor: alpha(PURPLE, 0.1), border: `1.5px solid ${alpha(PURPLE, 0.3)}`,
                }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#D8B4FE', letterSpacing: '0.3px', flexShrink: 0 }}>
                    ESSAI GRATUIT
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#475569', lineHeight: 1.4 }}>
                    30 jours sur le plan Business, activés automatiquement à la création de votre boutique.
                  </Typography>
                </Box>
              )}
              <Button fullWidth variant="contained" onClick={() => setStep(1)} endIcon={<ArrowForward />}
                sx={submitSx(accent)}>
                Continuer
              </Button>
            </Box>
          )}

          {/* ══ Step 1: Infos ══ */}
          {step === 1 && (
            <Box component="form" onSubmit={e => { e.preventDefault(); if (canNext()) setStep(2); }}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

              {/* Prénom + Nom */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Field label="Prénom" required value={form.firstName} onChange={f('firstName')} placeholder="Ex : Marie" autoFocus
                  accentColor={accent} startIcon={<PersonOutline sx={{ fontSize: 18 }} />} />
                <Field label="Nom" required value={form.lastName} onChange={f('lastName')} placeholder="Ex : Jean"
                  accentColor={accent} />
              </Box>

              {/* Username */}
              <Field
                label="Nom d'utilisateur"
                value={form.username}
                onChange={(e) => { setUsernameTouched(true); f('username')(e); }}
                placeholder="Ex : marie_jean"
                accentColor={accent}
                status={usernameStatus}
                startIcon={<AlternateEmail sx={{ fontSize: 18 }} />}
                endIcon={<StatusIcon status={usernameStatus} />}
                badge={
                  !usernameTouched && form.username ? (
                    <Chip label="Auto-suggéré" size="small" sx={{ height: 17, fontSize: 9, fontWeight: 700,
                      bgcolor: alpha(PURPLE, 0.15), color: '#A78BFA', border: `1px solid ${alpha(PURPLE, 0.25)}` }} />
                  ) : undefined
                }
                hint={
                  usernameStatus === 'taken' ? undefined :
                  usernameStatus === 'ok'    ? undefined :
                  'Se connecter sans email. Auto-généré si vide.'
                }
              />
              {usernameStatus === 'taken' && (
                <Typography sx={{ fontSize: 11.5, color: '#F87171', mt: -1.2, px: 0.5 }}>Ce nom d'utilisateur est déjà pris</Typography>
              )}
              {usernameStatus === 'ok' && (
                <Typography sx={{ fontSize: 11.5, color: '#34D399', mt: -1.2, px: 0.5, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  Disponible <CheckCircle sx={{ fontSize: 13 }} />
                </Typography>
              )}

              {/* Email */}
              <Box>
                <Field
                  label="Email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => f('email')(e)}
                  placeholder="Ex : vous@exemple.com"
                  accentColor={accent}
                  status={emailStatus}
                  startIcon={<EmailOutlined sx={{ fontSize: 18 }} />}
                  endIcon={<StatusIcon status={emailStatus} />}
                />
                {emailStatus === 'taken' && (
                  <Typography sx={{ fontSize: 11.5, color: '#F87171', mt: 0.6, px: 0.5 }}>
                    Un compte existe déjà avec cet email —{' '}
                    <Link to="/login" style={{ color: '#F87171', fontWeight: 700, textDecoration: 'underline' }}>Se connecter ?</Link>
                  </Typography>
                )}
                {emailStatus === 'ok' && (
                  <Typography sx={{ fontSize: 11.5, color: '#34D399', mt: 0.6, px: 0.5, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    Email disponible <CheckCircle sx={{ fontSize: 13 }} />
                  </Typography>
                )}
              </Box>

              {/* Téléphone */}
              <Field label="Téléphone *" value={form.phone} onChange={f('phone')} placeholder="+509 XXXX-XXXX"
                accentColor={accent} startIcon={<PhoneOutlined sx={{ fontSize: 18 }} />} />

              {/* Mot de passe */}
              <Box>
                <Field
                  label="Mot de passe" required
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={f('password')}
                  placeholder="••••••••"
                  accentColor={accent}
                  startIcon={<LockOutlined sx={{ fontSize: 18 }} />}
                  endIcon={
                    <IconButton onClick={() => setShowPwd(!showPwd)} size="small" tabIndex={-1}
                      sx={{ color: '#64748B', p: 0.5, '&:hover': { color: accent, bgcolor: 'transparent' } }}>
                      {showPwd ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                    </IconButton>
                  }
                />
                <PasswordStrength password={form.password} />
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                <Button onClick={() => setStep(0)} startIcon={<ArrowBack sx={{ fontSize: 15 }} />} sx={backSx}>
                  Retour
                </Button>
                <Button type="submit" variant="contained" endIcon={<ArrowForward />} disabled={!canNext()}
                  sx={{ ...submitSx(accent), flex: 2 }}>
                  Continuer
                </Button>
              </Box>
            </Box>
          )}

          {/* ══ Step 2: Finalisation ══ */}
          {step === 2 && (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {role === 'SELLER' ? (
                <Box sx={{ p: 2.5, borderRadius: '16px', bgcolor: alpha(PURPLE, 0.06), border: `1.5px solid ${alpha(PURPLE, 0.18)}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.5 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '11px', background: `linear-gradient(135deg, ${alpha(PURPLE, 0.3)}, ${alpha(PURPLE, 0.1)})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${alpha(PURPLE, 0.25)}` }}>
                      <Storefront sx={{ color: '#A78BFA', fontSize: 19 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: '#7C3AED', fontSize: 14 }}>Votre première boutique</Typography>
                      <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>Visible après inscription</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
                    <Field label="Nom de la boutique" required value={form.storeName} onChange={f('storeName')}
                      placeholder="Ex : Ma Super Boutique" accentColor={PURPLE} />
                    <Field label="Description" value={form.storeDescription} onChange={f('storeDescription') as any}
                      placeholder="Ce que vous vendez…" accentColor={PURPLE} multiline rows={2} />
                    <Field label="NIF (optionnel)" value={form.nif} onChange={f('nif')}
                      placeholder="Numéro d'identification fiscale" accentColor={PURPLE} />
                  </Box>
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1.2, mt: 2, pt: 2,
                    borderTop: `1px solid ${alpha(PURPLE, 0.15)}`,
                  }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#D8B4FE', letterSpacing: '0.3px', flexShrink: 0 }}>
                      ESSAI GRATUIT
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: '#475569', lineHeight: 1.4 }}>
                      30 jours sur le plan Business, sans engagement, dès la création de votre compte.
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 3, borderRadius: '16px', bgcolor: alpha('#10B981', 0.05), border: `1.5px solid ${alpha('#10B981', 0.18)}`, textAlign: 'center' }}>
                  <Box sx={{
                    width: 60, height: 60, borderRadius: '50%', mx: 'auto', mb: 1.5,
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.06))',
                    border: '2px solid rgba(16,185,129,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 28px rgba(16,185,129,0.18)',
                    animation: 'pop-in 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
                    '@keyframes pop-in': { '0%': { transform: 'scale(0.6)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
                  }}>
                    <CheckCircle sx={{ fontSize: 30, color: '#10B981' }} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 15.5, color: '#0F172A', mb: 0.5 }}>Tout est prêt !</Typography>
                  <Typography sx={{ fontSize: 13, color: '#64748B' }}>
                    Cliquez ci-dessous pour rejoindre DealPam.
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button onClick={() => setStep(1)} startIcon={<ArrowBack sx={{ fontSize: 15 }} />} sx={backSx}>
                  Retour
                </Button>
                <Button type="submit" variant="contained" disabled={loading || !canNext()}
                  sx={{ ...submitSx(accent), flex: 2 }}>
                  {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Créer mon compte'}
                </Button>
              </Box>
            </Box>
          )}

          <Typography sx={{ mt: 4, fontSize: 11, color: '#64748B', textAlign: 'center', lineHeight: 1.8 }}>
            En créant un compte, vous acceptez nos{' '}
            <Link to="/terms" style={{ color: '#64748B', textDecoration: 'none' }}>CGU</Link> et notre{' '}
            <Link to="/privacy" style={{ color: '#64748B', textDecoration: 'none' }}>Politique de confidentialité</Link>.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

const submitSx = (accent: string) => ({
  py: 1.5, fontWeight: 800, fontSize: 14.5, borderRadius: '14px', textTransform: 'none' as const,
  background: `linear-gradient(135deg, ${accent}, ${accent === ORANGE ? '#e05e00' : '#7C3AED'})`,
  color: 'white',
  boxShadow: `0 8px 24px ${alpha(accent, 0.35)}`,
  transition: 'all 0.22s',
  '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 12px 32px ${alpha(accent, 0.48)}` },
  '&:active': { transform: 'translateY(0)' },
  // Fond bien visible pendant le chargement — pas une couleur presque transparente
  // avec un texte/spinner quasi invisible dessus (illisible signalé).
  '&.Mui-disabled': { background: `${alpha(accent, 0.7)}`, color: '#fff' },
});

const backSx = {
  py: 1.5, fontWeight: 700, fontSize: 13.5, borderRadius: '14px', textTransform: 'none' as const,
  flex: 1, color: '#475569',
  border: '1.5px solid rgba(15,23,42,0.09)',
  bgcolor: '#FFFFFF',
  '&:hover': { bgcolor: '#F7F8FA', borderColor: 'rgba(15,23,42,0.15)', color: '#0F172A' },
};
