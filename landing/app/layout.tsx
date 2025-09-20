import type { Metadata, Viewport } from 'next'
import '../src/index.css'

export const viewport: Viewport = {
  themeColor: '#667eea',
}

// Default metadata for Russian (default locale)
export const metadata: Metadata = {
  title: 'Super Mock - AI-платформа для подготовки к собеседованиям на 6 языках | Реальные интервьюеры',
  description: 'Подготовьтесь к собеседованию на 6 языках с Super Mock. AI-анализ ответов, реальные интервьюеры, 10+ профессий. Персонализированная обратная связь и улучшение навыков.',
  keywords: 'собеседование, интервью, AI, искусственный интеллект, подготовка к работе, карьера, русский, английский, немецкий, французский, испанский, китайский, программирование, маркетинг, продажи, HR',
  authors: [{ name: 'Super Mock' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    url: 'https://supermock.ru/',
    title: 'Super Mock - AI-платформа для подготовки к собеседованиям на 6 языках',
    description: 'Подготовьтесь к собеседованию на 6 языках с Super Mock. AI-анализ ответов, реальные интервьюеры, 10+ профессий.',
    images: ['https://supermock.ru/og-image.jpg'],
    locale: 'ru_RU',
    alternateLocale: ['en_US', 'es_ES', 'fr_FR', 'de_DE', 'zh_CN'],
  },
  twitter: {
    card: 'summary_large_image',
    url: 'https://supermock.ru/',
    title: 'Super Mock - AI-платформа для подготовки к собеседованиям на 6 языках',
    description: 'Подготовьтесь к собеседованию на 6 языках с Super Mock. AI-анализ ответов, реальные интервьюеры, 10+ профессий.',
    images: ['https://supermock.ru/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://supermock.ru',
    languages: {
      'ru': 'https://supermock.ru',
      'en': 'https://supermock.ru/en',
      'es': 'https://supermock.ru/es',
      'fr': 'https://supermock.ru/fr',
      'de': 'https://supermock.ru/de',
      'zh': 'https://supermock.ru/zh',
      'x-default': 'https://supermock.ru',
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/logo_main.png" as="image" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Super Mock",
              "description": "AI-платформа для подготовки к собеседованиям на 6 языках",
              "url": "https://supermock.ru",
              "applicationCategory": "EducationalApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "1",
                "priceCurrency": "USD"
              },
              "inLanguage": ["ru", "en", "es", "fr", "de", "zh"]
            })
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
