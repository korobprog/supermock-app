import type { AppProps } from 'next/app';
import '../i18n'; // Initialize i18n
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
