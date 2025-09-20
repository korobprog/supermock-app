'use client';

import { useState } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
}

export default function ImageWithFallback({ 
  src, 
  alt, 
  className = '', 
  fallbackText = 'Image not available' 
}: ImageWithFallbackProps) {
  const [imageError, setImageError] = useState(false);

  const handleError = () => {
    console.error(`Image failed to load: ${src}`);
    setImageError(true);
  };

  if (imageError) {
    return (
      <div className={`flex items-center justify-center bg-muted/20 rounded-lg ${className}`}>
        <span className="text-muted-foreground text-sm">{fallbackText}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      onError={handleError}
    />
  );
}
