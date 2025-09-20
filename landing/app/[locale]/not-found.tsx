import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full">
        <Card className="neu-card border-0">
          <CardHeader className="text-center">
            <div className="text-6xl font-bold gradient-primary bg-clip-text text-transparent mb-4">
              404
            </div>
            <CardTitle className="text-2xl mb-2">
              {t('notFound.title', { default: 'Page Not Found' })}
            </CardTitle>
            <CardDescription className="text-base">
              {t('notFound.description', { 
                default: 'The page you are looking for does not exist or has been moved.' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <Button asChild variant="hero" className="w-full">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  {t('notFound.goHome', { default: 'Go to Homepage' })}
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/pricing">
                  <Search className="w-4 h-4 mr-2" />
                  {t('notFound.explore', { default: 'Explore Our Platform' })}
                </Link>
              </Button>
            </div>
            
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                {t('notFound.help', { 
                  default: 'Need help? Contact our support team.' 
                })}
              </p>
              <Link 
                href="/support" 
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                {t('notFound.contactSupport', { default: 'Contact Support' })}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
