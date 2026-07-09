import { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, CircularProgress,
  LinearProgress,
  InputBase,
} from '@mui/material';
import {
  Save, Upload, Visibility, CheckCircle,
  PendingOutlined, ErrorOutline, Description, Person, Business,
  Lock, ChatBubbleOutline, WorkspacePremium, ArrowForward, Badge as BadgeIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

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
const PUR  = '#8B5CF6';

// La patente commerciale est volontairement optionnelle pour le badge "Vérifié" —
// seuls pièce d'identité + selfie sont requis (cf. SellersService._syncStoreVerification
// côté backend, qui applique exactement cette même règle). La patente, si fournie et
// validée, accorde un badge distinct "Patente vérifiée" affiché publiquement sur la
// boutique — un vrai plus de crédibilité, mais jamais un blocage pour être "Vérifié".
const DOC_TYPES = [
  { value: 'IDENTITY',              label: 'Pièce d\'identité (CIN, passeport, permis)', required: true },
  { value: 'SELFIE',                label: 'Selfie (vérification faciale)', required: true },
  { value: 'PATENTE',               label: 'Patente commerciale',       required: false },
  { value: 'BUSINESS_REGISTRATION', label: 'Enregistrement commercial', required: false },
  { value: 'TAX',                   label: 'Document fiscal (NIF)',     required: false },
  { value: 'LEGAL',                 label: 'Document juridique',        required: false },
  { value: 'OTHER',                 label: 'Autre document',            required: false },
];

const BUSINESS_TYPES = [
  { value: 'FOOD',         label: 'Alimentation' },
  { value: 'COSMETICS',    label: 'Cosmétiques' },
  { value: 'CLOTHING',     label: 'Vêtements' },
  { value: 'HOUSING',      label: 'Maison & Déco' },
  { value: 'VEHICLE',      label: 'Véhicules' },
  { value: 'SERVICES',     label: 'Services' },
  { value: 'ELECTRONICS',  label: 'Électronique' },
  { value: 'RESTAURANT',   label: 'Restaurant' },
  { value: 'CLINIC',       label: 'Clinique / Santé' },
  { value: 'AGRICULTURE',  label: 'Agriculture' },
  { value: 'CONSTRUCTION', label: 'Construction & BTP' },
  { value: 'EDUCATION',    label: 'Éducation & Formation' },
  { value: 'TRANSPORT',    label: 'Transport & Logistique' },
  { value: 'TECHNOLOGY',   label: 'Technologie & Informatique' },
  { value: 'EVENTS',       label: 'Événementiel' },
  { value: 'REAL_ESTATE',  label: 'Immobilier' },
  { value: 'BEAUTY',       label: 'Beauté & Bien-être' },
  { value: 'ARTISANAT',    label: 'Artisanat' },
  { value: 'OTHER',        label: 'Autre' },
];

const DEPTS = ['Ouest','Nord','Nord-Est','Nord-Ouest','Sud','Sud-Est','Grand-Anse','Nippes','Centre','Artibonite'];

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: TXT, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)',
    '& fieldset': { borderColor: BORD },
    '&:hover fieldset': { borderColor: 'rgba(15,23,42,0.09)' },
    '&.Mui-focused fieldset': { borderColor: OR },
  },
  '& .MuiInputLabel-root': { color: SUB },
  '& .MuiInputLabel-root.Mui-focused': { color: OR },
  '& .MuiFormHelperText-root': { color: SUB },
  '& .MuiSelect-icon': { color: SUB },
};

function SectionHead({ icon, label, color = OR }: { icon: any; label: string; color?: string }) {
  const Icon = icon;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
      <Box sx={{ width: 30, height: 30, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon sx={{ fontSize: 16, color }} />
      </Box>
      <Typography fontWeight={800} fontSize={14} color={TXT}>{label}</Typography>
    </Box>
  );
}

function DocStatus({ isValid }: { isValid: boolean | null }) {
  if (isValid === true)  return <Box sx={{ px: 0.9, py: 0.2, borderRadius: '6px', bgcolor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}><Typography fontSize={10} fontWeight={700} color={GRN}>Validé</Typography></Box>;
  if (isValid === false) return <Box sx={{ px: 0.9, py: 0.2, borderRadius: '6px', bgcolor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}><Typography fontSize={10} fontWeight={700} color={RED}>Rejeté</Typography></Box>;
  return <Box sx={{ px: 0.9, py: 0.2, borderRadius: '6px', bgcolor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}><Typography fontSize={10} fontWeight={700} color={YLW}>En attente</Typography></Box>;
}

// Réservé aux plans Business et supérieurs — vérifié aussi côté backend
// (UsersService.updateAwayMessage), ce contrôle UI est juste pour l'expérience.
function AwayMessageSection({ canUse, planName }: { canUse: boolean; planName?: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, refetch } = useQuery<{ awayMessageEnabled: boolean; awayMessage: string | null }>({
    queryKey: ['away-message'],
    queryFn: () => api.get('/users/me/away-message').then(r => r.data),
    enabled: !!localStorage.getItem('accessToken'),
  });
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (data !== undefined) { setEnabled(data.awayMessageEnabled); setMessage(data.awayMessage ?? ''); }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me/away-message', { enabled, message: message || null });
      enqueueSnackbar('Message d\'absence sauvegardé', { variant: 'success' });
      refetch();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur', { variant: 'error' });
    }
    finally { setSaving(false); }
  };

  if (!canUse) {
    return (
      <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5, position: 'relative', overflow: 'hidden' }}>
        <SectionHead icon={ChatBubbleOutline} label="Message d'absence automatique" color={BLU} />
        <Box sx={{
          p: 2.5, borderRadius: '14px', textAlign: 'center',
          background: 'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(59,130,246,0.05))',
          border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '11px', mx: 'auto', mb: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <WorkspacePremium sx={{ fontSize: 20, color: PUR }} />
          </Box>
          <Typography fontWeight={800} fontSize={14} color={TXT} mb={0.5}>Fonctionnalité Business</Typography>
          <Typography fontSize={12.5} color={SUB} mb={2} sx={{ maxWidth: 380, mx: 'auto' }}>
            Le message d'absence automatique, envoyé à vos clients quand vous êtes hors ligne, est réservé aux plans
            <strong style={{ color: TXT }}> Business</strong>, <strong style={{ color: TXT }}>Premium</strong> et <strong style={{ color: TXT }}>Elite</strong>
            {planName ? ` — vous êtes actuellement sur le plan ${planName}.` : '.'}
          </Typography>
          <Button component={Link} to="/seller/subscription" endIcon={<ArrowForward sx={{ fontSize: 15 }} />}
            sx={{ bgcolor: PUR, color: '#fff', borderRadius: '10px', fontWeight: 700, fontSize: 13, px: 2.5,
              '&:hover': { bgcolor: '#7C3AED' } }}>
            Voir les plans
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5 }}>
      <SectionHead icon={ChatBubbleOutline} label="Message d'absence automatique" color={BLU} />
      <Typography fontSize={12.5} color={SUB} mb={2}>
        Envoyé automatiquement quand vous êtes hors ligne.
      </Typography>
      <Box onClick={() => setEnabled(p => !p)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', mb: 2 }}>
        <Box sx={{ width: 42, height: 24, borderRadius: '12px', position: 'relative', transition: 'all 0.2s',
          bgcolor: enabled ? OR : 'rgba(15,23,42,0.12)' }}>
          <Box sx={{ position: 'absolute', top: 3, left: enabled ? 21 : 3, width: 18, height: 18, borderRadius: '50%',
            bgcolor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(15,23,42,0.15)' }} />
        </Box>
        <Typography fontSize={13} fontWeight={600} color={enabled ? TXT : SUB}>{enabled ? 'Activé' : 'Désactivé'}</Typography>
      </Box>
      {enabled && (
        <TextField fullWidth multiline minRows={3} maxRows={5} label="Message automatique" value={message}
          onChange={e => setMessage(e.target.value)} inputProps={{ maxLength: 500 }}
          helperText={`${message.length}/500`} sx={{ ...fieldSx, mb: 2 }} />
      )}
      <Button onClick={save} disabled={saving} startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save sx={{ fontSize: 16 }} />}
        sx={{ bgcolor: OR, color: '#fff', borderRadius: '10px', fontWeight: 700, px: 2.5,
          '&:hover': { bgcolor: '#E05A00' }, '&:disabled': { bgcolor: 'rgba(15,23,42,0.04)', color: SUB } }}>
        Sauvegarder
      </Button>
    </Box>
  );
}

export default function SellerProfilePage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState('PATENTE');
  const [uploading, setUploading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    businessType: '', businessTypeOther: '', businessCity: '', businessDept: '', businessAddress: '', cin: '', nif: '',
  });
  const [profileTouched, setProfileTouched] = useState(false);

  const hasToken = !!localStorage.getItem('accessToken');

  const { data: sellerData, isLoading } = useQuery({
    queryKey: ['sellerMe'],
    queryFn: () => api.get('/sellers/me').then(r => {
      const s = r.data;
      setProfile({
        businessType: s.businessType ?? '', businessTypeOther: s.businessTypeOther ?? '',
        businessCity: s.businessCity ?? '', businessDept: s.businessDept ?? '', businessAddress: s.businessAddress ?? '',
        cin: s.cin ?? '', nif: s.nif ?? '',
      });
      return s;
    }),
    enabled: hasToken,
  });

  const { data: docs = [], refetch: refetchDocs } = useQuery({
    queryKey: ['myDocs'],
    queryFn: () => api.get('/sellers/me/documents').then(r => r.data),
    enabled: hasToken,
  });

  const { data: currentSub } = useQuery({
    queryKey: ['sellerSub'],
    queryFn: () => api.get('/subscriptions/me').then(r => r.data).catch(() => null),
    enabled: hasToken,
  });
  const planTier = currentSub?.plan?.tier ?? null;
  const canUseAwayMessage = !!planTier && planTier !== 'STARTER';

  const profileMut = useMutation({
    mutationFn: (data: any) => api.patch('/sellers/me/profile', data),
    onSuccess: () => { setProfileTouched(false); enqueueSnackbar('Profil mis à jour !', { variant: 'success' }); },
    onError: () => enqueueSnackbar('Erreur lors de la mise à jour', { variant: 'error' }),
  });

  const viewDocument = async (docId: string) => {
    setViewingDoc(docId);
    try {
      const { data } = await api.get(`/sellers/me/documents/${docId}/view`);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      enqueueSnackbar('Impossible de charger le document', { variant: 'error' });
    } finally { setViewingDoc(null); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', uploadType);
      await api.post('/sellers/me/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      refetchDocs();
      qc.invalidateQueries({ queryKey: ['sellerMe'] });
      enqueueSnackbar('Document envoyé !', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Erreur upload', { variant: 'error' });
    } finally { setUploading(false); e.target.value = ''; }
  };

  const pf = (k: string) => (e: any) => { setProfile(p => ({ ...p, [k]: e.target.value })); setProfileTouched(true); };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress sx={{ color: OR }} /></Box>;

  const required = DOC_TYPES.filter(d => d.required);
  const uploaded = required.filter(d => (docs as any[]).some((doc: any) => doc.type === d.value));
  const verProgress = Math.round((uploaded.length / required.length) * 100);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>

      {/* Hero header */}
      <Box sx={{
        mb: 3, p: { xs: 2.5, md: 3 }, borderRadius: '20px', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 55%,#1E293B 100%)',
        display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
      }}>
        <Box sx={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%',
          background: `radial-gradient(circle,${OR}33,transparent 70%)` }} />
        <Box sx={{ width: 52, height: 52, borderRadius: '14px', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: `${OR}22`, border: `1px solid ${OR}44` }}>
          <BadgeIcon sx={{ color: OR, fontSize: 26 }} />
        </Box>
        <Box sx={{ position: 'relative' }}>
          <Typography fontWeight={900} fontSize={{ xs: 19, md: 23 }} color="#fff" letterSpacing="-0.4px">Profil & Documents</Typography>
          <Typography fontSize={12.5} color="rgba(255,255,255,0.55)">Complétez votre profil pour obtenir le badge de confiance DealPam</Typography>
        </Box>
      </Box>

      {/* Statut de vérification du compte */}
      {sellerData?.status === 'REJECTED' && (
        <Box sx={{ mb: 2.5, p: 2.5, borderRadius: '16px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: RED, flexShrink: 0 }} />
            <Typography fontWeight={800} fontSize={14} color={RED}>Vérification refusée</Typography>
          </Box>
          {sellerData?.rejectionReason && (
            <Typography fontSize={12.5} color={SUB2} mb={1}>
              <strong style={{ color: TXT }}>Motif :</strong> {sellerData.rejectionReason}
            </Typography>
          )}
          <Typography fontSize={12} color={SUB}>
            Corrigez les documents concernés et envoyez-les à nouveau ci-dessous — votre dossier repassera automatiquement "en attente" dès la resoumission.
          </Typography>
        </Box>
      )}
      {sellerData?.status === 'PENDING' && (
        <Box sx={{ mb: 2.5, p: 2, borderRadius: '16px', bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: YLW, flexShrink: 0 }} />
          <Typography fontSize={13} color={SUB2}>
            <strong style={{ color: TXT }}>En attente de vérification</strong> — notre équipe examine votre dossier (gratuit, généralement sous 24-48h).
          </Typography>
        </Box>
      )}
      {sellerData?.status === 'APPROVED' && (
        <Box sx={{ mb: 2.5, p: 2, borderRadius: '16px', bgcolor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
          display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <CheckCircle sx={{ fontSize: 16, color: GRN, flexShrink: 0 }} />
          <Typography fontSize={13} color={SUB2}>
            <strong style={{ color: TXT }}>Compte vérifié</strong> — votre identité a été validée par notre équipe.
          </Typography>
        </Box>
      )}

      {/* Progress bar */}
      <Box sx={{ borderRadius: '16px', mb: 2.5, p: 2.5, overflow: 'hidden', position: 'relative',
        background: verProgress === 100
          ? 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(16,185,129,0.08))'
          : 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.08))',
        border: `1px solid ${verProgress === 100 ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography fontWeight={800} fontSize={14} color={TXT}>
              {verProgress === 100 ? '✓ Profil complet — En vérification' : `Compléter votre profil — ${verProgress}%`}
            </Typography>
            <Typography fontSize={12} color={SUB}>{uploaded.length}/{required.length} document{required.length > 1 ? 's' : ''} requis uploadé{uploaded.length > 1 ? 's' : ''}</Typography>
          </Box>
          {sellerData?.isVerified && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, px: 1.2, py: 0.5, borderRadius: '8px',
              bgcolor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <CheckCircle sx={{ fontSize: 14, color: GRN }} />
              <Typography fontSize={12} fontWeight={700} color={GRN}>Vérifié</Typography>
            </Box>
          )}
        </Box>
        <LinearProgress variant="determinate" value={verProgress}
          sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(15,23,42,0.09)',
            '& .MuiLinearProgress-bar': { bgcolor: verProgress === 100 ? GRN : BLU, borderRadius: 3 } }} />
      </Box>

      {/* 2-col: pro info + account info */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, mb: 1.5 }}>

        {/* Pro info */}
        <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5 }}>
          <SectionHead icon={Business} label="Informations professionnelles" color={BLU} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField select label="Type d'activité" value={profile.businessType} onChange={pf('businessType')}
              SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} fullWidth sx={fieldSx}>
              <option value="">-- Choisir --</option>
              {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </TextField>
            {profile.businessType === 'OTHER' && (
              <TextField label="Précisez votre activité *" value={profile.businessTypeOther} onChange={pf('businessTypeOther')}
                placeholder="Ex: Location de matériel événementiel" InputLabelProps={{ shrink: true }} fullWidth sx={fieldSx} />
            )}
            <TextField label="Ville principale" value={profile.businessCity} onChange={pf('businessCity')} InputLabelProps={{ shrink: true }} fullWidth sx={fieldSx} />
            <TextField select label="Département" value={profile.businessDept} onChange={pf('businessDept')} SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} fullWidth sx={fieldSx}>
              <option value="">-- Choisir --</option>
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </TextField>
            <TextField label="Adresse professionnelle" value={profile.businessAddress} onChange={pf('businessAddress')} multiline rows={2} InputLabelProps={{ shrink: true }} fullWidth sx={fieldSx} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField label="CIN (numéro d'identité)" value={profile.cin} onChange={pf('cin')} InputLabelProps={{ shrink: true }} fullWidth sx={fieldSx} />
              <TextField label="NIF (numéro fiscal)" value={profile.nif} onChange={pf('nif')} InputLabelProps={{ shrink: true }} fullWidth sx={fieldSx} />
            </Box>
          </Box>
          {profileTouched && (
            <Button fullWidth onClick={() => profileMut.mutate(profile)} disabled={profileMut.isPending}
              startIcon={profileMut.isPending ? <CircularProgress size={14} color="inherit" /> : <Save sx={{ fontSize: 16 }} />}
              sx={{ mt: 2, py: 1.3, borderRadius: '12px', fontWeight: 800, bgcolor: OR, color: '#fff',
                '&:hover': { bgcolor: '#E05A00' }, '&:disabled': { bgcolor: 'rgba(15,23,42,0.04)', color: SUB } }}>
              Enregistrer
            </Button>
          )}
        </Box>

        {/* Account info */}
        <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5 }}>
          <SectionHead icon={Person} label="Compte utilisateur" color={PUR} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              { label: 'Prénom',    value: user?.firstName },
              { label: 'Nom',       value: user?.lastName },
              { label: 'Email',     value: user?.email },
              { label: 'Username',  value: (user as any)?.username ? `@${(user as any).username}` : '—' },
              { label: 'Téléphone', value: (user as any)?.phone ?? '—' },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ display: 'flex', gap: 1.5, px: 1.5, py: 1, borderRadius: '9px', bgcolor: 'rgba(15,23,42,0.09)', flexWrap: 'wrap' }}>
                <Typography fontSize={12} color={SUB} sx={{ minWidth: 80, flexShrink: 0 }}>{label}</Typography>
                <Typography fontSize={12.5} fontWeight={600} color={TXT} sx={{ wordBreak: 'break-word', minWidth: 0 }}>{value || '—'}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 2, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', gap: 1 }}>
            <Lock sx={{ fontSize: 14, color: BLU, flexShrink: 0, mt: 0.1 }} />
            <Typography fontSize={12} color={SUB2}>
              Pour modifier votre email ou mot de passe, utilisez la page <strong style={{ color: TXT }}>Mon compte → Sécurité</strong>.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Documents */}
      <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5, mb: 1.5 }}>
        <SectionHead icon={Description} label="Documents officiels" color={YLW} />
        <Typography fontSize={11.5} color={SUB} mb={2}>
          Vos documents sont strictement confidentiels — consultables uniquement par vous et notre équipe de vérification.
          Vous pouvez renvoyer un document à tout moment ; l'historique de vos envois précédents reste conservé pour audit.
        </Typography>

        <input type="file" ref={fileRef} style={{ display: 'none' }}
          accept={uploadType === 'SELFIE' ? 'image/*' : '.pdf,.jpg,.jpeg,.png,.webp'}
          capture={uploadType === 'SELFIE' ? 'user' : undefined}
          onChange={handleUpload} />

        {/* Une ligne par type de document (requis puis optionnels), chacune avec son propre bouton d'envoi.
            Un vendeur peut envoyer plusieurs fois le même type de document (ex: après un rejet) — l'historique
            complet est conservé côté backend, on affiche ici uniquement le plus récent par type. */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {DOC_TYPES.map(t => {
            const docsOfType = (docs as any[]).filter((d: any) => d.type === t.value);
            const doc = docsOfType.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            const fileName = doc?.fileName?.replace(/^(PUBLIC:|PRIVATE:)/, '');
            const isUploadingThis = uploading && uploadType === t.value;
            return (
              <Box key={t.value} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.6, borderRadius: '12px',
                bgcolor: 'rgba(15,23,42,0.03)', border: `1px solid ${BORD}`, flexWrap: 'wrap' }}>
                <Description sx={{ fontSize: 19, flexShrink: 0,
                  color: !doc ? SUB : doc.isValid === true ? GRN : doc.isValid === false ? RED : YLW }} />
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                    <Typography fontSize={13} fontWeight={700} color={TXT}>{t.label}</Typography>
                    <Box sx={{ px: 0.7, py: 0.1, borderRadius: '5px', bgcolor: t.required ? 'rgba(255,107,0,0.1)' : 'rgba(100,116,139,0.1)' }}>
                      <Typography fontSize={9.5} fontWeight={700} color={t.required ? OR : SUB}>{t.required ? 'Requis' : 'Optionnel'}</Typography>
                    </Box>
                    {doc ? <DocStatus isValid={doc.isValid} /> : (
                      <Box sx={{ px: 0.9, py: 0.2, borderRadius: '6px', bgcolor: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.2)' }}>
                        <Typography fontSize={10} fontWeight={700} color={SUB}>Non fourni</Typography>
                      </Box>
                    )}
                  </Box>
                  {fileName && <Typography fontSize={11} color={SUB} noWrap mt={0.2}>{fileName}</Typography>}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.8, flexShrink: 0 }}>
                  {doc && (
                    <Box onClick={() => viewDocument(doc.id)}
                      sx={{ width: 30, height: 30, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${BORD}`, '&:hover': { bgcolor: 'rgba(59,130,246,0.1)' } }}>
                      {viewingDoc === doc.id ? <CircularProgress size={12} sx={{ color: BLU }} /> : <Visibility sx={{ fontSize: 15, color: BLU }} />}
                    </Box>
                  )}
                  <Button size="small" onClick={() => { setUploadType(t.value); setTimeout(() => fileRef.current?.click(), 0); }}
                    disabled={uploading}
                    startIcon={isUploadingThis ? <CircularProgress size={13} color="inherit" /> : <Upload sx={{ fontSize: 14 }} />}
                    sx={{ borderRadius: '8px', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', textTransform: 'none',
                      bgcolor: doc ? 'rgba(15,23,42,0.06)' : OR, color: doc ? TXT : '#fff',
                      '&:hover': { bgcolor: doc ? 'rgba(15,23,42,0.1)' : '#E05A00' },
                      '&:disabled': { bgcolor: 'rgba(15,23,42,0.04)', color: SUB } }}>
                    {isUploadingThis ? 'Envoi…' : doc ? 'Remplacer' : t.value === 'SELFIE' ? 'Prendre un selfie' : 'Envoyer'}
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>
        <Typography fontSize={10.5} color={SUB} mt={1.2}>PDF, JPG, PNG — max 10 MB par fichier</Typography>

        <Box sx={{ mt: 2, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <Typography fontSize={12} color={SUB2}>
            💡 La <strong style={{ color: TXT }}>patente commerciale</strong> reste optionnelle pour le badge "Vérifié", mais si vous
            la fournissez et qu'elle est validée, un badge <strong style={{ color: TXT }}>"Patente vérifiée"</strong> distinct
            s'affiche publiquement sur votre boutique — un vrai plus de crédibilité auprès des clients.
          </Typography>
        </Box>
      </Box>

      {/* Away message */}
      <AwayMessageSection canUse={canUseAwayMessage} planName={currentSub?.plan?.name} />
    </Box>
  );
}
