import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserEvent {
  type: 'view' | 'click' | 'search' | 'like' | 'cart';
  productId?: string;
  category?: string;
  query?: string;
  ts: number;
}

const MAX_EVENTS = 500;

interface EventsState {
  events: UserEvent[];
  trackView: (productId: string, category?: string) => void;
  trackClick: (productId: string, category?: string) => void;
  trackSearch: (query: string) => void;
  trackLike: (productId: string, category?: string) => void;
  trackCart: (productId: string, category?: string) => void;
  getTopCategories: (days: number) => string[];
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => ({
      events: [],

      _addEvent(event: UserEvent) {
        set((state) => {
          const next = [...state.events, event];
          // Keep only the most recent MAX_EVENTS
          return { events: next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next };
        });
      },

      trackView(productId: string, category?: string) {
        (get() as any)._addEvent({ type: 'view', productId, category, ts: Date.now() });
      },

      trackClick(productId: string, category?: string) {
        (get() as any)._addEvent({ type: 'click', productId, category, ts: Date.now() });
      },

      trackSearch(query: string) {
        (get() as any)._addEvent({ type: 'search', query, ts: Date.now() });
      },

      trackLike(productId: string, category?: string) {
        (get() as any)._addEvent({ type: 'like', productId, category, ts: Date.now() });
      },

      trackCart(productId: string, category?: string) {
        (get() as any)._addEvent({ type: 'cart', productId, category, ts: Date.now() });
      },

      getTopCategories(days: number): string[] {
        const cutoff = Date.now() - days * 24 * 3600 * 1000;
        const recent = get().events.filter(
          (e) => e.ts >= cutoff && (e.type === 'view' || e.type === 'click') && e.category
        );
        const counts: Record<string, number> = {};
        for (const e of recent) {
          if (e.category) counts[e.category] = (counts[e.category] || 0) + 1;
        }
        return Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat]) => cat);
      },
    }),
    { name: 'dp_events' }
  )
);
