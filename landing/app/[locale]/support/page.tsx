"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Heart,
  Users,
  Clock,
  MessageCircle,
  Gift,
  Shield,
  ArrowRight,
  CheckCircle,
  Mail,
} from "lucide-react";
import Footer from "@/components/Footer";
import { useTranslations } from 'next-intl';

export default function SupportPage() {
  const t = useTranslations('support');
  
  const supportOptions = [
    {
      icon: Gift,
      title: t('supportOptions.freeLearning.title'),
      description: t('supportOptions.freeLearning.description'),
      features: [
        t('supportOptions.freeLearning.features.feature1'),
        t('supportOptions.freeLearning.features.feature2'),
        t('supportOptions.freeLearning.features.feature3')
      ],
      color: "gradient-primary",
      badge: "Free"
    },
    {
      icon: Shield,
      title: t('supportOptions.discounts.title'),
      description: t('supportOptions.discounts.description'),
      features: [
        t('supportOptions.discounts.features.feature1'),
        t('supportOptions.discounts.features.feature2'),
        t('supportOptions.discounts.features.feature3')
      ],
      color: "gradient-secondary",
      badge: "Up to 50%"
    }
  ];

  const steps = [
    {
      number: "1️⃣",
      title: t('howItWorks.steps.step1.title'),
      description: t('howItWorks.steps.step1.description'),
      icon: MessageCircle,
      color: "gradient-primary"
    },
    {
      number: "2️⃣",
      title: t('howItWorks.steps.step2.title'),
      description: t('howItWorks.steps.step2.description'),
      icon: Clock,
      color: "gradient-secondary"
    },
    {
      number: "3️⃣",
      title: t('howItWorks.steps.step3.title'),
      description: t('howItWorks.steps.step3.description'),
      icon: Heart,
      color: "gradient-accent"
    }
  ];

  const stats = [
    {
      icon: Gift,
      value: t('socialImpact.stats.donations.value'),
      description: t('socialImpact.stats.donations.description'),
      color: "text-neon-green"
    },
    {
      icon: Users,
      value: t('socialImpact.stats.peopleHelped.value'),
      description: t('socialImpact.stats.peopleHelped.description'),
      color: "text-neon-cyan"
    },
    {
      icon: Clock,
      value: t('socialImpact.stats.responseTime.value'),
      description: t('socialImpact.stats.responseTime.description'),
      color: "text-neon-purple"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            <span className="gradient-primary bg-clip-text text-transparent">{t('hero.title')}</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {t('hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="hero" 
              size="lg"
              onClick={() => window.open('https://t.me/korobprog', '_blank')}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              {t('cta.buttonText')}
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => window.location.href = '/instructions'}
            >
              <Mail className="mr-2 h-5 w-5" />
              📖 Help
            </Button>
          </div>
        </div>
      </section>

      {/* Support Options Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Support <span className="gradient-accent bg-clip-text text-transparent">Options</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              We offer various support options to help you access learning opportunities
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {supportOptions.map((option, index) => {
              const Icon = option.icon;
              
              return (
                <Card key={index} className="neu-card border-0 hover:glow-primary transition-all duration-300 hover:scale-105">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl ${option.color} flex items-center justify-center`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant="secondary" className="bg-neon-green/20 text-neon-green border-neon-green/30">
                        {option.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl">{option.title}</CardTitle>
                    <CardDescription className="text-base">{option.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {option.features.map((feature: string, featureIndex: number) => (
                        <div key={featureIndex} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-neon-green mt-0.5 flex-shrink-0" />
                          <span className="text-sm leading-relaxed">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              {t('howItWorks.title')} <span className="gradient-primary bg-clip-text text-transparent">{t('howItWorks.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="neu-card border-0 hover:glow-accent transition-all duration-300">
                  <CardContent className="p-8 text-center">
                    <div className="flex items-center justify-center gap-4 mb-6">
                      <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-2xl font-bold">{step.number}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-4">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Impact Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              {t('socialImpact.title')} <span className="gradient-secondary bg-clip-text text-transparent">Impact</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Our commitment to making learning accessible to everyone
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="neu-card border-0 hover:glow-primary transition-all duration-300">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full gradient-accent flex items-center justify-center mx-auto mb-6">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className={`text-4xl font-bold mb-2 ${stat.color}`}>{stat.value}</div>
                    <p className="text-muted-foreground leading-relaxed">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto text-center">
          <Card className="neu-card border-0 max-w-4xl mx-auto">
            <CardContent className="p-12">
              <div className="space-y-6">
                <h2 className="text-4xl font-bold">
                  {t('cta.title')} <span className="gradient-accent bg-clip-text text-transparent">{t('cta.titleHighlight')}</span>{t('cta.titleSuffix')}
                </h2>
                <p className="text-xl text-muted-foreground">
                  {t('cta.subtitle')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    variant="hero" 
                    size="xl" 
                    className="wave-shimmer"
                    onClick={() => window.open('https://t.me/korobprog', '_blank')}
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    {t('cta.buttonText')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="xl" 
                    onClick={() => window.location.href = 'https://app.supermock.ru'}
                  >
                    <ArrowRight className="mr-2 h-5 w-5" />
                    Start Learning
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  {t('cta.responseTime')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
