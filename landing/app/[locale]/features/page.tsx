import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ClientButton from '../components/ClientButton';
import { 
  Mic, 
  Code, 
  MessageCircle, 
  BarChart3, 
  FileText, 
  Gamepad2,
  Lightbulb,
  Zap,
  Shield,
  Globe,
  Users,
  Target,
} from "lucide-react";

export default async function FeaturesPage() {
  const t = await getTranslations();

  const mainFeatures = [
    { 
      icon: Mic, 
      title: t('features.webrtc.title'), 
      description: t('features.webrtc.description'),
      details: t('features.webrtc.details', { defaultValue: 'Real-time voice and video communication with AI interviewer' })
    },
    { 
      icon: Code, 
      title: t('features.coding.title'), 
      description: t('features.coding.description'),
      details: t('features.coding.details', { defaultValue: 'Interactive coding challenges with real-time evaluation' })
    },
    { 
      icon: MessageCircle, 
      title: t('features.chat.title'), 
      description: t('features.chat.description'),
      details: t('features.chat.details', { defaultValue: 'AI-powered chat for questions and clarifications' })
    },
    { 
      icon: BarChart3, 
      title: t('features.ai.title'), 
      description: t('features.ai.description'),
      details: t('features.ai.details', { defaultValue: 'Advanced AI analysis of your performance and skills' })
    },
    { 
      icon: FileText, 
      title: t('features.feedback.title'), 
      description: t('features.feedback.description'),
      details: t('features.feedback.details', { defaultValue: 'Detailed feedback and improvement recommendations' })
    },
    { 
      icon: Gamepad2, 
      title: t('features.learning.title'), 
      description: t('features.learning.description'),
      details: t('features.learning.details', { defaultValue: 'Gamified learning experience with progress tracking' })
    }
  ];

  const additionalFeatures = [
    { icon: Zap, title: t('features.performance.title', { defaultValue: 'High Performance' }), description: t('features.performance.description', { defaultValue: 'Optimized for speed and reliability' }) },
    { icon: Shield, title: t('features.security.title', { defaultValue: 'Secure' }), description: t('features.security.description', { defaultValue: 'Your data is protected with enterprise-grade security' }) },
    { icon: Globe, title: t('features.multilingual.title', { defaultValue: 'Multilingual' }), description: t('features.multilingual.description', { defaultValue: 'Available in 6 languages worldwide' }) },
    { icon: Users, title: t('features.community.title', { defaultValue: 'Community' }), description: t('features.community.description', { defaultValue: 'Join thousands of learners worldwide' }) },
    { icon: Target, title: t('features.personalized.title', { defaultValue: 'Personalized' }), description: t('features.personalized.description', { defaultValue: 'AI adapts to your learning style and pace' }) },
    { icon: Lightbulb, title: t('features.smart.title', { defaultValue: 'Smart Learning' }), description: t('features.smart.description', { defaultValue: 'Intelligent recommendations and adaptive content' }) }
  ];

  return (
    <div className="min-h-screen pt-24">
      {/* Hero Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                {t('features.title')}{" "}
                <span className="gradient-primary bg-clip-text text-transparent">
                  {t('features.titleHighlight')}
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                {t('features.subtitle')}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <ClientButton 
                variant="hero" 
                size="xl" 
                className="wave-shimmer"
                href="https://app.supermock.ru"
              >
                {t('features.tryNow', { defaultValue: 'Try Now' })}
              </ClientButton>
              <ClientButton 
                variant="hero-secondary" 
                size="xl"
                href="/pricing"
              >
                {t('features.viewPricing', { defaultValue: 'View Pricing' })}
              </ClientButton>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              {t('features.mainFeatures.title', { defaultValue: 'Core Features' })}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('features.mainFeatures.subtitle', { defaultValue: 'Everything you need to ace your next interview' })}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="neu-card border-0 hover:glow-primary transition-all duration-300 hover:scale-105 cursor-pointer group">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base font-medium text-muted-foreground">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.details}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="py-16 px-6 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              {t('features.additional.title', { defaultValue: 'Why Choose SuperMock?' })}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('features.additional.subtitle', { defaultValue: 'Built with modern technology and user experience in mind' })}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {additionalFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="neu-card border-0 hover:glow-secondary transition-all duration-300 hover:scale-105 cursor-pointer group">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-2xl gradient-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="neu-card border-0 bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardContent className="p-12">
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <Lightbulb className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-bold text-foreground">
                    {t('features.cta.title', { defaultValue: 'Ready to Start Your Journey?' })}
                  </h2>
                  
                  <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                    {t('features.cta.subtitle', { defaultValue: 'Join thousands of professionals who have improved their interview skills with SuperMock' })}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <ClientButton 
                      variant="hero" 
                      size="xl" 
                      className="wave-shimmer"
                      href="https://app.supermock.ru"
                    >
                      {t('features.cta.startNow', { defaultValue: 'Start Now' })}
                    </ClientButton>
                    <ClientButton 
                      variant="outline" 
                      size="xl"
                      href="/about"
                    >
                      {t('features.cta.learnMore', { defaultValue: 'Learn More' })}
                    </ClientButton>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
