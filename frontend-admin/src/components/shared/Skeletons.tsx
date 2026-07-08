import { Box, BoxProps } from '@mui/material';

// ─── Primitives — le balayage lumineux vient de la classe .dp-skeleton
// (index.css), partagée avec l'admin. Chaque bloc occupe exactement l'espace
// du contenu final visé (jamais de saut de mise en page à l'arrivée des
// données réelles) — c'est à l'appelant de fixer width/height en conséquence.
export function SkelBox({ sx, ...rest }: BoxProps) {
  return <Box className="dp-skeleton" aria-hidden sx={{ width: '100%', height: 16, ...sx }} {...rest} />;
}

export function SkelCircle({ size = 40, sx, ...rest }: BoxProps & { size?: number }) {
  return <Box className="dp-skeleton" aria-hidden sx={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, ...sx }} {...rest} />;
}

export function SkelText({ width = '100%', sx, ...rest }: BoxProps & { width?: number | string }) {
  return <Box className="dp-skeleton" aria-hidden sx={{ width, height: 12, borderRadius: '4px', ...sx }} {...rest} />;
}

// Enveloppe une zone en cours de chargement pour l'accessibilité — annonce
// "contenu en cours de chargement" aux lecteurs d'écran sans rien afficher
// de visible en plus (le squelette lui-même reste aria-hidden).
export function LoadingRegion({ loading, label = 'Chargement du contenu', children }: { loading: boolean; label?: string; children: React.ReactNode }) {
  return (
    <Box role="status" aria-busy={loading} aria-live="polite">
      {loading && <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{label}</span>}
      {children}
    </Box>
  );
}

// ─── Squelettes composés — épousent la mise en page réelle des sections
// les plus utilisées, pas un squelette générique unique. ────────────────────

/** Carte produit (grilles homepage/catégories/recherche) */
export function ProductCardSkeleton() {
  return (
    <Box sx={{ borderRadius: '12px', overflow: 'hidden', bgcolor: 'white', border: '1px solid rgba(15,23,42,0.06)' }}>
      <SkelBox sx={{ width: '100%', height: 0, paddingTop: '105%', borderRadius: 0 }} />
      <Box sx={{ p: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <SkelText width="90%" />
        <SkelText width="60%" />
        <SkelText width="40%" sx={{ height: 16 }} />
      </Box>
    </Box>
  );
}

export function ProductCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1.5 }}>
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </Box>
  );
}

/** Fiche produit / service — deux colonnes (galerie + infos) */
export function ProductDetailSkeleton() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 4, maxWidth: 1200, mx: 'auto', p: { xs: 2, lg: 4 } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
        <SkelBox sx={{ width: '100%', height: 0, paddingTop: '100%' }} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkelBox key={i} sx={{ width: 64, height: 64, borderRadius: '8px' }} />)}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <SkelText width="40%" />
        <SkelText width="85%" sx={{ height: 26 }} />
        <SkelText width="30%" sx={{ height: 20, mt: 1 }} />
        <SkelText width="100%" />
        <SkelText width="100%" />
        <SkelText width="70%" />
        <SkelBox sx={{ width: '100%', height: 48, borderRadius: '10px', mt: 2 }} />
        <SkelBox sx={{ width: '100%', height: 48, borderRadius: '10px' }} />
      </Box>
    </Box>
  );
}

/** Ligne de liste générique (panier, favoris, commandes, messages) */
export function ListRowSkeleton({ withImage = true }: { withImage?: boolean }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 1.5 }}>
      {withImage && <SkelBox sx={{ width: 56, height: 56, borderRadius: '10px', flexShrink: 0 }} />}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
        <SkelText width="70%" />
        <SkelText width="40%" />
      </Box>
      <SkelText width={60} sx={{ height: 18 }} />
    </Box>
  );
}

export function ListSkeleton({ rows = 5, withImage = true }: { rows?: number; withImage?: boolean }) {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, i) => <ListRowSkeleton key={i} withImage={withImage} />)}
    </Box>
  );
}

/** Carte de boutique/vendeur */
export function StoreCardSkeleton() {
  return (
    <Box sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(15,23,42,0.06)' }}>
      <SkelBox sx={{ width: '100%', height: 110, borderRadius: 0 }} />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
        <SkelText width="60%" sx={{ height: 16 }} />
        <SkelText width="40%" />
      </Box>
    </Box>
  );
}

/** Bloc conversation / message (messagerie) */
export function MessageSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, alignSelf: i % 2 ? 'flex-end' : 'flex-start', flexDirection: i % 2 ? 'row-reverse' : 'row' }}>
          <SkelCircle size={28} />
          <SkelBox sx={{ width: 160, height: 40, borderRadius: '14px' }} />
        </Box>
      ))}
    </Box>
  );
}

/** Ligne de tableau (admin — listes de gestion) */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', py: 1.4, px: 2 }}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkelText key={i} width={i === 0 ? '20%' : `${Math.max(8, 20 - i * 2)}%`} />
      ))}
    </Box>
  );
}

export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, i) => <TableRowSkeleton key={i} columns={columns} />)}
    </Box>
  );
}

/** Cartes de statistiques (dashboards) */
export function StatCardSkeleton() {
  return (
    <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <SkelText width="50%" />
      <SkelText width="35%" sx={{ height: 26 }} />
    </Box>
  );
}
