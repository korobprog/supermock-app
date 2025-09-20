import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Navigation from './components/Navigation';
import { Metadata } from 'next';
import '../../src/index.css';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Generate metadata for each locale
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = await getMessages();
  
  // Get SEO translations for the current locale
  const seo = (messages as any)?.seo || {};
  
  // Map locale to OpenGraph locale format
  const localeMap: Record<string, string> = {
    'ru': 'ru_RU',
    'en': 'en_US',
    'es': 'es_ES',
    'fr': 'fr_FR',
    'de': 'de_DE',
    'zh': 'zh_CN',
  };
  
  const ogLocale = localeMap[locale] || 'ru_RU';
  const baseUrl = 'https://supermock.ru';
  const currentUrl = locale === 'ru' ? baseUrl : `${baseUrl}/${locale}`;
  
  return {
    title: seo.title || 'Super Mock - AI Interview Platform',
    description: seo.description || 'Prepare for your interview in 6 languages with AI-powered analysis and real interviewers.',
    keywords: seo.keywords || 'interview, mock interview, AI, artificial intelligence, job preparation, career',
    authors: [{ name: 'Super Mock' }],
    robots: 'index, follow',
    openGraph: {
      type: 'website',
      url: currentUrl,
      title: seo.ogTitle || seo.title || 'Super Mock - AI Interview Platform',
      description: seo.ogDescription || seo.description || 'Prepare for your interview in 6 languages with AI-powered analysis and real interviewers.',
      images: ['https://supermock.ru/og-image.jpg'],
      locale: ogLocale,
      alternateLocale: ['ru_RU', 'en_US', 'es_ES', 'fr_FR', 'de_DE', 'zh_CN'],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.twitterTitle || seo.title || 'Super Mock - AI Interview Platform',
      description: seo.twitterDescription || seo.description || 'Prepare for your interview in 6 languages with AI-powered analysis and real interviewers.',
      images: ['https://supermock.ru/og-image.jpg'],
    },
    alternates: {
      canonical: currentUrl,
      languages: {
        'ru': baseUrl,
        'en': `${baseUrl}/en`,
        'es': `${baseUrl}/es`,
        'fr': `${baseUrl}/fr`,
        'de': `${baseUrl}/de`,
        'zh': `${baseUrl}/zh`,
        'x-default': baseUrl,
      },
    },
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180' },
      ],
    },
    manifest: '/site.webmanifest',
    other: {
      'revisit-after': '7 days',
      'rating': 'general',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Props) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-screen bg-background">
        {/* Header with Language Switcher and Navigation */}
        <header className="border-b border-border/50 bg-background/95 backdrop-blur relative z-10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <a 
                href="/" 
                className="block transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 rounded-lg"
                aria-label="Super Mock - Главная страница"
              >
                <img 
                  src="/logo_main.png" 
                  alt="Super Mock Logo" 
                  className="h-10 w-auto"
                />
              </a>
              <div className="flex items-center gap-4">
                <Navigation />
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main>
          {children}
        </main>
      </div>
    </NextIntlClientProvider>
  );
}