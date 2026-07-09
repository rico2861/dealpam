import { useState } from 'react';
import {
  Box, Typography, Button, Avatar, LinearProgress, Chip,
} from '@mui/material';
import {
  Inventory, ShoppingBag, AttachMoney, Store, ArrowForward,
  WarningAmber, CheckCircle, TrendingUp, ErrorOutline, Verified,
  Chat, Add, ArrowUpward, ArrowDownward,
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
  icon: any; label: string; value: any; sub?: string; color: string; to?: string;
}) {
  const inner = (
    <Box sx={{ p:2.5, borderRadius:'16px', bgcolor:CARD, border:`1px solid ${BORD}`,
      height:'100%', transition:'all 0.22s', cursor: to ? 'pointer' : 'default',
      '&:hover': to ? { borderColor:'rgba(255,107,0,0.3)', transform:'translateY(-2px)', boxShadow:'0 12px 32px rgba(15,23,42,0.12)' } : {} }}>
      <Box sx={{ width:44, height:44, borderRadius:'12px', mb:2,
        bgcolor:`${color}18`, border:`1px solid ${color}30`,
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon sx={{ color, fontSize:22 }}/>
      </Box>
      <Typography fontSize={12} fontWeight={600} color={SUB} mb={0.3}>{label}</Typography>
      <Typography fontWeight={900} color={TXT} sx={{ fontSize:24, lineHeight:1.1, letterSpacing:'-0.5px' }}>{value}</Typography>
      {sub && <Typography fontSize={11.5} color={SUB} mt={0.5}>{sub}</Typography>}
    </Box>
  );
  return to ? <Box component={Link} to={to} sx={{ textDecoration:'none', display:'block', height:'100%' }}>{inner}</Box> : inner;
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
          <Box sx={{ width:'100%', borderRadius:'4px 4px 0 0',
            height:`${Math.max((d.revenue/max)*72, d.revenue>0?4:2)}px`,
            bgcolor: i===data.length-1 ? OR : `${OR}40`,
            transition:'height 0.5s ease' }}/>
          <Typography fontSize={9} color={SUB} textAlign="center" lineHeight={1.1}>{d.month}</Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function SellerDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['sellerStats'],
    queryFn: () => api.get('/dashboard/seller').then(r => r.data),
    enabled: !!localStorage.getItem('accessToken'),
  });

  const sub       = stats?.subscription;
  const daysLeft  = sub ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000)) : 0;
  const progress  = Math.min(100, Math.round((daysLeft / 30) * 100));
  const expiring  = daysLeft < 7;
  const showSkel  = useDelayedLoading(isLoading);

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

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:3, flexWrap:'wrap', gap:2 }}>
        <Box>
          <Typography fontWeight={900} fontSize={{ xs:20, md:24 }} color={TXT} letterSpacing='-0.5px'>
            Tableau de bord
          </Typography>
          <Typography fontSize={13} color={SUB}>Bienvenue dans votre espace vendeur DealPam</Typography>
        </Box>
        <Box sx={{ display:'flex', gap:1.5 }}>
          <Button component={Link} to="/seller/chat" variant="outlined" startIcon={<Chat sx={{ fontSize:16 }}/>}
            sx={{ borderRadius:'10px', fontSize:13, borderColor:BORD, color:SUB2,
              '&:hover':{ borderColor:'rgba(15,23,42,0.09)', bgcolor:'rgba(15,23,42,0.09)', color:TXT } }}>
            Messages
          </Button>
          <Button component={Link} to="/seller/products/add" startIcon={<Add sx={{ fontSize:16 }}/>}
            sx={{ borderRadius:'10px', fontSize:13, bgcolor:OR, color:'#fff', fontWeight:700,
              boxShadow:'0 4px 14px rgba(255,107,0,0.3)', '&:hover':{ bgcolor:'#E05A00' } }}>
            + Produit
          </Button>
        </Box>
      </Box>

      {/* ── Status alerts ───────────────────────────────────────────────────── */}
      {stats?.sellerStatus === 'PENDING' && (
        <Box sx={{ mb:2.5, p:2, borderRadius:'14px', bgcolor:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', display:'flex', gap:1.5, alignItems:'center' }}>
          <WarningAmber sx={{ color:GLD, fontSize:20, flexShrink:0 }}/>
          <Box>
            <Typography fontWeight={700} color={GLD} fontSize={13.5}>Compte vendeur en attente d'approbation</Typography>
            <Typography fontSize={12} color={SUB}>Notre équipe vérifie vos informations. Vous recevrez une notification par email.</Typography>
          </Box>
        </Box>
      )}

      {stats?.lowStockCount > 0 && (
        <Box sx={{ mb:2.5, p:2, borderRadius:'14px', bgcolor:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:2 }}>
          <Box sx={{ display:'flex', gap:1.5, alignItems:'center' }}>
            <ErrorOutline sx={{ color:RED, fontSize:20, flexShrink:0 }}/>
            <Typography fontWeight={600} color={RED} fontSize={13.5}>
              {stats.lowStockCount} produit{stats.lowStockCount>1?'s':''} en stock faible (≤ 5)
            </Typography>
          </Box>
          <Button component={Link} to="/seller/products" size="small"
            sx={{ borderRadius:'8px', border:'1px solid rgba(239,68,68,0.3)', color:RED, fontSize:12, px:1.5, py:0.5,
              '&:hover':{ bgcolor:'rgba(239,68,68,0.08)' } }}>
            Voir
          </Button>
        </Box>
      )}

      {/* ── Subscription banner ─────────────────────────────────────────────── */}
      {sub ? (
        <Box sx={{ mb:3, p:2.5, borderRadius:'16px',
          background: expiring
            ? 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(239,68,68,0.08))'
            : sub.isTrial
              ? 'linear-gradient(135deg,rgba(255,107,0,0.10),rgba(255,107,0,0.03))'
              : 'linear-gradient(135deg,rgba(37,99,235,0.10),rgba(37,99,235,0.03))',
          border: expiring ? '1px solid rgba(245,158,11,0.3)' : sub.isTrial ? `1px solid rgba(255,107,0,0.35)` : `1px solid rgba(37,99,235,0.3)` }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1.5, flexWrap:'wrap', gap:1 }}>
            <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
              {expiring ? <WarningAmber sx={{ color:GLD, fontSize:22 }}/> : sub.isTrial ? <Typography fontSize={13} fontWeight={800} color={OR}>ESSAI</Typography> : <CheckCircle sx={{ color:'#0F172A', fontSize:22 }}/>}
              <Box>
                <Typography fontWeight={800} fontSize={15} color={expiring?GLD:sub.isTrial?OR:TXT}>
                  {sub.isTrial ? 'Période d\'essai — Plan Business' : (sub.plan?.name ?? 'Plan actif')}
                </Typography>
                <Typography fontSize={12} color={SUB}>
                  {sub.isTrial
                    ? `Accès complet aux fonctionnalités ${sub.plan?.name ?? 'Business'}`
                    : (sub.plan?.maxProducts ? `${sub.plan.maxProducts} produits max` : 'Produits illimités')}
                  {!sub.isTrial && sub.plan?.maxStores>1 ? ` · ${sub.plan.maxStores} boutiques` : ''}
                </Typography>
              </Box>
            </Box>
            <Chip label={expiring?`${daysLeft} jour(s) restant(s)`:`${daysLeft} jour(s) restant(s)`}
              sx={{ bgcolor: expiring ? 'rgba(245,158,11,0.15)' : sub.isTrial ? 'rgba(255,107,0,0.15)' : '#FFFFFF',
                color: expiring ? GLD : sub.isTrial ? OR : TXT, fontWeight:700, fontSize:12 }}/>
          </Box>
          <LinearProgress variant="determinate" value={progress}
            sx={{ height:5, borderRadius:3,
              bgcolor: expiring ? 'rgba(245,158,11,0.15)' : '#FFFFFF',
              '& .MuiLinearProgress-bar':{ bgcolor: expiring ? GLD : sub.isTrial ? OR : '#3B82F6', borderRadius:3 } }}/>
          {sub.isTrial && (
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mt:1.5 }}>
              <Typography fontSize={12} color={SUB}>
                {expiring
                  ? 'Sélectionnez un plan pour éviter toute interruption de visibilité de vos produits.'
                  : 'Aucun moyen de paiement requis pendant la période d\'essai. Choisissez un plan à tout moment.'}
              </Typography>
              <Button component={Link} to="/seller/subscription" size="small" endIcon={<ArrowForward sx={{ fontSize:14 }}/>}
                sx={{ borderRadius:'8px', bgcolor:OR, color:'#fff', fontWeight:700, fontSize:12, px:1.5, flexShrink:0,
                  '&:hover':{ bgcolor:'#E05A00' } }}>
                Voir les plans
              </Button>
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={{ mb:3, p:2.5, borderRadius:'16px', border:'1.5px dashed rgba(245,158,11,0.4)', bgcolor:'rgba(245,158,11,0.05)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:2 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <WarningAmber sx={{ color:GLD, fontSize:22 }}/>
            <Box>
              <Typography fontWeight={800} color={GLD} fontSize={14}>Aucun abonnement actif</Typography>
              <Typography fontSize={12} color={SUB}>Abonnez-vous pour publier vos produits</Typography>
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
      <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr 1fr', sm:'repeat(4,1fr)' }, gap:1.5, mb:3 }}>
        <KpiCard icon={Inventory}   label="Produits actifs"  value={stats?.products ?? 0}          color={BLU} to="/seller/products"/>
        <KpiCard icon={ShoppingBag} label="Commandes"        value={stats?.orders ?? 0}             color='#8B5CF6'
          sub={stats?.pendingOrders ? `${stats.pendingOrders} en attente` : undefined} to="/seller/orders"/>
        <KpiCard icon={AttachMoney} label="Revenus livrés"   value={fmtHTG(stats?.revenue ?? 0)}   color={GRN}/>
        <KpiCard icon={Store}       label="Boutiques"        value={stats?.storeCount ?? 0}         color={OR}
          sub={stats?.isVerified ? '✓ Vérifié' : undefined} to="/seller/stores"/>
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
            <Box key={store.id} sx={{ mb:2, p:1.5, borderRadius:'10px', bgcolor:'rgba(15,23,42,0.09)', border:`1px solid ${BORD}` }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                <Avatar sx={{ width:32, height:32, bgcolor:`${OR}1A`, color:OR, fontWeight:900, fontSize:13, borderRadius:'8px', border:'1px solid rgba(255,107,0,0.2)', flexShrink:0 }}>
                  {store.name?.[0]}
                </Avatar>
                <Box sx={{ flex:1, minWidth:0 }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:0.6 }}>
                    <Typography fontSize={13} fontWeight={700} color={TXT} noWrap>{store.name}</Typography>
                    {store.isVerified && <Verified sx={{ fontSize:12, color:OR }}/>}
                  </Box>
                  <Box sx={{ display:'flex', gap:1.5 }}>
                    <Typography fontSize={11} color={SUB}>{store.productCount} produits</Typography>
                    <Typography fontSize={11} color={SUB}>{store.orderCount} cmd</Typography>
                    <Typography fontSize={11} color={GRN} fontWeight={600}>{fmtHTG(store.revenue)}</Typography>
                  </Box>
                </Box>
              </Box>
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
            {stats.recentOrders.map((o: any) => (
              <Box key={o.id} sx={{ display:'grid', gridTemplateColumns:'1fr 2fr 1.2fr 1fr 0.8fr', gap:1,
                px:1, py:1.5, borderTop:`1px solid ${BORD}`, alignItems:'center',
                '&:hover':{ bgcolor:'rgba(15,23,42,0.09)', borderRadius:'8px' }, transition:'all 0.13s' }}>
                <Typography fontSize={12.5} color={TXT} noWrap>
                  {o.user?.firstName} {o.user?.lastName?.[0]}.
                </Typography>
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
