import { useState } from 'react';
import {
  Box, Typography, Button, CircularProgress,
  Dialog, DialogContent, TextField, Alert, Collapse,
} from '@mui/material';
import {
  AccountBalanceWallet, ArrowDownward, ArrowUpward, OpenInNew,
  TrendingUp, Receipt, Campaign, CheckCircle, Schedule,
  Cancel, Search, ExpandMore, ExpandLess, ContentCopy,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

// ── Palette ────────────────────────────────────────────────────────────────
const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#94A3B8';
const SUB2 = '#94A3B8';
const GRN  = '#10B981';
const RED  = '#EF4444';
const YLW  = '#F59E0B';
const BLU  = '#3B82F6';

const MIN_RECHARGE = 25;

// ── Formatters ─────────────────────────────────────────────────────────────
const fmt   = (v: number) => `${Number(v).toLocaleString('fr-HT')} HTG`;
const fmtDt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTm = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// ── Transaction type labels ────────────────────────────────────────────────
const TX_META: Record<string, { label: string; icon: any; color: string }> = {
  RECHARGE:         { label: 'Recharge MonCash', icon: ArrowDownward, color: GRN },
  CAMPAIGN_PAYMENT: { label: 'Campagne publicitaire', icon: Campaign,    color: OR  },
  SUBSCRIPTION:     { label: 'Abonnement',        icon: Receipt,       color: BLU  },
  REFUND:           { label: 'Remboursement',      icon: ArrowDownward, color: GRN  },
  DEBIT:            { label: 'Débit',              icon: ArrowUpward,   color: RED  },
};

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  COMPLETED: { label: 'Complété', color: GRN, icon: CheckCircle },
  PENDING:   { label: 'En attente', color: YLW, icon: Schedule },
  FAILED:    { label: 'Échoué',   color: RED, icon: Cancel },
  CANCELLED: { label: 'Annulé',   color: RED, icon: Cancel },
};

// ── Transaction row ────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: any }) {
  const [expanded, setExpanded] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const isCredit = tx.amount > 0;
  const meta = TX_META[tx.type] ?? { label: tx.type, icon: isCredit ? ArrowDownward : ArrowUpward, color: isCredit ? GRN : RED };
  const sMeta = STATUS_META[tx.status] ?? STATUS_META['PENDING'];
  const TxIcon = meta.icon;
  const SIcon = sMeta.icon;

  const copy = (val: string) => { navigator.clipboard.writeText(val).catch(() => null); enqueueSnackbar('Copié !', { variant: 'success', autoHideDuration: 1500 }); };

  return (
    <Box sx={{ borderBottom: `1px solid ${BORD}`, '&:last-child': { borderBottom: 'none' } }}>
      {/* Main row */}
      <Box onClick={() => setExpanded(p => !p)}
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.8, px: { xs: 1.5, md: 2.5 }, cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: 'rgba(15,23,42,0.04)' } }}>

        {/* Icon */}
        <Box sx={{ width: 40, height: 40, borderRadius: '11px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${meta.color}15`, border: `1px solid ${meta.color}25` }}>
          <TxIcon sx={{ fontSize: 18, color: meta.color }} />
        </Box>

        {/* Description + date */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
            <Typography fontSize={13.5} fontWeight={600} color={TXT}>{tx.description || meta.label}</Typography>
            <Box sx={{ px: 0.9, py: 0.15, borderRadius: '5px', bgcolor: `${sMeta.color}15`, border: `1px solid ${sMeta.color}25`, display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <SIcon sx={{ fontSize: 10, color: sMeta.color }} />
              <Typography fontSize={9.5} fontWeight={700} color={sMeta.color}>{sMeta.label}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3, flexWrap: 'wrap' }}>
            <Typography fontSize={11.5} color={SUB}>{fmtDt(tx.createdAt)} · {fmtTm(tx.createdAt)}</Typography>
            {tx.reference && <Typography fontSize={11} color={SUB} sx={{ fontFamily: 'monospace' }}>#{tx.reference?.slice(-8)}</Typography>}
          </Box>
        </Box>

        {/* Amount */}
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography fontSize={15} fontWeight={800} color={tx.status === 'PENDING' ? YLW : isCredit ? GRN : RED}>
            {isCredit ? '+' : ''}{fmt(tx.amount)}
          </Typography>
          {tx.balanceAfter != null && tx.status === 'COMPLETED' && (
            <Typography fontSize={11} color={SUB}>Solde: {fmt(tx.balanceAfter)}</Typography>
          )}
        </Box>

        {/* Expand icon */}
        <Box sx={{ flexShrink: 0, ml: 0.5 }}>
          {expanded ? <ExpandLess sx={{ fontSize: 16, color: SUB }} /> : <ExpandMore sx={{ fontSize: 16, color: SUB }} />}
        </Box>
      </Box>

      {/* Expanded details */}
      <Collapse in={expanded}>
        <Box sx={{ mx: { xs: 1.5, md: 2.5 }, mb: 1.5, p: 2, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3,1fr)' }, gap: 2 }}>

            <Box>
              <Typography fontSize={10.5} color={SUB} mb={0.3} textTransform="uppercase" letterSpacing="0.5px">Type</Typography>
              <Typography fontSize={13} fontWeight={600} color={TXT}>{meta.label}</Typography>
            </Box>

            <Box>
              <Typography fontSize={10.5} color={SUB} mb={0.3} textTransform="uppercase" letterSpacing="0.5px">Montant</Typography>
              <Typography fontSize={13} fontWeight={700} color={isCredit ? GRN : RED}>{isCredit ? '+' : ''}{fmt(tx.amount)}</Typography>
            </Box>

            <Box>
              <Typography fontSize={10.5} color={SUB} mb={0.3} textTransform="uppercase" letterSpacing="0.5px">Statut</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <SIcon sx={{ fontSize: 13, color: sMeta.color }} />
                <Typography fontSize={13} fontWeight={600} color={sMeta.color}>{sMeta.label}</Typography>
              </Box>
            </Box>

            {tx.balanceAfter != null && (
              <Box>
                <Typography fontSize={10.5} color={SUB} mb={0.3} textTransform="uppercase" letterSpacing="0.5px">Solde après</Typography>
                <Typography fontSize={13} fontWeight={600} color={TXT}>{fmt(tx.balanceAfter)}</Typography>
              </Box>
            )}

            <Box>
              <Typography fontSize={10.5} color={SUB} mb={0.3} textTransform="uppercase" letterSpacing="0.5px">Date</Typography>
              <Typography fontSize={13} color={TXT}>{fmtDt(tx.createdAt)}</Typography>
            </Box>

            <Box>
              <Typography fontSize={10.5} color={SUB} mb={0.3} textTransform="uppercase" letterSpacing="0.5px">Heure</Typography>
              <Typography fontSize={13} color={TXT}>{fmtTm(tx.createdAt)}</Typography>
            </Box>

            {tx.reference && (
              <Box sx={{ gridColumn: { xs: '1/-1', md: 'auto' } }}>
                <Typography fontSize={10.5} color={SUB} mb={0.3} textTransform="uppercase" letterSpacing="0.5px">Référence</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Typography fontSize={12} color={TXT} sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{tx.reference}</Typography>
                  <ContentCopy onClick={() => copy(tx.reference)} sx={{ fontSize: 13, color: SUB, cursor: 'pointer', flexShrink: 0, '&:hover': { color: TXT } }} />
                </Box>
              </Box>
            )}

            {tx.note && (
              <Box sx={{ gridColumn: '1/-1' }}>
                <Typography fontSize={10.5} color={SUB} mb={0.3} textTransform="uppercase" letterSpacing="0.5px">Note</Typography>
                <Typography fontSize={13} color={SUB2}>{tx.note}</Typography>
              </Box>
            )}

          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: any }) {
  return (
    <Box sx={{ p: { xs: 2, md: 2.5 }, borderRadius: '14px', bgcolor: CARD, border: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '11px', bgcolor: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon sx={{ fontSize: 20, color }} />
      </Box>
      <Box>
        <Typography fontSize={11} color={SUB} mb={0.2}>{label}</Typography>
        <Typography fontSize={17} fontWeight={800} color={color}>{value}</Typography>
      </Box>
    </Box>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen]     = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch]  = useState('');
  const [filter, setFilter]  = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['seller-wallet'],
    queryFn: () => api.get('/wallet').then(r => r.data),
    enabled: !!localStorage.getItem('accessToken'),
  });

  const handleRecharge = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < MIN_RECHARGE) {
      enqueueSnackbar(`Montant minimum: ${MIN_RECHARGE} HTG`, { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/wallet/recharge/init', { amount: amt });
      localStorage.setItem('walletRecharge', '1');
      qc.invalidateQueries({ queryKey: ['seller-wallet'] });
      window.location.href = data.redirectUrl;
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Erreur lors de l\'initiation', { variant: 'error' });
      setLoading(false);
    }
  };

  const txs: any[] = wallet?.transactions ?? [];
  const completed  = txs.filter((t: any) => t.status !== 'CANCELLED');
  const totalIn    = completed.filter((t: any) => t.amount > 0 && t.status === 'COMPLETED').reduce((s: number, t: any) => s + t.amount, 0);
  const totalOut   = Math.abs(completed.filter((t: any) => t.amount < 0).reduce((s: number, t: any) => s + t.amount, 0));
  const nbRecharge = completed.filter((t: any) => t.type === 'RECHARGE' && t.status === 'COMPLETED').length;

  const filteredTxs = completed.filter((t: any) => {
    if (filter === 'CREDIT' && t.amount <= 0) return false;
    if (filter === 'DEBIT'  && t.amount >= 0) return false;
    if (search) {
      const q = search.toLowerCase();
      return (t.description ?? '').toLowerCase().includes(q)
        || (t.reference ?? '').toLowerCase().includes(q)
        || (t.type ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const FILTER_TABS = [
    { key: 'ALL',    label: 'Tous' },
    { key: 'CREDIT', label: 'Entrées' },
    { key: 'DEBIT',  label: 'Sorties' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>

        {/* ── Header ── */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: `${OR}18`, border: `1px solid ${OR}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AccountBalanceWallet sx={{ fontSize: 24, color: OR }} />
            </Box>
            <Box>
              <Typography fontWeight={900} fontSize={{ xs: 18, md: 22 }} color={TXT} letterSpacing="-0.5px">Wallet Vendeur</Typography>
              <Typography fontSize={12.5} color={SUB}>Rechargez via MonCash · min. {MIN_RECHARGE} HTG</Typography>
            </Box>
          </Box>
          <Button onClick={() => setOpen(true)} startIcon={<OpenInNew sx={{ fontSize: 16 }} />}
            sx={{ bgcolor: OR, color: '#fff', borderRadius: '12px', fontWeight: 700, px: 2.5, py: 1.2, textTransform: 'none', fontSize: 13.5, boxShadow: '0 4px 20px rgba(255,107,0,0.3)', '&:hover': { bgcolor: '#E05A00' } }}>
            Recharger via MonCash
          </Button>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress sx={{ color: OR }} /></Box>
        ) : (
          <>
            {/* ── Balance hero ── */}
            <Box sx={{ borderRadius: '20px', p: { xs: 2.5, md: 4 }, mb: 2.5, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF7F0 50%, rgba(255,107,0,0.08) 100%)', border: '1px solid rgba(255,107,0,0.2)', boxShadow: '0 20px 60px rgba(15,23,42,0.08)' }}>
              {/* Decorative circle */}
              <Box sx={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,107,0,0.06)', pointerEvents: 'none' }} />

              <Typography fontSize={12} fontWeight={700} color={SUB2} textTransform="uppercase" letterSpacing="1px" mb={1}>Solde disponible</Typography>
              <Typography fontWeight={900} color="#0F172A"
                sx={{ fontSize: { xs: 38, md: 56 }, lineHeight: 1, letterSpacing: '-2px', mb: 1 }}>
                {fmt(wallet?.balance ?? 0)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.2, py: 0.5, borderRadius: '8px', bgcolor: `${GRN}15`, border: `1px solid ${GRN}25` }}>
                  <ArrowDownward sx={{ fontSize: 12, color: GRN }} />
                  <Typography fontSize={12} fontWeight={600} color={GRN}>{fmt(totalIn)} rechargé</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.2, py: 0.5, borderRadius: '8px', bgcolor: `${OR}12`, border: `1px solid ${OR}25` }}>
                  <ArrowUpward sx={{ fontSize: 12, color: OR }} />
                  <Typography fontSize={12} fontWeight={600} color={OR}>{fmt(totalOut)} dépensé</Typography>
                </Box>
              </Box>
            </Box>

            {/* ── Stats row ── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3,1fr)' }, gap: 1.5, mb: 2.5 }}>
              <StatCard label="Total rechargé"  value={fmt(totalIn)}   color={GRN} icon={TrendingUp} />
              <StatCard label="Total dépensé"   value={fmt(totalOut)}  color={OR}  icon={ArrowUpward} />
              <StatCard label="Nb. recharges"   value={`${nbRecharge} recharge${nbRecharge > 1 ? 's' : ''}`} color={BLU} icon={Receipt} />
            </Box>

            {/* ── How it works ── */}
            <Box sx={{ mb: 2.5, p: { xs: 2, md: 2.5 }, borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}` }}>
              <Typography fontWeight={800} fontSize={14} color={TXT} mb={1.5}>Comment recharger ?</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  `Cliquez "Recharger via MonCash" et entrez un montant (min. ${MIN_RECHARGE} HTG)`,
                  'Vous êtes redirigé vers MonCash pour effectuer le paiement en sécurité',
                  'Après confirmation, vous revenez automatiquement — le solde est crédité',
                ].map((txt, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.2, alignItems: 'flex-start' }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: '6px', bgcolor: `${OR}20`, border: `1px solid ${OR}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.1 }}>
                      <Typography fontSize={10} fontWeight={900} color={OR}>{i + 1}</Typography>
                    </Box>
                    <Typography fontSize={13} color={SUB2} lineHeight={1.5}>{txt}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* ── Transaction history ── */}
            <Box sx={{ borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, overflow: 'hidden' }}>

              {/* Table header */}
              <Box sx={{ px: { xs: 1.5, md: 2.5 }, py: 2, borderBottom: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                  <Typography fontWeight={800} fontSize={15} color={TXT}>Historique des transactions</Typography>
                  <Typography fontSize={12} color={SUB} mt={0.2}>{filteredTxs.length} transaction{filteredTxs.length > 1 ? 's' : ''}</Typography>
                </Box>

                {/* Filter tabs */}
                <Box sx={{ display: 'flex', gap: 0.5, bgcolor: 'rgba(15,23,42,0.09)', borderRadius: '10px', p: 0.5 }}>
                  {FILTER_TABS.map(tab => (
                    <Box key={tab.key} onClick={() => setFilter(tab.key as any)}
                      sx={{ px: 1.5, py: 0.6, borderRadius: '7px', cursor: 'pointer', transition: 'all 0.15s', bgcolor: filter === tab.key ? OR : 'transparent', '&:hover': { bgcolor: filter === tab.key ? '#E05A00' : 'rgba(15,23,42,0.09)' } }}>
                      <Typography fontSize={12} fontWeight={600} color={filter === tab.key ? '#fff' : SUB2}>{tab.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Search */}
              <Box sx={{ px: { xs: 1.5, md: 2.5 }, py: 1.2, borderBottom: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Search sx={{ fontSize: 16, color: SUB, flexShrink: 0 }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher par description, référence…"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: TXT, padding: '4px 0' }} />
              </Box>

              {/* Rows */}
              {filteredTxs.length > 0 ? (
                filteredTxs.map((tx: any) => <TxRow key={tx.id} tx={tx} />)
              ) : (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                  <Receipt sx={{ fontSize: 52, color: BORD, mb: 1.5 }} />
                  <Typography color={SUB2} fontSize={15} fontWeight={700} mb={0.5}>
                    {txs.length === 0 ? 'Aucune transaction' : 'Aucun résultat'}
                  </Typography>
                  <Typography color={SUB} fontSize={13}>
                    {txs.length === 0 ? 'Rechargez votre wallet pour commencer.' : 'Essayez d\'autres filtres.'}
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* ── Recharge dialog ── */}
      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#F7F8FA', border: `1px solid ${BORD}`, borderRadius: '20px' } }}>
        <DialogContent sx={{ p: 0 }}>

          {/* Dialog header */}
          <Box sx={{ p: 3, pb: 2, background: 'linear-gradient(135deg, rgba(255,107,0,0.1) 0%, transparent 60%)', borderBottom: `1px solid ${BORD}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: `${OR}18`, border: `1px solid ${OR}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AccountBalanceWallet sx={{ fontSize: 20, color: OR }} />
              </Box>
              <Box>
                <Typography fontWeight={900} fontSize={16} color={TXT}>Recharger via MonCash</Typography>
                <Typography fontSize={11.5} color={SUB}>Minimum {MIN_RECHARGE} HTG</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* Quick amounts */}
            <Box>
              <Typography fontSize={12} color={SUB} mb={1}>Montant rapide</Typography>
              <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                {[25, 50, 100, 250, 500, 1000].map(v => (
                  <Box key={v} onClick={() => setAmount(String(v))}
                    sx={{ px: 1.5, py: 0.7, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', bgcolor: amount === String(v) ? OR : 'rgba(15,23,42,0.09)', border: `1px solid ${amount === String(v) ? OR : BORD}`, '&:hover': { border: `1px solid ${OR}50` } }}>
                    <Typography fontSize={12.5} fontWeight={700} color={amount === String(v) ? '#fff' : SUB2}>{v} HTG</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <TextField fullWidth autoFocus label="Montant personnalisé (HTG)" type="number" value={amount}
              onChange={e => setAmount(e.target.value)}
              inputProps={{ min: MIN_RECHARGE }}
              helperText={`Minimum ${MIN_RECHARGE} HTG`}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#F7F8FA', borderRadius: '10px', fontSize: 15, color: TXT, fontWeight: 700, '& fieldset': { borderColor: BORD }, '&:hover fieldset': { borderColor: 'rgba(15,23,42,0.09)' }, '&.Mui-focused fieldset': { borderColor: OR } }, '& .MuiInputLabel-root': { color: SUB }, '& .MuiInputLabel-root.Mui-focused': { color: OR }, '& .MuiFormHelperText-root': { color: SUB } }} />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button onClick={() => setOpen(false)} disabled={loading}
                sx={{ flex: 1, py: 1.2, borderRadius: '10px', fontWeight: 600, color: SUB2, textTransform: 'none', border: `1px solid ${BORD}`, '&:hover': { bgcolor: 'rgba(15,23,42,0.09)' } }}>
                Annuler
              </Button>
              <Button onClick={handleRecharge} disabled={loading || !amount || parseFloat(amount) < MIN_RECHARGE}
                endIcon={loading ? <CircularProgress size={15} color="inherit" /> : <OpenInNew sx={{ fontSize: 15 }} />}
                sx={{ flex: 2, py: 1.2, borderRadius: '10px', fontWeight: 700, fontSize: 14, bgcolor: OR, color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#E05A00' }, '&.Mui-disabled': { bgcolor: 'rgba(255,107,0,0.25)', color: '#94A3B8' } }}>
                {loading ? 'Connexion MonCash…' : 'Payer avec MonCash'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
