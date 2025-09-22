import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import LanguageSwitcherSimple from "@/components/LanguageSwitcherSimple";
import Link from "next/link";
import { useRouter } from "next/router";
import { Menu, X } from "lucide-react";
import { navigateToExternal, handleExternalClick } from "@/lib/utils";
import { useTranslation } from 'next-i18next';
import { useSafeUIStore } from "@/hooks/useSafeUIStore";

const Navigation = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useSafeUIStore();

  const isActive = (path: string) => {
    if (path === "/") {
      return router.pathname === "/";
    }
    return router.pathname.startsWith(path);
  };

  const menuItems = [
    { path: "/features", label: t('navigation.features') || 'Features' },
    { path: "/learning-process", label: t('navigation.learningProcess') || 'Process' },
    { path: "/professions", label: t('navigation.professions') || 'Professions' },
    { path: "/languages", label: t('navigation.languages') || 'Languages' },
    { path: "/pricing", label: t('navigation.pricing') || 'Pricing' },
    { path: "/support", label: t('navigation.support') || 'Support' },
    { path: "/about", label: t('navigation.about') || 'About' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Mobile Language Switcher */}
          <div className="flex items-center gap-4">
            <div onClick={closeMobileMenu}>
              {/* <Logo /> */}
              <div className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
                Super Mock
              </div>
            </div>
            {/* Mobile Language Switcher - visible only on mobile */}
            <div className="lg:hidden">
              <LanguageSwitcherSimple />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path || '/'}
                className={`transition-colors ${
                  isActive(item.path)
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden lg:flex items-center gap-4">
            <LanguageSwitcherSimple />
            <Button variant="outline" onClick={(e) => handleExternalClick('https://app.supermock.ru', e)}>
              {t('navigation.login') || 'Login'}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="p-2"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 neu-card-no-hover border-t border-border/50">
            <div className="container mx-auto px-6 py-4 space-y-4">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path || '/'}
                  onClick={closeMobileMenu}
                  className={`block py-2 transition-colors ${
                    isActive(item.path)
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-border/50 space-y-4">
                <div className="flex justify-center">
                  <LanguageSwitcherSimple />
                </div>
                <Button onClick={(e) => handleExternalClick('https://app.supermock.ru', e)} variant="outline" className="w-full">
                  {t('navigation.login')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
