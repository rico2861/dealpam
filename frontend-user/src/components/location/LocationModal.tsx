import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, IconButton, alpha } from '@mui/material';
import { Close, MyLocation, LocationOn, Check, GpsFixed, Refresh, KeyboardArrowDown } from '@mui/icons-material';
import { HAITI_DEPARTMENTS, getCitiesForDept, findNearestCity } from '../../data/haiti-locations';
import { useLocationStore, LocationData } from '../../store/location.store';

const OR  = '#FF6B00';
const ORD = '#E55A00';
const BG  = '#0F172A';

const CSS = `
@keyframes lm-fadeIn  { from{opacity:0}to{opacity:1} }
@keyframes lm-slideUp { from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)} }
@keyframes lm-scale   { from{opacity:0;transform:translate(-50%,-50%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
@keyframes lm-spin    { to{transform:rotate(360deg)} }
@keyframes lm-pulse   { 0%,100%{box-shadow:0 0 0 0 rgba(255,107,0,.3)}70%{box-shadow:0 0 0 8px rgba(255,107,0,0)} }
@keyframes lm-toast   { from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
.lm-body::-webkit-scrollbar{width:0}
.lm-select{
  width:100%; height:52px; border-radius:14px; font-size:14.5px; font-family:inherit;
  background:white; border:1.5px solid #E2E8F0; color:#0F172A; padding:0 40px 0 44px;
  appearance:none; -webkit-appearance:none; cursor:pointer;
}
.lm-select:focus{ outline:none; border-color:${OR}; border-width:2px; }
.lm-select:disabled{ background:#F8FAFC; color:#94A3B8; cursor:not-allowed; }
@media(prefers-reduced-motion:reduce){*{animation-duration:0ms!important;transition-duration:0ms!important}}
`;
function injectCss(id: string, css: string) {
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const el = document.createElement('style'); el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

/* ─── Toast ──────────────────────────────────────────────────────────── */
function Toast({ msg }: { msg: string }) {
  return (
    <Box sx={{
      position:'fixed', bottom:28, left:'50%', zIndex:99999, pointerEvents:'none',
      bgcolor:'#14532D', color:'#4ADE80', px:2.5, py:1.3, borderRadius:'14px',
      fontSize:14, fontWeight:700, boxShadow:'0 8px 32px rgba(0,0,0,.35)',
      display:'flex', alignItems:'center', gap:1,
      animation:'lm-toast .3s ease both', whiteSpace:'nowrap',
      transform:'translateX(-50%)',
    }}>
      <LocationOn sx={{ fontSize:16, color:'#4ADE80' }} />
      {msg}
    </Box>
  );
}

// <select> HTML natif plutôt que MUI Select/Autocomplete : garantit un picker
// géré par l'OS (toujours accessible/tactile, jamais de souci de z-index ou
// de menu tronqué par le conteneur), exactement comme les <input type="date">
// natifs utilisés ailleurs dans l'app (DateRangeFilter.tsx).
function NativeSelect({
  value, onChange, options, placeholder, disabled,
}: {
  value: string; onChange: (v: string) => void; options: string[];
  placeholder: string; disabled?: boolean;
}) {
  return (
    <Box sx={{ position: 'relative' }}>
      <LocationOn sx={{
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        fontSize: 18, color: disabled ? '#CBD5E1' : value ? OR : '#94A3B8', pointerEvents: 'none',
      }} />
      <select
        className="lm-select"
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <KeyboardArrowDown sx={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        fontSize: 20, color: disabled ? '#CBD5E1' : OR, pointerEvents: 'none',
      }} />
    </Box>
  );
}

/* ─── Main Modal ─────────────────────────────────────────────────────── */
export default function LocationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { location: current, setLocation } = useLocationStore();

  const [dept,      setDept]      = useState('');
  const [city,      setCity]      = useState('');
  const [gpsState,  setGpsState]  = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [gpsMsg,    setGpsMsg]    = useState('');
  const [toast,     setToast]     = useState('');

  const villeRef = useRef<HTMLDivElement>(null);
  const bodyRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { injectCss('lm-css7', CSS); }, []);

  useEffect(() => {
    if (open) {
      setDept(current?.department ?? '');
      setCity(current?.city ?? '');
      setGpsState('idle'); setGpsMsg('');
    }
  }, [open, current]);

  /* Escape */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Bloque le scroll de la page derriere le modal (surtout important en plein
  // ecran mobile, sinon on peut scroller la page ET le modal en meme temps).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const cities = dept ? getCitiesForDept(dept).map(c => c.name) : [];

  const handleDeptChange = (d: string) => {
    setDept(d); setCity('');
    setTimeout(() => villeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  };

  const handleCityChange = (c: string) => {
    setCity(c);
    setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }), 80);
  };

  const handleGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsState('error'); setGpsMsg('GPS non disponible sur cet appareil'); return;
    }
    setGpsState('loading'); setGpsMsg('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const found = findNearestCity(pos.coords.latitude, pos.coords.longitude);
        if (found) {
          setDept(found.department); setCity(found.city);
          setGpsState('done'); setGpsMsg(`${found.city}, ${found.department}`);
        } else {
          setGpsState('error'); setGpsMsg('Zone introuvable — choisissez manuellement');
        }
      },
      err => {
        setGpsState('error');
        setGpsMsg(
          err.code === 1 ? 'Accès GPS refusé — autorisez la localisation'
          : err.code === 2 ? 'Position introuvable'
          : 'Délai dépassé — réessayez',
        );
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }, []);

  const handleConfirm = () => {
    if (!dept) return;
    setLocation({ department: dept, city: city || undefined, source: gpsState === 'done' ? 'gps' : 'manual' } as LocationData);
    const label = city ? `${city}, ${dept}` : dept;
    setToast(`Zone mise a jour : ${label}`);
    setTimeout(() => setToast(''), 3000);
    onClose();
  };

  /* GPS styles */
  const gpsIsError = gpsState === 'error';
  const gpsIsDone  = gpsState === 'done';
  const gpsIsLoad  = gpsState === 'loading';
  const gpsBg      = gpsIsError ? '#FFF1F2' : gpsIsDone ? '#F0FDF4' : '#FFF4ED';
  const gpsBorder  = gpsIsError ? '#FECACA' : gpsIsDone ? '#BBF7D0' : alpha(OR, 0.4);
  const gpsColor   = gpsIsError ? '#EF4444' : gpsIsDone ? '#22C55E' : OR;
  const gpsTitleC  = gpsIsError ? '#B91C1C' : gpsIsDone ? '#15803D' : BG;
  const gpsSubC    = gpsIsError ? '#DC2626' : gpsIsDone ? '#16A34A' : '#64748B';

  if (!open) return toast ? <Toast msg={toast} /> : null;

  return (
    <>
      {toast && <Toast msg={toast} />}

      {/* Overlay */}
      <Box
        onClick={onClose}
        sx={{
          position:'fixed', inset:0, zIndex:1400,
          bgcolor:'rgba(15,23,42,0.72)', backdropFilter:'blur(4px)',
          animation:'lm-fadeIn .2s ease both',
        }}
      />

      {/* Modal — plein ecran sur mobile (pas juste une feuille ancree en bas
          qui laissait un espace vide et prenait moins de place), fenetre
          centree sur desktop. */}
      <Box
        role="dialog"
        aria-modal
        aria-label="Sélection de zone de livraison"
        onClick={e => e.stopPropagation()}
        sx={{
          position:'fixed', zIndex:1401,
          top:{ xs:0, sm:'50%' },
          left:{ xs:0, sm:'50%' },
          right:{ xs:0, sm:'auto' },
          bottom:{ xs:0, sm:'auto' },
          transform:{ xs:'none', sm:'translate(-50%,-50%)' },
          width:{ xs:'100%', sm:'min(560px, 94vw)' },
          height:{ xs:'100dvh', sm:'auto' },
          maxHeight:{ xs:'100dvh', sm:'85vh' },
          borderRadius:{ xs:0, sm:'20px' },
          overflow:'hidden',
          display:'flex',
          flexDirection:'column',
          boxShadow:'0 24px 64px rgba(0,0,0,.28)',
          animation:{
            xs:'lm-fadeIn .22s ease both',
            sm:'lm-scale .2s ease both',
          },
        }}>

        {/* ── HEADER ── */}
        <Box sx={{
          flexShrink:0,
          background:`linear-gradient(145deg,${BG} 0%,#1A2D45 100%)`,
          px:{ xs:2.5, sm:3 }, pt:{ xs:2.2, sm:2.5 }, pb:2.2,
          position:'relative', overflow:'hidden',
        }}>
          <Box sx={{
            position:'absolute', top:-30, right:-25, width:110, height:110, borderRadius:'50%',
            background:`radial-gradient(circle,${alpha(OR,.2)} 0%,transparent 70%)`, pointerEvents:'none',
          }} />

          <Box sx={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', position:'relative', zIndex:1 }}>
            <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
              <Box sx={{
                width:48, height:48, borderRadius:'14px', flexShrink:0,
                background:`linear-gradient(135deg,${OR},${ORD})`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 4px 18px ${alpha(OR,.5)}`,
                animation:'lm-pulse 2.5s ease infinite',
              }}>
                <GpsFixed sx={{ fontSize:24, color:'white' }} />
              </Box>
              <Box>
                <Typography color="white" fontWeight={800} fontSize={{ xs:16, sm:17.5 }} lineHeight={1.2}>
                  Zone de livraison
                </Typography>
                <Typography color="#64748B" fontSize={12.5} mt={0.3}>
                  Produits et offres près de vous
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={onClose} size="small" aria-label="Fermer"
              sx={{
                width:36, height:36, bgcolor:'rgba(255,255,255,.1)',
                color:'rgba(255,255,255,.65)',
                '&:hover':{ bgcolor:'rgba(255,255,255,.2)', color:'white' },
                mt:-0.5, mr:-0.5,
              }}>
              <Close sx={{ fontSize:20 }} />
            </IconButton>
          </Box>

          {current?.department && (
            <Box sx={{
              display:'flex', alignItems:'center', gap:1,
              mt:1.8, px:1.8, py:1,
              bgcolor:'rgba(255,255,255,.07)',
              border:'1px solid rgba(255,255,255,.1)',
              borderRadius:'12px', position:'relative', zIndex:1,
            }}>
              <LocationOn sx={{ fontSize:14, color:OR, flexShrink:0 }} />
              <Typography fontSize={12.5} color="rgba(255,255,255,.65)" fontWeight={500}>
                Zone actuelle :&nbsp;
                <Box component="span" sx={{ color:'white', fontWeight:700 }}>
                  {current.city ? `${current.city}, ${current.department}` : current.department}
                </Box>
              </Typography>
            </Box>
          )}
        </Box>

        {/* ── BODY — scrollable, occupe tout l'espace restant ── */}
        <Box
          ref={bodyRef}
          className="lm-body"
          sx={{
            flex:1,
            overflowY:'auto',
            overflowX:'hidden',
            bgcolor:'#F9FAFB',
            px:{ xs:2, sm:2.5 },
            py:2.5,
            display:'flex',
            flexDirection:'column',
            gap:2,
            minHeight:0,
          }}>

          {/* Bouton GPS */}
          <Box
            component="button"
            type="button"
            onClick={gpsIsLoad ? undefined : handleGps}
            disabled={gpsIsLoad}
            sx={{
              flexShrink:0,
              display:'flex', alignItems:'center', gap:1.5,
              border:`2px solid ${gpsBorder}`,
              borderRadius:'16px', px:2, py:1.4,
              cursor:gpsIsLoad ? 'wait' : 'pointer',
              bgcolor:gpsBg, fontFamily:'inherit',
              transition:'all .18s',
              '&:hover': !gpsIsLoad ? { transform:'translateY(-1px)', filter:'brightness(.97)' } : {},
            }}>
            <Box sx={{
              width:44, height:44, borderRadius:'12px', flexShrink:0,
              bgcolor:alpha(gpsColor,.12),
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {gpsIsLoad
                ? <Box sx={{ width:21, height:21, borderRadius:'50%', border:`2.5px solid ${alpha(OR,.2)}`, borderTopColor:OR, animation:'lm-spin .75s linear infinite' }} />
                : <MyLocation sx={{ fontSize:22, color:gpsColor }} />
              }
            </Box>
            <Box sx={{ flex:1, minWidth:0, textAlign:'left' }}>
              <Typography fontWeight={700} fontSize={14} color={gpsTitleC} lineHeight={1.25} sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                {gpsIsLoad ? 'Localisation en cours...'
                 : gpsIsDone ? <>Position détectée <Check sx={{ fontSize:15, color:gpsTitleC }}/></>
                 : gpsIsError ? 'Erreur GPS'
                 : 'Utiliser ma position GPS'}
              </Typography>
              <Typography fontSize={11.5} color={gpsSubC} mt={0.25}
                sx={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {gpsMsg || 'Détection automatique de votre ville'}
              </Typography>
            </Box>
            {gpsIsError && (
              <Box sx={{
                display:'flex', alignItems:'center', gap:0.5,
                border:'1.5px solid #FECACA', borderRadius:'8px',
                px:1, py:0.5, flexShrink:0,
              }}>
                <Refresh sx={{ fontSize:14, color:'#EF4444' }} />
                <Typography fontSize={11} fontWeight={700} color="#EF4444">Réessayer</Typography>
              </Box>
            )}
          </Box>

          {/* Séparateur */}
          <Box sx={{ flexShrink:0, display:'flex', alignItems:'center', gap:1.5 }}>
            <Box sx={{ flex:1, height:'1px', bgcolor:'#E2E8F0' }} />
            <Typography fontSize={10} fontWeight={800} color="#64748B" letterSpacing={1.2}
              sx={{ textTransform:'uppercase', whiteSpace:'nowrap' }}>
              OU CHOISIR MANUELLEMENT
            </Typography>
            <Box sx={{ flex:1, height:'1px', bgcolor:'#E2E8F0' }} />
          </Box>

          {/* Carte selects — <select> HTML natifs, toujours accessibles */}
          <Box sx={{
            bgcolor:'white', borderRadius:'18px',
            p:{ xs:1.5, sm:2 }, border:'1px solid #F0F0F0',
            display:'flex', flexDirection:'column', gap:1.8,
          }}>
            <Box>
              <Typography fontSize={10.5} fontWeight={800} color="#64748B" letterSpacing={1.1}
                sx={{ textTransform:'uppercase', mb:0.8 }}>
                Département
              </Typography>
              <NativeSelect
                value={dept}
                onChange={handleDeptChange}
                options={HAITI_DEPARTMENTS.map(d => d.name)}
                placeholder="Choisir un département"
              />
            </Box>

            <Box ref={villeRef}>
              <Typography fontSize={10.5} fontWeight={800} color="#64748B" letterSpacing={1.1}
                sx={{ textTransform:'uppercase', mb:0.8 }}>
                Ville / Commune
              </Typography>
              <NativeSelect
                value={city}
                onChange={handleCityChange}
                options={cities}
                disabled={!dept}
                placeholder={dept ? 'Choisir une ville / commune' : "Sélectionnez d'abord un département"}
              />
            </Box>
          </Box>

        </Box>

        {/* ── FOOTER FIXE — toujours visible, jamais caché ── */}
        <Box sx={{
          flexShrink:0,
          px:{ xs:2, sm:2.5 }, py:2,
          pb: { xs: 'calc(16px + env(safe-area-inset-bottom, 0px))', sm: 2 },
          borderTop:'1px solid #F1F5F9',
          bgcolor:'white',
        }}>
          {dept && (
            <Box sx={{
              display:'flex', alignItems:'center', gap:1.2,
              bgcolor:alpha(OR,.07), borderRadius:'12px',
              px:2, py:1, mb:1.5,
              border:`1px solid ${alpha(OR,.2)}`,
            }}>
              <LocationOn sx={{ fontSize:15, color:OR, flexShrink:0 }} />
              <Typography fontSize={13} fontWeight={700} color={BG}>
                {city || 'Tout le département'}
                <Box component="span" sx={{ fontWeight:400, color:'#6B7280' }}>
                  {city ? ` · ${dept}` : ` — ${dept}`}
                </Box>
              </Typography>
            </Box>
          )}
          <Box
            component="button"
            type="button"
            onClick={dept ? handleConfirm : undefined}
            disabled={!dept}
            sx={{
              width:'100%', height:52, borderRadius:'14px',
              display:'flex', alignItems:'center', justifyContent:'center', gap:1,
              border:'none', fontFamily:'inherit', fontSize:14.5, fontWeight:800,
              transition:'all .2s',
              cursor: dept ? 'pointer' : 'not-allowed',
              ...(dept ? {
                background:`linear-gradient(135deg,${OR} 0%,${ORD} 100%)`,
                color:'white',
                boxShadow:`0 4px 20px ${alpha(OR,.4)}`,
                '&:hover':{ boxShadow:`0 6px 28px ${alpha(OR,.55)}`, transform:'translateY(-1px)' },
                '&:active':{ transform:'scale(.98)' },
              } : {
                bgcolor:'#E2E8F0',
                color:'#64748B',
              }),
            }}>
            <LocationOn sx={{ fontSize:18 }} />
            {dept ? `Confirmer — ${city || dept}` : 'Sélectionnez un département'}
          </Box>
        </Box>
      </Box>
    </>
  );
}
