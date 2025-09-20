'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Code,  
  MessageSquare, 
  Brain,
  BookOpen,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  Languages,
  Briefcase,
  Settings,
  Video,
  Play
} from "lucide-react";

export default function LearningProcessPage() {
  const t = useTranslations();
  const router = useRouter();

  const languages = [
    { code: "🇺🇸", name: "English" },
    { code: "🇷🇺", name: "Russian" },
    { code: "🇪🇸", name: "Spanish" },
    { code: "🇫🇷", name: "French" },
    { code: "🇩🇪", name: "German" },
    { code: "🇨🇳", name: "Chinese" }
  ];

  const professions = [
    "Frontend Developer",
    "Backend Developer", 
    "Fullstack Developer",
    "Mobile Developer",
    "DevOps Engineer",
    "QA Engineer",
    "UX/UI Designer",
    "Data Analyst",
    "Data Scientist",
    "Product Manager"
  ];

  const processSteps = [
    {
      id: 1,
      title: t("learningProcess.processSteps.step1.title"),
      description: t("learningProcess.processSteps.step1.description"),
      icon: Languages,
      iconColor: "gradient-primary",
      details: t("learningProcess.processSteps.step1.details")
    },
    {
      id: 2,
      title: t("learningProcess.processSteps.step2.title"),
      description: t("learningProcess.processSteps.step2.description"),
      icon: Briefcase,
      iconColor: "gradient-secondary",
      details: t("learningProcess.processSteps.step2.details")
    },
    {
      id: 3,
      title: t("learningProcess.processSteps.step3.title"),
      description: t("learningProcess.processSteps.step3.description"),
      icon: Settings,
      iconColor: "gradient-accent",
      details: t("learningProcess.processSteps.step3.details")
    },
    {
      id: 4,
      title: t("learningProcess.processSteps.step4.title"),
      description: t("learningProcess.processSteps.step4.description"),
      icon: Video,
      iconColor: "gradient-primary",
      details: t("learningProcess.processSteps.step4.details")
    },
    {
      id: 5,
      title: t("learningProcess.processSteps.step5.title"),
      description: t("learningProcess.processSteps.step5.description"),
      icon: CheckCircle,
      iconColor: "gradient-secondary",
      details: t("learningProcess.processSteps.step5.details")
    },
    {
      id: 6,
      title: t("learningProcess.processSteps.step6.title"),
      description: t("learningProcess.processSteps.step6.description"),
      icon: Brain,
      iconColor: "gradient-accent",
      details: t("learningProcess.processSteps.step6.details")
    },
    {
      id: 7,
      title: t("learningProcess.processSteps.step7.title"),
      description: t("learningProcess.processSteps.step7.description"),
      icon: BookOpen,
      iconColor: "gradient-primary",
      details: t("learningProcess.processSteps.step7.details")
    },
    {
      id: 8,
      title: t("learningProcess.processSteps.step8.title"),
      description: t("learningProcess.processSteps.step8.description"),
      icon: RefreshCw,
      iconColor: "gradient-secondary",
      details: t("learningProcess.processSteps.step8.details")
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            {t("learningProcess.hero.title")} <span className="gradient-primary bg-clip-text text-transparent">{t("learningProcess.hero.titleHighlight")}</span>
          </h1>
          <p className="text-xl text-foreground max-w-3xl mx-auto mb-8">
            {t("learningProcess.hero.subtitle")}
          </p>
          <Button 
            variant="default" 
            size="lg" 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => window.open('https://app.supermock.ru', '_blank')}
          >
            <Play className="mr-2 h-5 w-5" />
            {t("learningProcess.hero.startLearning")}
          </Button>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              {t("learningProcess.processSteps.title")}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t("learningProcess.processSteps.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={step.id} className="neu-card border-0 hover:glow-primary transition-all duration-300 hover:scale-105">
                  <CardHeader className="text-center">
                    <div className={`w-16 h-16 rounded-2xl ${step.iconColor} flex items-center justify-center mx-auto mb-4`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription className="text-sm">{step.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center">{step.details}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Languages Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              {t("learningProcess.languagesSection.title")} <span className="gradient-primary bg-clip-text text-transparent">{t("learningProcess.languagesSection.titleHighlight")}</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              {t("learningProcess.languagesSection.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {languages.map((language, index) => (
              <Card key={index} className="neu-card border-0 hover:glow-accent transition-all duration-300 hover:scale-105 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">{language.code}</div>
                  <h3 className="font-medium">{language.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Professions Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              {t("learningProcess.professionsSection.title")} <span className="gradient-secondary bg-clip-text text-transparent">{t("learningProcess.professionsSection.titleHighlight")}</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              {t("learningProcess.professionsSection.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {professions.map((profession, index) => (
              <Badge key={index} variant="secondary" className="p-4 text-center text-sm">
                {profession}
              </Badge>
            ))}
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
                  {t("learningProcess.cta.title")} <span className="gradient-accent bg-clip-text text-transparent">{t("learningProcess.cta.titleHighlight")}</span> {t("learningProcess.cta.titleSuffix")}
                </h2>
                <p className="text-xl text-muted-foreground">
                  {t("learningProcess.cta.subtitle")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    variant="default" 
                    size="lg" 
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => window.open('https://app.supermock.ru', '_blank')}
                  >
                    <Play className="mr-2 h-5 w-5" />
                    {t("learningProcess.cta.startLearning")}
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => router.push('/pricing')}>
                    <ArrowRight className="mr-2 h-5 w-5" />
                    {t("learningProcess.cta.comparePlans")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
