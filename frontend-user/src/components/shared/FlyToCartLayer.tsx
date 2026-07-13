import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface FlyItem {
  id: number;
  fromRect: DOMRect;
  toRect: DOMRect;
  imageUrl?: string;
}

// Monté une seule fois (MainLayout) — écoute 'dp:fly-to-cart' déclenché par
// triggerFlyToCart() depuis n'importe quelle page (ex: ProductDetailPage au
// clic sur "Ajouter au panier") et anime un clone de l'image du produit
// depuis le bouton jusqu'à l'icône panier du Header (#header-cart-icon).
export default function FlyToCartLayer() {
  const [items, setItems] = useState<FlyItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { rect, imageUrl } = (e as CustomEvent).detail as { rect: DOMRect; imageUrl?: string };
      const target = document.getElementById('header-cart-icon');
      if (!target) return; // pas de cible visible (ex: bottom nav sans icône panier) — on saute l'animation, pas d'erreur
      const toRect = target.getBoundingClientRect();
      const id = Date.now() + Math.random();
      setItems(prev => [...prev, { id, fromRect: rect, toRect, imageUrl }]);
      // Pulse l'icône panier à l'arrivée (léger décalage = durée du vol)
      setTimeout(() => window.dispatchEvent(new CustomEvent('dp:cart-pulse')), 550);
    };
    window.addEventListener('dp:fly-to-cart', handler);
    return () => window.removeEventListener('dp:fly-to-cart', handler);
  }, []);

  const remove = (id: number) => setItems(prev => prev.filter(i => i.id !== id));

  return createPortal(
    <AnimatePresence>
      {items.map(item => (
        <motion.div
          key={item.id}
          initial={{
            position: 'fixed',
            left: item.fromRect.left + item.fromRect.width / 2 - 22,
            top: item.fromRect.top + item.fromRect.height / 2 - 22,
            width: 44, height: 44,
            borderRadius: '50%',
            overflow: 'hidden',
            zIndex: 3000,
            opacity: 1,
            scale: 1,
            pointerEvents: 'none',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          }}
          animate={{
            left: item.toRect.left + item.toRect.width / 2 - 10,
            top: item.toRect.top + item.toRect.height / 2 - 10,
            width: 20, height: 20,
            scale: 0.4,
            opacity: 0.3,
          }}
          transition={{ duration: 0.55, ease: [0.3, 0, 0.4, 1] }}
          onAnimationComplete={() => remove(item.id)}
        >
          {item.imageUrl
            ? <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: '#FF6B00' }} />}
        </motion.div>
      ))}
    </AnimatePresence>,
    document.body,
  );
}
