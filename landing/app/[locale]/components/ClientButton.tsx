'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';

interface ClientButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "hero" | "hero-secondary";
  size?: "default" | "sm" | "lg" | "icon" | "xl";
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}

export default function ClientButton({ 
  variant = "default", 
  size = "default", 
  className = "", 
  children, 
  onClick,
  href 
}: ClientButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      if (href.startsWith('http')) {
        window.open(href, '_blank');
      } else {
        router.push(href);
      }
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
}
