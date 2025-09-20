import { useEffect } from 'react';
import { useUIStore } from '@/stores';

const MOBILE_BREAKPOINT = 1024;

export function useMobile() {
  const { isMobile, setIsMobile } = useUIStore();

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    return () => mql.removeEventListener("change", onChange);
  }, [setIsMobile]);

  return isMobile;
}
