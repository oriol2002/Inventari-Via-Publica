import React, { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  alt?: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  loading?: 'lazy' | 'eager';
}

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';

const LazyImage: React.FC<Props> = ({ src, alt = '', className, onClick, loading = 'lazy' }) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!imgRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isVisible ? src : TRANSPARENT_PIXEL}
      alt={alt}
      className={className}
      onClick={onClick}
      loading={loading}
      decoding="async"
      fetchPriority={loading === 'lazy' ? 'low' : 'auto'}
    />
  );
};

export default LazyImage;
