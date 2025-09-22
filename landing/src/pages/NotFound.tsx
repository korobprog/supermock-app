import { useRouter } from "next/router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Footer from "@/components/Footer";
import type { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { nextI18NextConfig } from "@/i18n";

const NotFound = () => {
  const router = useRouter();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      router.asPath
    );
  }, [router.asPath]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-center min-h-[80vh] px-6">
        <Card className="neu-card border-0 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="text-6xl font-bold gradient-primary bg-clip-text text-transparent">
                404
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Page Not Found</h1>
                <p className="text-muted-foreground">
                  The page you're looking for doesn't exist.
                </p>
              </div>
              <Button 
                variant="hero" 
                onClick={() => router.push('/')}
                className="w-full"
              >
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(
      locale ?? nextI18NextConfig.i18n?.defaultLocale ?? 'en',
      ['common'],
      nextI18NextConfig,
    )),
  },
});

export default NotFound;
