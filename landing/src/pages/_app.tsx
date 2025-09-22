import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import '../i18n/index'; // Initialize i18n
import '../index.css';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Ensure i18n is initialized on client side
    if (typeof window !== 'undefined') {
      console.log('i18n initialized in _app.tsx');
    }
  }, []);

  return <Component {...pageProps} />;
}
