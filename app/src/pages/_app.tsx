import type { AppProps } from 'next/app';

import '@/styles/globals.css';

export default function SuperMockDesktopApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
