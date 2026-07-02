import { useState, useRef, useEffect, CSSProperties } from 'react';

export interface ImageSet {
  urlThumb?: string;   // 380px — card grids
  urlMedium?: string;  // 700px — search / zoom
  urlFull?: string;    // 1400px — product detail
  url?: string;        // legacy fallback
}

interface Props {
  images: ImageSet;
  alt: string;
  /**
   * 'card'   → uses urlThumb, lazy, low fetchpriority
   * 'detail' → uses urlFull with blur-up from urlThumb, eager on first image
   * 'medium' → uses urlMedium, lazy
   */
  mode?: 'card' | 'detail' | 'medium';
  style?: CSSProperties;
  className?: string;
  eager?: boolean;
  onClick?: () => void;
}

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';

export default function OptimizedImg({ images, alt, mode = 'card', style, className, eager, onClick }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [blurSrc, setBlurSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);

  const thumb  = images.urlThumb  || images.url || '';
  const medium = images.urlMedium || thumb;
  const full   = images.urlFull   || medium;

  // Choose correct src based on mode
  const mainSrc = mode === 'detail' ? full : mode === 'medium' ? medium : thumb;

  // Blur-up: preload thumb as placeholder while full loads on detail mode
  useEffect(() => {
    if (mode !== 'detail' || !thumb) return;
    const img = new Image();
    img.src = thumb;
    img.onload = () => setBlurSrc(thumb);
  }, [thumb, mode]);

  // Mark loaded if already complete (cached)
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  const isEager = eager || mode === 'detail';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Blur placeholder (detail mode only) */}
      {mode === 'detail' && blurSrc && !loaded && (
        <img
          src={blurSrc}
          alt=""
          aria-hidden
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'inherit', filter: 'blur(12px)', transform: 'scale(1.05)',
            transition: 'opacity 0.3s', opacity: loaded ? 0 : 1,
          }}
        />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={mainSrc || PLACEHOLDER}
        alt={alt}
        loading={isEager ? 'eager' : 'lazy'}
        decoding={isEager ? 'sync' : 'async'}
        fetchPriority={isEager ? 'high' : 'low'}
        onLoad={() => setLoaded(true)}
        onClick={onClick}
        className={className}
        style={{
          width: '100%', height: '100%', display: 'block',
          objectFit: 'cover',
          transition: mode === 'detail' ? 'opacity 0.35s ease' : undefined,
          opacity: mode === 'detail' ? (loaded ? 1 : 0) : 1,
          ...style,
        }}
      />
    </div>
  );
}
