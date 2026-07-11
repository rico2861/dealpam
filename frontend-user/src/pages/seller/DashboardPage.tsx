import { useState } from 'react';
import {
  Box, Typography, Button, Avatar, LinearProgress, Chip,
} from '@mui/material';
import {
  Inventory, ShoppingBag, AttachMoney, Store, ArrowForward,
  WarningAmber, CheckCircle, TrendingUp, ErrorOutline, Verified,
  Chat, Add, ArrowUpward, ArrowDownward, AccountBalanceWallet,
  Star, Insights, Receipt, Campaign, Bolt,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { StatCardSkeleton, ListSkeleton } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

/* ── palette ─────────────────────────────────────────────────────────────── */
const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const SUB2 = '#64748B';
const GRN  = '#10B981';
const RED  = '#EF4444';
const GLD  = '#F59E0B';
const BLU  = '#3B82F6';
const PUR  = '#8B5CF6';

const fmtHTG = (v: number) => `${Number(v).toLocaleString('fr-HT')} HTG`;

const STATUS_COLOR: Record<string, string> = {
  PENDING:'#F59E0B', CONFIRMED:'#3B82F6', PREPARING:'#8B5CF6',
  SHIPPED:'#06B6D4', DELIVERED:'#10B981', CANCELLED:'#EF4444',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING:'En attente', CONFIRMED:'Confirmée', PREPARING:'Préparation',
  SHIPPED:'Expédiée', DELIVERED:'Livrée', CANCELLED:'Annulée',
};

function KpiCard({ icon: Icon, label, value, sub, color, to }: {
  icon: any; label: string; value: any; sub?: React.ReactNode; color: string; to?: string;
}) {
  const inner = (
    <Box sx={{ p:2.5, borderRadius:'16px', bgcolor:CARD, border:`1px solid ${BORD}`,
      height:'100%', position:'relative', overflow:'hidden',
      transition:'all 0.22s', cursor: to ? 'pointer' : 'default',
      '&:hover': to ? { borderColor:`${color}50`, transform:'translateY(-3px)', boxShadow:`0 14px 34px ${color}1F` } : {} }}>
      <Box sx={{ position:'absolute', right:-18, top:-18, width:80, height:80, borderRadius:'50%', bgcolor:`${color}0D` }}/>
      <Box sx={{ width:44, height:44, borderRadius:'12px', mb:2,
        bgcolor:`${color}18`, border:`1px solid ${color}30`,
        display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
        <Icon sx={{ color, fontSize:22 }}/>
      </Box>
      <Typography fontSize={12} fontWeight={600} color={SUB} mb={0.3}>{label}</Typography>
      <Typography fontWeight={900} color={TXT} sx={{ fontSize:24, lineHeight:1.1, letterSpacing:'-0.5px' }}>{value}</Typography>
      {sub && <Typography fontSize={11.5} color={SUB} mt={0.5} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>{sub}</Typography>}
    </Box>
  );
  return to ? <Box component={Link} to={to} sx={{ textDecoration:'none', display:'block', height:'100%' }}>{inner}</Box> : inner;
}

function QuickAction({ icon: Icon, label, to, color }: { icon: any; label: string; to: string; color: string }) {
  return (
    <Box component={Link} to={to} sx={{
      textDecoration:'none', display:'flex', alignItems:'center', gap:1.2, p:1.6,
      borderRadius:'13px', bgcolor:CARD, border:`1px solid ${BORD}`, transition:'all 0.18s',
      '&:hover':{ borderColor:`${color}45`, bgcolor:`${color}08`, transform:'translateY(-1px)' },
    }}>
      <Box sx={{ width:34, height:34, borderRadius:'10px', flexShrink:0, bgcolor:`${color}18`, border:`1px solid ${color}30`,
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon sx={{ color, fontSize:17 }}/>
      </Box>
      <Typography fontSize={12.5} fontWeight={700} color={TXT}>{label}</Typography>
    </Box>
  );
}

function MiniBarChart({ data }: { data: { month: string; revenue: number }[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <Box sx={{ display:'flex', alignItems:'flex-end', gap:1, height:90, px:1 }}>
      {data.map((d, i) => (
        <Box key={i} sx={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:0.5 }}>
          {d.revenue > 0 && (
            <Typography fontSize={9} color={SUB} fontWeight={600}>
              {Math.round(d.revenue/1000)}k
            </Typography>
          )}
          <Box sx={{ width:'100%', borderRadius:'6px 6px 0 0',
            height:`${Math.max((d.revenue/max)*72, d.revenue>0?4:2)}px`,
            background: i===data.length-1 ? `linear-gradient(180deg,${OR},#E05A00)` : `${OR}30`,
            transition:'height 0.5s ease' }}/>
          <Typography fontSize={9} color={SUB} textAlign="center" lineHeight={1.1}>{d.month}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  if (!count) return <Typography fontSize={10.5} color={SUB}>Pas encore d'avis</Typography>;
  return (
    <Box sx={{ display:'flex', alignItems:'center', gap:0.4 }}>
      <Star sx={{ fontSize:12, color:GLD }}/>
      <Typography fontSize={11} fontWeight={700} color={TXT}>{Number(rating).toFixed(1)}</Typography>
      <Typography fontSize={10.5} color={SUB}>({count})</Typography>
    </Box>
  );
}

export default function SellerDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['sellerStats'],
    queryFn: () => api.get('/dashboard/seller').then(r => r.data),
    enabled: !!localStorage.getItem('accessToken'),
  });

  const { data: wallet } = useQuery({
    queryKey: ['seller-wallet'],
    queryFn: () => api.get('/wallet').then(r => r.data),
    enabled: !!localStorage.getItem('accessToken'),
  });

  const sub          = stats?.subscription;
  const daysLeft     = sub ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000)) : 0;
  // Durée réelle du cycle (mensuel/annuel) plutôt qu'un 30 jours codé en dur —
  // sinon un plan annuel affichait une barre pleine à 100% pendant 11 mois
  // puis ne bougeait qu'au dernier mois.
  const cycleDays    = sub ? Math.max(1, Math.round((new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) / 86400000)) : 30;
  const progress     = Math.min(100, Math.round((daysLeft / cycleDays) * 100));
  const expiring     = daysLeft < 7;
  const showSkel  = useDelayedLoading(isLoading);

  const avgOrderValue = stats?.orders ? Math.round((stats?.revenue ?? 0) / stats.orders) : 0;
  const topStoreRevenue = Math.max(...(stats?.stores ?? []).map((s: any) => Number(s.revenue) || 0), 1);
  const primaryStoreName = stats?.stores?.find((s: any) => s.isPrimary)?.name ?? stats?.stores?.[0]?.name;

  const actionItems: { text: string; color: string }[] = [];
  if (stats?.sellerStatus === 'PENDING') actionItems.push({ text: "Compte en attente d'approbation", color: GLD });
  if (stats?.lowStockCount > 0) actionItems.push({ text: `${stats.lowStockCount} produit${stats.lowStockCount>1?'s':''} en stock faible`, color: RED });
  if (!sub) actionItems.push({ text: 'Aucun abonnement actif', color: GLD });
  else if (expiring) actionItems.push({ text: `Abonnement expire dans ${daysLeft} jour(s)`, color: GLD });

  if (isLoading) return showSkel ? (
    <Box sx={{ p:{ xs:2, md:3 }, bgcolor:BG, minHeight:'100vh' }}>
      <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr 1fr', sm:'repeat(4,1fr)' }, gap:1.5, mb:3 }}>
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i}/>)}
      </Box>
      <Box sx={{ p:3, borderRadius:'16px', bgcolor:CARD, border:`1px solid ${BORD}` }}>
        <ListSkeleton rows={4}/>
      </Box>
    </Box>
  ) : null;

  return (
    <Box sx={{ p:{ xs:2, md:3 }, bgcolor:BG, minHeight:'100vh' }}>

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <Box sx={{
        mb:3, p:{ xs:2.5, md:3 }, borderRadius:'20px', position:'relative', overflow:'hidden',
        background:'linear-gradient(135deg,#0F172A 0%,#1E293B 55%,#1E293B 100%)',
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:2,
      }}>
        <Box sx={{ position:'absolute', right:-60, top:-60, width:220, height:220, borderRadius:'50%',
          background:`radial-gradient(circle,${OR}33,transparent 70%)` }}/>
        <Box sx={{ position:'relative', display:'flex', alignItems:'center', gap:2 }}>
          <Box sx={{ width:52, height:52, borderRadius:'14px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
            bgcolor:`${OR}22`, border:`1px solid ${OR}44` }}>
            <Store sx={{ color:OR, fontSize:26 }}/>
          </Box>
          <Box>
            <Typography fontWeight={900} fontSize={{ xs:19, md:23 }} color="#fff" letterSpacing="-0.4px">
              {primaryStoreName ? `Bonjour, ${primaryStoreName}` : 'Tableau de bord'}
            </Typography>
            <Typography fontSize={12.5} color="rgba(255,255,255,0.55)">Votre espace vendeur DealPam</Typography>
          </Box>
        </Box>
        <Box sx={{ position:'relative', display:'flex', gap:1.5, flexWrap:'wrap' }}>
          <Button component={Link} to="/seller/chat" variant="outlined" startIcon={<Chat sx={{ fontSize:16 }}/>}
            sx={{ borderRadius:'10px', fontSize:13, color:'rgba(255,255,255,0.85)', borderColor:'rgba(255,255,255,0.18)',
              '&:hover':{ borderColor:'rgba(255,255,255,0.35)', bgcolor:'rgba(255,255,255,0.06)' } }}>
            Messages
          </Button>
          <Button component={Link} to="/seller/products/add" startIcon={<Add sx={{ fontSize:16 }}/>}
            sx={{ borderRadius:'10px', fontSize:13, bgcolor:OR, color:'#fff', fontWeight:700,
              boxShadow:'0 4px 14px rgba(255,107,0,0.35)', '&:hover':{ bgcolor:'#E05A00' } }}>
            + Produit
          </Button>
        </Box>
      </Box>

      {/* ── Action center ───────────────────────────────────────────────────── */}
      {actionItems.length > 0 && (
        <Box sx={{ mb:2.5, p:2, borderRadius:'16px', bgcolor:CARD, border:`1px solid ${BORD}`,
          display:'flex', alignItems:'center', gap:1.5, flexWrap:'wrap' }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:0.8, flexShrink:0 }}>
            <WarningAmber sx={{ color:GLD, fontSize:18 }}/>
            <Typography fontSize={12.5} fontWeight={800} color={TXT}>À faire</Typography>
          </Box>
          <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', flex:1 }}>
            {actionItems.map((a, i) => (
              <Chip key={i} label={a.text} size="small"
                sx={{ fontSize:11.5, fontWeight:600, height:26, bgcolor:`${a.color}15`, color:a.color, border:`1px solid ${a.color}30` }}/>
            ))}
          </Box>
          {stats?.lowStockCount > 0 && (
            <Button component={Link} to="/seller/products" size="small"
              sx={{ borderRadius:'8px', border:`1px solid ${BORD}`, color:SUB2, fontSize:12, px:1.5, py:0.5, flexShrink:0,
                '&:hover':{ bgcolor:'rgba(15,23,42,0.09)' } }}>
              Voir les stocks
            </Button>
          )}
        </Box>
      )}

      {/* ── Subscription banner ─────────────────────────────────────────────── */}
      {sub ? (
        <Box sx={{
          mb:3, p:{ xs:2.2, md:2.8 }, borderRadius:'18px', position:'relative', overflow:'hidden',
          background: expiring
            ? 'linear-gradient(135deg,#1E1610 0%,#2A1A0D 100%)'
            : sub.isTrial
              ? 'linear-gradient(135deg,#1A140F 0%,#241B10 100%)'
              : 'linear-gradient(135deg,#0F172A 0%,#16213A 100%)',
          border: `1px solid ${expiring ? 'rgba(245,158,11,0.3)' : sub.isTrial ? 'rgba(255,107,0,0.3)' : 'rgba(59,130,246,0.25)'}`,
        }}>
          <Box sx={{ position:'absolute', right:-30, top:-30, width:140, height:140, borderRadius:'50%',
            background: `radial-gradient(circle,${expiring?GLD:sub.isTrial?OR:BLU}22,transparent 70%)` }}/>

          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:1.5, position:'relative' }}>
            <Box sx={{ display:'flex', alignItems:'center', gap:1.6 }}>
              <Box sx={{ width:42, height:42, borderRadius:'12px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                bgcolor:`${expiring?GLD:sub.isTrial?OR:BLU}20`, border:`1px solid ${expiring?GLD:sub.isTrial?OR:BLU}40` }}>
                {expiring ? <WarningAmber sx={{ color:GLD, fontSize:22 }}/> : sub.isTrial ? <Bolt sx={{ color:OR, fontSize:22 }}/> : <CheckCircle sx={{ color:BLU, fontSize:22 }}/>}
              </Box>
              <Box>
                <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                  <Typography fontWeight={800} fontSize={15.5} color="#fff">
                    {sub.isTrial ? 'Période d\'essai — Plan Business' : (sub.plan?.name ?? 'Plan actif')}
                  </Typography>
                  {sub.isTrial && <Chip label="ESSAI" size="small" sx={{ height:18, fontSize:9.5, fontWeight:800, bgcolor:`${OR}25`, color:OR }}/>}
                </Box>
                <Typography fontSize={12} color="rgba(255,255,255,0.55)">
                  {sub.isTrial
                    ? `Accès complet aux fonctionnalités ${sub.plan?.name ?? 'Business'}`
                    : (sub.plan?.maxProducts ? `${sub.plan.maxProducts} produits max` : 'Produits illimités')}
                  {!sub.isTrial && sub.plan?.maxStores>1 ? ` · ${sub.plan.maxStores} boutiques` : ''}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign:'right', flexShrink:0 }}>
              <Typography fontWeight={900} fontSize={20} color={expiring?GLD:'#fff'} letterSpacing="-0.5px">{daysLeft}</Typography>
              <Typography fontSize={10.5} color="rgba(255,255,255,0.5)" textTransform="uppercase" letterSpacing="0.5px">jour{daysLeft>1?'s':''} restant{daysLeft>1?'s':''}</Typography>
            </Box>
          </Box>

          <LinearProgress variant="determinate" value={progress}
            sx={{ height:6, borderRadius:3, mt:2, position:'relative',
              bgcolor:'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar':{ bgcolor: expiring ? GLD : sub.isTrial ? OR : BLU, borderRadius:3 } }}/>

          {(sub.isTrial || expiring) && (
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mt:1.8, flexWrap:'wrap', gap:1, position:'relative' }}>
              <Typography fontSize={12} color="rgba(255,255,255,0.6)">
                {expiring
                  ? 'Sélectionnez un plan pour éviter toute interruption de visibilité de vos produits.'
                  : 'Aucun moyen de paiement requis pendant la période d\'essai. Choisissez un plan à tout moment.'}
              </Typography>
              <Button component={Link} to="/seller/subscription" size="small" endIcon={<ArrowForward sx={{ fontSize:14 }}/>}
                sx={{ borderRadius:'9px', bgcolor: expiring ? GLD : OR, color: expiring ? '#000' : '#fff', fontWeight:700, fontSize:12, px:1.6, flexShrink:0,
                  '&:hover':{ bgcolor: expiring ? '#D97706' : '#E05A00' } }}>
                Voir les plans
              </Button>
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={{
          mb:3, p:{ xs:2.2, md:2.8 }, borderRadius:'18px', position:'relative', overflow:'hidden',
          background:'linear-gradient(135deg,#1E1610 0%,#2A1A0D 100%)', border:'1px solid rgba(245,158,11,0.3)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:2 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.6 }}>
            <Box sx={{ width:42, height:42, borderRadius:'12px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
              bgcolor:`${GLD}20`, border:`1px solid ${GLD}40` }}>
              <WarningAmber sx={{ color:GLD, fontSize:22 }}/>
            </Box>
            <Box>
              <Typography fontWeight={800} color="#fff" fontSize={15}>Aucun abonnement actif</Typography>
              <Typography fontSize={12} color="rgba(255,255,255,0.55)">Abonnez-vous pour publier vos produits</Typography>
            </Box>
          </Box>
          <Button component={Link} to="/seller/subscription" endIcon={<ArrowForward/>}
            sx={{ bgcolor:GLD, color:'#000', borderRadius:'10px', fontWeight:700, fontSize:13, px:2,
              '&:hover':{ bgcolor:'#D97706' } }}>
            Voir les plans
          </Button>
        </Box>
      )}

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr 1fr', sm:'repeat(3,1fr)', lg:'repeat(6,1fr)' }, gap:1.5, mb:3 }}>
        <KpiCard icon={Inventory}   label="Produits actifs"  value={stats?.products ?? 0}          color={BLU} to="/seller/products"/>
        <KpiCard icon={ShoppingBag} label="Commandes"        value={stats?.orders ?? 0}             color={PUR}
          sub={stats?.pendingOrders ? `${stats.pendingOrders} en attente` : undefined} to="/seller/orders"/>
        <KpiCard icon={AttachMoney} label="Revenus livrés"   value={fmtHTG(stats?.revenue ?? 0)}   color={GRN}/>
        <KpiCard icon={Insights}    label="Panier moyen"     value={stats?.orders ? fmtHTG(avgOrderValue) : '—'} color="#06B6D4"/>
        <KpiCard icon={AccountBalanceWallet} label="Solde wallet" value={fmtHTG(Number(wallet?.balance ?? 0))} color={GLD} to="/seller/wallet"/>
        <KpiCard icon={Store}       label="Boutiques"        value={stats?.storeCount ?? 0}         color={OR}
          sub={stats?.isVerified ? <><CheckCircle sx={{ fontSize: 12 }} /> Vérifié</> : undefined} to="/seller/stores"/>
      </Box>

      {/* ── Quick actions ───────────────────────────────────────────────────── */}
      <Box sx={{ mb:3 }}>
        <Typography fontWeight={800} fontSize={13.5} color={SUB2} sx={{ mb:1.2 }}>Actions rapides</Typography>
        <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr 1fr', sm:'repeat(4,1fr)' }, gap:1.2 }}>
          <QuickAction icon={Add}      label="Ajouter un produit" to="/seller/products/add" color={OR}/>
          <QuickAction icon={Campaign} label="Lancer une pub"     to="/seller/ads"           color={PUR}/>
          <QuickAction icon={Receipt}  label="Voir les commandes" to="/seller/orders"        color={BLU}/>
          <QuickAction icon={Bolt}     label="Statistiques"       to="/seller/statistics"    color={GRN}/>
        </Box>
      </Box>

      {/* ── Revenue chart + stores ───────────────────────────────────────────── */}
      <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr', md:'7fr 5fr' }, gap:2, mb:3 }}>

        {/* Chart */}
        <Box sx={{ p:3, borderRadius:'16px', bgcolor:CARD, border:`1px solid ${BORD}` }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2.5 }}>
            <Typography fontWeight={800} fontSize={15} color={TXT}>Revenus — 6 derniers mois</Typography>
            <TrendingUp sx={{ color:GRN, fontSize:20 }}/>
          </Box>
          {stats?.monthlyRevenue?.length ? (
            <MiniBarChart data={stats.monthlyRevenue}/>
          ) : (
            <Box sx={{ height:90, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Typography color={SUB} fontSize={13}>Aucune donnée pour l'instant</Typography>
            </Box>
          )}
          {stats?.monthlyRevenue?.length && (
            <Box sx={{ display:'flex', gap:3, mt:2, pt:2, borderTop:`1px solid ${BORD}` }}>
              {[
                { label:'Ce mois', value: fmtHTG(stats.monthlyRevenue?.[stats.monthlyRevenue.length-1]?.revenue ?? 0), up:true },
                { label:'Mois précédent', value: fmtHTG(stats.monthlyRevenue?.[stats.monthlyRevenue.length-2]?.revenue ?? 0), up:false },
              ].map(({ label, value, up }) => (
                <Box key={label}>
                  <Typography fontSize={11} color={SUB}>{label}</Typography>
                  <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                    {up ? <ArrowUpward sx={{ fontSize:13, color:GRN }}/> : <ArrowDownward sx={{ fontSize:13, color:RED }}/>}
                    <Typography fontSize={13} fontWeight={700} color={TXT}>{value}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Stores */}
        <Box sx={{ p:3, borderRadius:'16px', bgcolor:CARD, border:`1px solid ${BORD}` }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2.5 }}>
            <Typography fontWeight={800} fontSize={15} color={TXT}>Mes boutiques</Typography>
            <Button component={Link} to="/seller/stores" size="small" endIcon={<ArrowForward sx={{ fontSize:14 }}/>}
              sx={{ color:OR, fontSize:12, fontWeight:600, '&:hover':{ bgcolor:'rgba(255,107,0,0.08)' } }}>Gérer</Button>
          </Box>
          {(stats?.stores ?? []).map((store: any) => (
            <Box key={store.id} sx={{ mb:1.5, p:1.6, borderRadius:'12px', bgcolor:'rgba(15,23,42,0.03)', border:`1px solid ${BORD}` }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                <Avatar sx={{ width:36, height:36, bgcolor:`${OR}1A`, color:OR, fontWeight:900, fontSize:14, borderRadius:'9px', border:'1px solid rgba(255,107,0,0.2)', flexShrink:0 }}>
                  {store.name?.[0]}
                </Avatar>
                <Box sx={{ flex:1, minWidth:0 }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:0.6 }}>
                    <Typography fontSize={13} fontWeight={700} color={TXT} noWrap>{store.name}</Typography>
                    {store.isVerified && <Verified sx={{ fontSize:12, color:OR }}/>}
                  </Box>
                  <Box sx={{ display:'flex', gap:1.5, alignItems:'center', flexWrap:'wrap' }}>
                    <Typography fontSize={11} color={SUB}>{store.productCount} produits</Typography>
                    <Typography fontSize={11} color={SUB}>{store.orderCount} cmd</Typography>
                    <StarRating rating={store.avgRating ?? 0} count={store.totalReviews ?? 0}/>
                  </Box>
                </Box>
                <Typography fontSize={12.5} fontWeight={800} color={GRN} flexShrink={0}>{fmtHTG(store.revenue)}</Typography>
              </Box>
              <LinearProgress variant="determinate" value={Math.min(100, (Number(store.revenue)/topStoreRevenue)*100)}
                sx={{ height:4, borderRadius:2, mt:1.2, bgcolor:'rgba(15,23,42,0.06)',
                  '& .MuiLinearProgress-bar':{ bgcolor:OR, borderRadius:2 } }}/>
            </Box>
          ))}
          {!stats?.stores?.length && (
            <Box sx={{ textAlign:'center', py:4 }}>
              <Typography fontSize={13} color={SUB} mb={1}>Aucune boutique</Typography>
              <Button component={Link} to="/seller/stores" variant="outlined" size="small"
                sx={{ borderRadius:'8px', borderColor:BORD, color:SUB2, mt:1, '&:hover':{ borderColor:'rgba(15,23,42,0.09)' } }}>
                Créer une boutique
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Recent orders ───────────────────────────────────────────────────── */}
      <Box sx={{ p:3, borderRadius:'16px', bgcolor:CARD, border:`1px solid ${BORD}` }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2.5 }}>
          <Typography fontWeight={800} fontSize={15} color={TXT}>Commandes récentes</Typography>
          <Button component={Link} to="/seller/orders" size="small" endIcon={<ArrowForward sx={{ fontSize:14 }}/>}
            sx={{ color:OR, fontSize:12, fontWeight:600, '&:hover':{ bgcolor:'rgba(255,107,0,0.08)' } }}>Toutes</Button>
        </Box>

        {stats?.recentOrders?.length ? (
          <Box>
            {/* Table header */}
            <Box sx={{ display:'grid', gridTemplateColumns:'1fr 2fr 1.2fr 1fr 0.8fr', gap:1, px:1, mb:1 }}>
              {['Client','Produit','Montant','Statut','Date'].map(h => (
                <Typography key={h} fontSize={11} fontWeight={700} color={SUB} textTransform="uppercase" letterSpacing="0.5px">{h}</Typography>
              ))}
            </Box>
            {stats.recentOrders.map((o: any, i: number) => (
              <Box key={o.id} sx={{ display:'grid', gridTemplateColumns:'1fr 2fr 1.2fr 1fr 0.8fr', gap:1,
                px:1, py:1.5, borderTop:`1px solid ${BORD}`, alignItems:'center',
                bgcolor: i % 2 === 1 ? 'rgba(15,23,42,0.015)' : 'transparent',
                '&:hover':{ bgcolor:'rgba(255,107,0,0.05)', borderRadius:'8px' }, transition:'all 0.13s' }}>
                <Box sx={{ display:'flex', alignItems:'center', gap:0.8, minWidth:0 }}>
                  <Avatar sx={{ width:22, height:22, fontSize:10, fontWeight:700, bgcolor:'rgba(15,23,42,0.08)', color:SUB2 }}>
                    {o.user?.firstName?.[0]}
                  </Avatar>
                  <Typography fontSize={12.5} color={TXT} noWrap>
                    {o.user?.firstName} {o.user?.lastName?.[0]}.
                  </Typography>
                </Box>
                <Typography fontSize={12.5} color={SUB2} noWrap>
                  {o.items?.[0]?.product?.name ?? '—'}
                </Typography>
                <Typography fontSize={12.5} fontWeight={700} color={TXT} noWrap>
                  {fmtHTG(o.totalHTG)}
                </Typography>
                <Box>
                  <Box sx={{ display:'inline-flex', px:1, py:0.3, borderRadius:'6px',
                    bgcolor:`${STATUS_COLOR[o.status]||'#64748B'}18`,
                    border:`1px solid ${STATUS_COLOR[o.status]||'#64748B'}33` }}>
                    <Typography fontSize={10.5} fontWeight={700} color={STATUS_COLOR[o.status]||'#64748B'}>
                      {STATUS_LABEL[o.status]||o.status}
                    </Typography>
                  </Box>
                </Box>
                <Typography fontSize={11.5} color={SUB}>
                  {new Date(o.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ textAlign:'center', py:6 }}>
            <ShoppingBag sx={{ fontSize:44, color:BORD, mb:1.5 }}/>
            <Typography color={SUB} fontSize={14}>Aucune commande pour l'instant</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
