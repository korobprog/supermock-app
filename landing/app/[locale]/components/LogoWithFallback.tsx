'use client';

import { useState } from 'react';

interface LogoWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
}

export default function LogoWithFallback({ 
  src, 
  alt, 
  className = '', 
  fallbackText = 'Super Mock' 
}: LogoWithFallbackProps) {
  const [imageError, setImageError] = useState(false);

  const handleError = () => {
    console.error(`Logo failed to load: ${src}`);
    setImageError(true);
  };

  if (imageError) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
          {fallbackText}
        </span>
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
