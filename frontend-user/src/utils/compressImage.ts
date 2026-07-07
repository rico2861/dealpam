/**
 * Resize + re-encode an image client-side before upload. Phone camera photos
 * are routinely 3-8MB; sending several of those in one multipart submit over
 * a slow connection is what actually makes "publier un produit" feel stuck —
 * not the number of form fields. Shrinking to a sane max dimension + JPEG
 * quality cuts payload size by ~80-95% with no visible loss for a product
 * listing photo.
 */
export function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') { resolve(file); return; }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob || blob.size >= file.size) { resolve(file); return; }
        const name = file.name.replace(/\.\w+$/, '') + '.jpg';
        resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export async function compressImages(files: File[], maxDim = 1600, quality = 0.82): Promise<File[]> {
  return Promise.all(files.map(f => compressImage(f, maxDim, quality)));
}
