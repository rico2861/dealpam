import { useCallback, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';

// Session ID persisted in sessionStorage
function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getSessionId(): string {
  let id = sessionStorage.getItem('dp_session_id');
  if (!id) { id = randomId(); sessionStorage.setItem('dp_session_id', id); }
  return id;
}

type EventType = 'VIEW' | 'CLICK' | 'LIKE' | 'UNLIKE' | 'SEARCH' | 'ADD_CART' | 'PURCHASE';

interface EventData {
  eventType: EventType;
  productId?: string;
  categorySlug?: string;
  searchQuery?: string;
  lat?: number;
  lng?: number;
}

export function useEventTracker() {
  const { user } = useAuthStore();
  const queue = useRef<EventData[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    const events = queue.current.splice(0);
    if (!events.length) return;
    const sessionId = getSessionId();
    // Fire-and-forget
    fetch('/api/events/batch', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
      body:    JSON.stringify({ events: events.map(e => ({ ...e, sessionId })) }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  const track = useCallback((data: EventData) => {
    queue.current.push(data);
    if (timer.current) clearTimeout(timer.current);
    // Batch flush after 1.5s of inactivity
    timer.current = setTimeout(flush, 1500);
    // Immediate flush for high-priority events
    if (['PURCHASE', 'ADD_CART'].includes(data.eventType)) flush();
  }, [flush]);

  return track;
}

export { getSessionId };
