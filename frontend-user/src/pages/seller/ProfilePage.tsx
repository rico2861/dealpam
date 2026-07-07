import { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, CircularProgress,
  LinearProgress,
  InputBase,
} from '@mui/material';
import {
  Save, Upload, Visibility, CheckCircle,
  PendingOutlined, ErrorOutline, Description, Person, Business,
  Lock, ChatBubbleOutline,
} from '@mui/icons-material';
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

const DOC_TYPES = [
  { value: 'PATENTE',               label: 'Patente commerciale',       required: true },
  { value: 'IDENTITY',              label: 'Pièce d\'identité (CIN, passeport, permis)', required: true },
  { value: 'SELFIE',                label: 'Selfie (vérification faciale)', required: true },
  { value: 'BUSINESS_REGISTRATION', label: 'Enregistrement commercial', required: false },
  { value: 'TAX',                   label: 'Document fiscal (NIF)',     required: false },
  { value: 'LEGAL',                 label: 'Document juridique',        required: false },
  { value: 'OTHER',                 label: 'Autre document',            required: false },
];

const BUSINESS_TYPES = [
  { value: 'FOOD',        label: 'Alimentation' },
  { value: 'COSMETICS',   label: 'Cosmétiques' },
  { value: 'CLOTHING',    label: 'Vêtements' },
  { value: 'HOUSING',     label: 'Maison & Déco' },
  { value: 'VEHICLE',     label: 'Véhicules' },
  { value: 'SERVICES',    label: 'Services' },
  { value: 'ELECTRONICS', label: 'Électronique' },
  { value: 'OTHER',       label: 'Autre' },
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

function AwayMessageSection() {
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
    } catch { enqueueSnackbar('Erreur', { variant: 'error' }); }
    finally { setSaving(false); }
  };

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
  const [profile, setProfile] = useState({ businessType: '', businessCity: '', businessDept: '', businessAddress: '' });
  const [profileTouched, setProfileTouched] = useState(false);

  const hasToken = !!localStorage.getItem('accessToken');

  const { data: sellerData, isLoading } = useQuery({
    queryKey: ['sellerMe'],
    queryFn: () => api.get('/sellers/me').then(r => {
      const s = r.data;
      setProfile({ businessType: s.businessType ?? '', businessCity: s.businessCity ?? '', businessDept: s.businessDept ?? '', businessAddress: s.businessAddress ?? '' });
      return s;
    }),
    enabled: hasToken,
  });

  const { data: docs = [], refetch: refetchDocs } = useQuery({
    queryKey: ['myDocs'],
    queryFn: () => api.get('/sellers/me/documents').then(r => r.data),
    enabled: hasToken,
  });

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
  const getDocLabel = (type: string) => DOC_TYPES.find(d => d.value === type)?.label ?? type;

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress sx={{ color: OR }} /></Box>;

  const required = DOC_TYPES.filter(d => d.required);
  const uploaded = required.filter(d => (docs as any[]).some((doc: any) => doc.type === d.value));
  const verProgress = Math.round((uploaded.length / required.length) * 100);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography fontWeight={900} fontSize={{ xs: 20, md: 24 }} color={TXT} letterSpacing="-0.5px">Profil & Documents</Typography>
        <Typography fontSize={13} color={SUB}>Complétez votre profil pour obtenir le badge de confiance DealPam</Typography>
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
            <TextField label="Ville principale" value={profile.businessCity} onChange={pf('businessCity')} InputLabelProps={{ shrink: true }} fullWidth sx={fieldSx} />
            <TextField select label="Département" value={profile.businessDept} onChange={pf('businessDept')} SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} fullWidth sx={fieldSx}>
              <option value="">-- Choisir --</option>
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </TextField>
            <TextField label="Adresse professionnelle" value={profile.businessAddress} onChange={pf('businessAddress')} multiline rows={2} InputLabelProps={{ shrink: true }} fullWidth sx={fieldSx} />
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

        {/* Upload zone */}
        <Box sx={{ p: 2, borderRadius: '12px', border: `1.5px dashed rgba(15,23,42,0.09)`, bgcolor: 'rgba(15,23,42,0.09)', mb: 2.5 }}>
          <Typography fontSize={13} fontWeight={700} color={TXT} mb={0.5}>Envoyer un document</Typography>
          <Typography fontSize={11.5} color={SUB} mb={1.5}>
            Vos documents sont strictement confidentiels — consultables uniquement par vous et notre équipe de vérification.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, gap: 1.5, alignItems: 'center' }}>
            <TextField size="small" select label="Type de document" value={uploadType} onChange={e => setUploadType(e.target.value)}
              SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} sx={fieldSx}>
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}{t.required ? ' *' : ''}</option>)}
            </TextField>
            <Box>
              <input type="file" ref={fileRef} style={{ display: 'none' }}
                accept={uploadType === 'SELFIE' ? 'image/*' : '.pdf,.jpg,.jpeg,.png,.webp'}
                capture={uploadType === 'SELFIE' ? 'user' : undefined}
                onChange={handleUpload} />
              <Button onClick={() => fileRef.current?.click()} disabled={uploading}
                startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <Upload sx={{ fontSize: 16 }} />}
                sx={{ bgcolor: OR, color: '#fff', borderRadius: '10px', fontWeight: 700, whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: '#E05A00' }, '&:disabled': { bgcolor: 'rgba(15,23,42,0.04)', color: SUB } }}>
                {uploading ? 'Envoi…' : uploadType === 'SELFIE' ? 'Prendre un selfie' : 'Choisir un fichier'}
              </Button>
              <Typography fontSize={10} color={SUB} mt={0.5} textAlign="center">PDF, JPG, PNG — max 10 MB</Typography>
            </Box>
          </Box>
        </Box>

        {/* Doc list */}
        {(docs as any[]).length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Description sx={{ fontSize: 44, color: BORD, mb: 1.5 }} />
            <Typography fontSize={13} color={SUB}>Aucun document envoyé</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {(docs as any[]).map((doc: any) => {
              const fileName = doc.fileName?.replace(/^(PUBLIC:|PRIVATE:)/, '') ?? 'Document';
              return (
                <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '12px',
                  bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
                  <Description sx={{ fontSize: 20, flexShrink: 0,
                    color: doc.isValid === true ? GRN : doc.isValid === false ? RED : YLW }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.3 }}>
                      <Typography fontSize={13} fontWeight={600} color={TXT}>{getDocLabel(doc.type)}</Typography>
                      <DocStatus isValid={doc.isValid} />
                    </Box>
                    <Typography fontSize={11} color={SUB} noWrap>{fileName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.8, flexShrink: 0 }}>
                    <Box onClick={() => viewDocument(doc.id)}
                      sx={{ width: 28, height: 28, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${BORD}`, '&:hover': { bgcolor: 'rgba(59,130,246,0.1)' } }}>
                      {viewingDoc === doc.id ? <CircularProgress size={12} sx={{ color: BLU }} /> : <Visibility sx={{ fontSize: 14, color: BLU }} />}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Required checklist */}
        <Box sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${BORD}` }}>
          <Typography fontSize={12} fontWeight={700} color={SUB} mb={1.2} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Documents requis pour la vérification
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {required.map(d => {
              const done = (docs as any[]).some((doc: any) => doc.type === d.value);
              return (
                <Box key={d.value} sx={{ display: 'flex', alignItems: 'center', gap: 0.7, px: 1.2, py: 0.6, borderRadius: '8px',
                  bgcolor: done ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                  border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
                  {done ? <CheckCircle sx={{ fontSize: 12, color: GRN }} /> : <PendingOutlined sx={{ fontSize: 12, color: YLW }} />}
                  <Typography fontSize={11.5} fontWeight={600} color={done ? GRN : YLW}>{d.label}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Away message */}
      <AwayMessageSection />
    </Box>
  );
}
