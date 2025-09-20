import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Search } from 'lucide-react';

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full">
        <Card className="neu-card border-0">
          <CardHeader className="text-center">
            <div className="text-6xl font-bold gradient-primary bg-clip-text text-transparent mb-4">
              404
            </div>
            <CardTitle className="text-2xl mb-2">
              Page Not Found
            </CardTitle>
            <CardDescription className="text-base">
              The page you are looking for does not exist or has been moved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <Button asChild variant="hero" className="w-full">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Homepage
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/pricing">
                  <Search className="w-4 h-4 mr-2" />
                  Explore Our Platform
                </Link>
              </Button>
            </div>
            
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Need help? Contact our support team.
              </p>
              <Link 
                href="/support" 
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                Contact Support
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
