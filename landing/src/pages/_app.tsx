import type { AppProps } from 'next/app';

import '@/styles/globals.css';

export default function SuperMockLanding({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
