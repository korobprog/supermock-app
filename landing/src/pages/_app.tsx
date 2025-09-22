import Layout from "@/components/Layout";
import type { AppProps } from "next/app";
import { appWithTranslation } from "next-i18next";
import "../index.css";

function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default appWithTranslation(App);
