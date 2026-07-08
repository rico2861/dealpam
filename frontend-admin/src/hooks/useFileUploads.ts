import { useCallback, useRef, useState } from 'react';
import api from '../api/axios';

export interface UploadItem {
  id: string;
  file: File;
  progress: number;       // 0-100
  status: 'uploading' | 'success' | 'error' | 'cancelled';
  error?: string;
  result?: any;
}

/**
 * Suivi de progression par fichier (jamais une seule barre globale qui
 * masquerait quel fichier précis échoue). Chaque upload a son propre
 * AbortController pour permettre l'annulation individuelle.
 */
export function useFileUploads(endpoint: string, extraFields?: Record<string, string>) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const controllers = useRef<Map<string, AbortController>>(new Map());

  const patch = (id: string, patch: Partial<UploadItem>) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));

  const uploadOne = useCallback((file: File, id: string) => {
    const controller = new AbortController();
    controllers.current.set(id, controller);
    const form = new FormData();
    form.append('file', file);
    if (extraFields) Object.entries(extraFields).forEach(([k, v]) => form.append(k, v));

    api.post(endpoint, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: controller.signal,
      onUploadProgress: (e) => {
        const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
        patch(id, { progress: pct });
      },
    })
      .then(res => patch(id, { status: 'success', progress: 100, result: res.data }))
      .catch((err: any) => {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          patch(id, { status: 'cancelled' });
        } else {
          patch(id, { status: 'error', error: err?.response?.data?.message || "Échec de l'envoi" });
        }
      })
      .finally(() => controllers.current.delete(id));
  }, [endpoint, extraFields]);

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadItem[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file, progress: 0, status: 'uploading',
    }));
    setItems(prev => [...prev, ...newItems]);
    newItems.forEach(it => uploadOne(it.file, it.id));
  }, [uploadOne]);

  const cancel = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
  }, []);

  const retry = useCallback((id: string) => {
    const item = items.find(it => it.id === id);
    if (!item) return;
    patch(id, { status: 'uploading', progress: 0, error: undefined });
    uploadOne(item.file, id);
  }, [items, uploadOne]);

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    setItems(prev => prev.filter(it => it.id !== id));
  }, []);

  return { items, addFiles, cancel, retry, remove };
}
