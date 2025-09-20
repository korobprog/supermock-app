'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useEffect, useState } from 'react';

interface NavigationItem {
  href: string;
  label: string;
  icon?: string;
}

export default function Navigation() {
  const t = useTranslations();
  const pathname = usePathname();
  const [activeIndicator, setActiveIndicator] = useState({ left: 0, width: 0 });

  const navigationItems: NavigationItem[] = [
    { href: '/', label: t('navigation.home') },
    { href: '/features', label: t('navigation.features') },
    { href: '/learning-process', label: t('navigation.learningProcess') },
    { href: '/professions', label: t('navigation.professions') },
    { href: '/languages', label: t('navigation.languages') },
    { href: '/pricing', label: t('navigation.pricing') },
    { href: '/support', label: t('navigation.support'), icon: '💜' },
    { href: '/about', label: t('navigation.about') },
  ];

  useEffect(() => {
    const updateActiveIndicator = () => {
      const activeLink = document.querySelector(`a[data-active="true"]`);
      if (activeLink) {
        const nav = activeLink.closest('nav');
        if (nav) {
          const navRect = nav.getBoundingClientRect();
          const linkRect = activeLink.getBoundingClientRect();
          setActiveIndicator({
            left: linkRect.left - navRect.left,
            width: linkRect.width,
          });
        }
      }
    };

    // Update indicator after component mounts and when pathname changes
    const timer = setTimeout(updateActiveIndicator, 100);
    window.addEventListener('resize', updateActiveIndicator);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateActiveIndicator);
    };
  }, [pathname]);

  return (
    <nav className="hidden md:flex items-center space-x-6 relative">
      {navigationItems.map((item, index) => {
        const isActive = pathname === item.href;
        
        return (
          <Link
            key={index}
            href={item.href}
            data-active={isActive}
            className={`relative px-3 py-2 transition-all duration-300 rounded-md ${
              isActive 
                ? 'text-primary font-medium' 
                : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
            }`}
          >
            {item.icon && <span className="mr-1">{item.icon}</span>}
            {item.label}
          </Link>
        );
      })}
      
      {/* Active indicator */}
      <div
        className="absolute bottom-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent rounded-full shadow-lg shadow-primary/30 transition-all duration-500 ease-out"
        style={{
          left: `${activeIndicator.left}px`,
          width: `${activeIndicator.width}px`,
        }}
      />
    </nav>
  );
}
