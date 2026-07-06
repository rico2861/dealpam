import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, InputBase, Button, CircularProgress,
  LinearProgress, IconButton, Collapse,
} from '@mui/material';
import {
  AutoAwesome, Lock, TrendingUp, Search, ContentCopy,
  LightbulbOutlined, Check, KeyboardArrowDown, KeyboardArrowUp,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#94A3B8';
const SUB2 = '#94A3B8';
const GLD  = '#F59E0B';

const KW_COLORS = ['#FF6B00','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#EF4444','#06B6D4'];

function KeywordRow({ word, count, max, index }: { word: string; count: number; max: number; index: number }) {
  const { enqueueSnackbar } = useSnackbar();
  const pct   = Math.round((count / max) * 100);
  const color = KW_COLORS[index % KW_COLORS.length];
  const copy  = () => { (navigator as any).clipboard?.writeText(word); enqueueSnackbar(`"${word}" copié !`, { variant: 'success', autoHideDuration: 1200 }); };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.2, borderBottom: `1px solid ${BORD}`, '&:last-child': { borderBottom: 'none' } }}>
      <Typography fontSize={11} fontWeight={900} color={color} sx={{ minWidth: 22, textAlign: 'center' }}>#{index + 1}</Typography>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography fontSize={13.5} fontWeight={700} color={TXT}>{word}</Typography>
          <Typography fontSize={11} color={SUB} fontWeight={600}>{count} rech.</Typography>
        </Box>
        <LinearProgress variant="determinate" value={pct}
          sx={{ height: 3, borderRadius: 2, bgcolor: 'rgba(15,23,42,0.09)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 } }} />
      </Box>
      <Box onClick={copy} sx={{ width: 26, height: 26, borderRadius: '7px', cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${BORD}`, '&:hover': { bgcolor: 'rgba(15,23,42,0.09)', borderColor: 'rgba(15,23,42,0.09)' } }}>
        <ContentCopy sx={{ fontSize: 12, color: SUB }} />
      </Box>
    </Box>
  );
}

export default function BoosterIaPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [input, setInput]         = useState('');
  const [result, setResult]       = useState<any>(null);
  const [showTips, setShowTips]   = useState(true);
  const [copiedTitle, setCopiedTitle] = useState(false);

  const { data: sub } = useQuery({
    queryKey: ['sellerSub'],
    queryFn:  () => api.get('/subscriptions/me').then(r => r.data),
    enabled: !!localStorage.getItem('accessToken'),
  });
  const isElite = sub?.plan?.tier === 'ELITE';

  const { mutate: analyze, isPending: loading } = useMutation({
    mutationFn: (cat: string) => api.get(`/algo/keywords?category=${encodeURIComponent(cat)}`).then(r => r.data),
    onSuccess: (data) => {
      if (data?.locked) { enqueueSnackbar('Plan Elite requis.', { variant: 'warning' }); return; }
      setResult(data);
    },
    onError: () => enqueueSnackbar('Erreur lors de l\'analyse', { variant: 'error' }),
  });

  const handleAnalyze = () => { if (!input.trim()) return; analyze(input.trim().toLowerCase().replace(/\s+/g, '-')); };

  const copyTitle = () => {
    (navigator as any).clipboard?.writeText(result?.suggested_title || '');
    setCopiedTitle(true); setTimeout(() => setCopiedTitle(false), 2000);
    enqueueSnackbar('Titre copié !', { variant: 'success', autoHideDuration: 1200 });
  };

  const max = result?.top_keywords?.[0]?.count ?? 1;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>
      <Box sx={{ maxWidth: 700, mx: 'auto' }}>

        {/* Header compact */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
            background: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(245,158,11,0.1))',
            border: '1.5px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AutoAwesome sx={{ fontSize: 20, color: GLD }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography fontWeight={900} fontSize={20} color={TXT} letterSpacing="-0.5px">Booster IA</Typography>
              <Box sx={{ px: 1, py: 0.15, borderRadius: '6px', bgcolor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Typography fontSize={10} fontWeight={800} color={GLD}>PRO ELITE</Typography>
              </Box>
            </Box>
            <Typography fontSize={12.5} color={SUB}>Mots-clés tendances & optimisation SEO pour vos produits</Typography>
          </Box>
        </Box>

        {/* Search box */}
        <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2, mb: 2 }}>
          <Typography fontSize={13} fontWeight={700} color={TXT} mb={1.2}>Que vendez-vous ?</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center',
            bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${isElite ? BORD : 'rgba(15,23,42,0.09)'}`,
            borderRadius: '12px', px: 1.5, py: 1,
            '&:focus-within': { borderColor: isElite ? 'rgba(255,107,0,0.45)' : BORD },
            transition: 'all 0.18s' }}>
            <Search sx={{ fontSize: 16, color: SUB, flexShrink: 0 }} />
            <InputBase
              fullWidth placeholder='Ex: "vêtements femme robes été"'
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              disabled={!isElite}
              sx={{ flex: 1, '& input': { color: TXT, fontSize: 13, padding: 0,
                '&::placeholder': { color: SUB, opacity: 1 }, '&:disabled': { WebkitTextFillColor: SUB } } }}
            />
            <Box onClick={handleAnalyze}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.7, px: 1.8, py: 0.7, borderRadius: '9px', flexShrink: 0,
                bgcolor: isElite && input.trim() && !loading ? OR : '#FFFFFF',
                cursor: isElite && input.trim() && !loading ? 'pointer' : 'default', transition: 'all 0.15s',
                '&:hover': { bgcolor: isElite && input.trim() ? '#E05A00' : undefined } }}>
              {loading
                ? <CircularProgress size={12} sx={{ color: TXT }} />
                : <AutoAwesome sx={{ fontSize: 13, color: isElite && input.trim() ? '#fff' : SUB }} />}
              <Typography fontSize={12} fontWeight={700} color={isElite && input.trim() && !loading ? '#fff' : SUB}>
                {loading ? 'Analyse…' : 'Analyser'}
              </Typography>
            </Box>
          </Box>

          {!isElite && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, p: 1.2, borderRadius: '10px',
              bgcolor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Lock sx={{ fontSize: 13, color: GLD, flexShrink: 0 }} />
              <Typography fontSize={12} color={SUB2}>
                Plan Pro Elite requis.{' '}
                <Box component="span" onClick={() => navigate('/seller/subscription')}
                  sx={{ color: GLD, cursor: 'pointer', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}>
                  Passer à Elite →
                </Box>
              </Typography>
            </Box>
          )}
        </Box>

        {/* Locked state */}
        {!isElite && (
          <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 3, textAlign: 'center' }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
              background: 'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(245,158,11,0.08))',
              border: '1.5px solid rgba(245,158,11,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock sx={{ fontSize: 24, color: GLD }} />
            </Box>
            <Typography fontWeight={800} fontSize={16} color={TXT} mb={0.8}>Réservé aux vendeurs Pro Elite</Typography>
            <Typography fontSize={13} color={SUB} mb={2.5} maxWidth={340} mx="auto">
              Débloquez les mots-clés tendances, suggestions de titres et conseils marketing IA.
            </Typography>
            {/* Blurred preview */}
            <Box sx={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', mb: 2.5 }}>
              {['robe été', 'vêtement femme', 'mode haïti', 'robe légère'].map((k, i) => (
                <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: `1px solid ${BORD}` }}>
                  <Typography fontSize={11} fontWeight={900} color={KW_COLORS[i]} sx={{ minWidth: 22, textAlign: 'center' }}>#{i+1}</Typography>
                  <Typography fontSize={13} fontWeight={700} color={TXT} flex={1}>{k}</Typography>
                  <LinearProgress variant="determinate" value={90 - i*15}
                    sx={{ width: 80, height: 3, borderRadius: 2, bgcolor: 'rgba(15,23,42,0.09)', '& .MuiLinearProgress-bar': { bgcolor: KW_COLORS[i] } }} />
                </Box>
              ))}
            </Box>
            <Button onClick={() => navigate('/seller/subscription')}
              sx={{ bgcolor: GLD, color: '#111', borderRadius: '12px', fontWeight: 800, px: 3, py: 1.1,
                boxShadow: '0 4px 14px rgba(245,158,11,0.35)', '&:hover': { bgcolor: '#D97706' } }}>
              Passer à Elite ✦
            </Button>
          </Box>
        )}

        {/* Results */}
        {isElite && result && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

            {/* Keywords */}
            <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <TrendingUp sx={{ fontSize: 17, color: OR }} />
                <Typography fontWeight={800} fontSize={14} color={TXT}>Mots-clés tendances</Typography>
                <Box sx={{ ml: 'auto', px: 1, py: 0.15, borderRadius: '6px', bgcolor: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)' }}>
                  <Typography fontSize={10} fontWeight={700} color={OR}>7 derniers jours</Typography>
                </Box>
              </Box>
              {result.top_keywords?.length === 0 ? (
                <Typography fontSize={13} color={SUB}>Pas encore de données — revenez dans quelques jours.</Typography>
              ) : (
                (result.top_keywords || []).map((kw: any, i: number) => (
                  <KeywordRow key={kw.word} word={kw.word} count={kw.count} max={max} index={i} />
                ))
              )}
            </Box>

            {/* Suggested title */}
            <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: '1px solid rgba(255,107,0,0.2)', p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <AutoAwesome sx={{ fontSize: 17, color: OR }} />
                <Typography fontWeight={800} fontSize={14} color={TXT}>Titre optimisé suggéré</Typography>
              </Box>
              <Box sx={{ position: 'relative', p: 1.8, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}`, mb: 1.2 }}>
                <Typography fontSize={14} fontWeight={700} color={TXT} lineHeight={1.5} pr={4}>{result.suggested_title}</Typography>
                <Typography fontSize={11} color={SUB} mt={0.5}>{(result.suggested_title || '').length}/80 car.</Typography>
                <Box onClick={copyTitle} sx={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${BORD}`, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(15,23,42,0.09)' } }}>
                  {copiedTitle ? <Check sx={{ fontSize: 13, color: '#10B981' }} /> : <ContentCopy sx={{ fontSize: 13, color: SUB }} />}
                </Box>
              </Box>
              <Box sx={{ p: 1.8, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
                <Typography fontSize={10} fontWeight={700} color={SUB} mb={0.6} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description suggérée</Typography>
                <Typography fontSize={13} color={SUB2} lineHeight={1.6}>{result.suggested_description}</Typography>
              </Box>
            </Box>

            {/* Marketing tips */}
            {result.marketing_tips?.length > 0 && (
              <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5 }}>
                <Box onClick={() => setShowTips(p => !p)}
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: showTips ? 1.5 : 0 }}>
                  <LightbulbOutlined sx={{ fontSize: 17, color: GLD, mr: 1 }} />
                  <Typography fontWeight={800} fontSize={14} color={TXT} flex={1}>Conseils marketing</Typography>
                  <Box sx={{ px: 0.8, py: 0.1, borderRadius: '5px', bgcolor: 'rgba(245,158,11,0.12)', mr: 1 }}>
                    <Typography fontSize={10} fontWeight={800} color={GLD}>{result.marketing_tips.length}</Typography>
                  </Box>
                  {showTips ? <KeyboardArrowUp sx={{ fontSize: 16, color: SUB }} /> : <KeyboardArrowDown sx={{ fontSize: 16, color: SUB }} />}
                </Box>
                <Collapse in={showTips}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                    {result.marketing_tips.map((tip: string, i: number) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1.2, alignItems: 'flex-start' }}>
                        <Box sx={{ width: 20, height: 20, borderRadius: '6px', bgcolor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.15 }}>
                          <Typography fontSize={10} fontWeight={900} color={GLD}>{i + 1}</Typography>
                        </Box>
                        <Typography fontSize={13} color={SUB2} lineHeight={1.55}>{tip}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            )}

            {/* Top queries */}
            {result.top_queries?.length > 0 && (
              <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Search sx={{ fontSize: 16, color: SUB }} />
                  <Typography fontWeight={800} fontSize={14} color={TXT}>Recherches exactes des acheteurs</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
                  {result.top_queries.map((q: any) => (
                    <Box key={q.term} sx={{ px: 1.2, py: 0.5, borderRadius: '7px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}`,
                      '&:hover': { borderColor: 'rgba(255,107,0,0.3)', bgcolor: 'rgba(255,107,0,0.06)' }, cursor: 'default', transition: 'all 0.13s' }}>
                      <Typography fontSize={12} color={SUB2}>{q.term} <span style={{ color: SUB, fontSize: 10 }}>({q.count})</span></Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
