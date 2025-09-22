import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import NavBar from '@/components/Layout/NavBar';
import '@/styles/globals.css';

export default function SuperMockDesktopApp({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <NavBar />
        <Component {...pageProps} />
      </div>
    </QueryClientProvider>
  );
}
