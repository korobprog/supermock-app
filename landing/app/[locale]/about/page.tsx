'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Code, 
  Brain, 
  MessageCircle, 
  Target, 
  Mail,
  Linkedin,
  Github,
  Send
} from 'lucide-react';
import ClientButton from '../components/ClientButton';
import TechnologySection from '@/components/TechnologySection';
import ProfilePhoto from './components/ProfilePhoto';
import ExpandableContent from './components/ExpandableContent';

export default function AboutPage() {
  const t = useTranslations();
  
  const skills = [
    { 
      name: t('about.page.skill1.name'), 
      icon: Brain, 
      color: "gradient-primary",
      gradient: "from-blue-500/60 via-purple-500/40 to-pink-500/60",
      description: t('about.page.skill1.description')
    },
    { 
      name: t('about.page.skill2.name'), 
      icon: Code, 
      color: "gradient-secondary",
      gradient: "from-green-500/60 via-cyan-500/40 to-blue-500/60",
      description: t('about.page.skill2.description')
    },
    { 
      name: t('about.page.skill3.name'), 
      icon: MessageCircle, 
      color: "gradient-accent",
      gradient: "from-orange-500/60 via-yellow-500/40 to-red-500/60",
      description: t('about.page.skill3.description')
    },
    { 
      name: t('about.page.skill4.name'), 
      icon: Target, 
      color: "gradient-primary",
      gradient: "from-purple-500/60 via-pink-500/40 to-indigo-500/60",
      description: t('about.page.skill4.description')
    }
  ];

  const projectFeatures = [
    t('about.page.feature1'),
    t('about.page.feature2'),
    t('about.page.feature3'),
    t('about.page.feature4')
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="w-fit">
                  <User className="w-4 h-4 mr-2" />
                  {t('about.page.badge')}
                </Badge>
                <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                  {t('about.page.name').split(' ')[0]}{" "}
                  <span className="gradient-primary bg-clip-text text-transparent">
                    {t('about.page.name').split(' ').slice(1).join(' ')}
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {t('about.page.subtitle')}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <ClientButton 
                  variant="hero" 
                  size="xl" 
                  className="wave-shimmer hover:scale-105 transition-all duration-300"
                  href="mailto:korobprog@gmail.com"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  {t('about.page.contact')}
                </ClientButton>
              </div>
            </div>

            {/* Profile Image */}
            <div className="relative">
              <div className="neu-card p-8 rounded-full w-80 h-80 flex items-center justify-center animate-photo-glow">
                <ProfilePhoto 
                  src="/my2.png" 
                  alt={t('about.page.name')} 
                  size="xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Project Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                {t('about.page.projectTitle')}{" "}
                <span className="gradient-primary bg-clip-text text-transparent">
                  SuperMock
                </span>
              </h2>
              <p className="text-xl text-muted-foreground">
                {t('about.page.projectSubtitle')}
              </p>
            </div>

            <Card className="neu-card border-0">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Minimalist intro */}
                  <div className="text-center space-y-4">
                    <h3 className="text-2xl font-semibold">{t('about.page.principles')}</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {t('about.page.principlesText')}
                    </p>
                  </div>

                  {/* Expandable content */}
                  <ExpandableContent 
                    translations={{
                      readMore: t('about.page.readMore'),
                      hideDetails: t('about.page.hideDetails'),
                      authorIntro: t('about.page.authorIntro'),
                      problemDescription: t('about.page.problemDescription'),
                      solutionTitle: t('about.page.solutionTitle'),
                      solutionText: t('about.page.solutionText'),
                      experienceDescription: t('about.page.experienceDescription'),
                      ideaTitle: t('about.page.ideaTitle'),
                      ideaText: t('about.page.ideaText'),
                      learningDescription: t('about.page.learningDescription'),
                      conclusion: t('about.page.conclusion')
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                {t('about.page.featuresTitle')}
              </h2>
              <p className="text-xl text-muted-foreground">
                {t('about.page.featuresSubtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {projectFeatures.map((feature, index) => (
                <Card key={index} className="neu-card border-0 hover:scale-105 transition-transform cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
                      <span className="text-lg text-muted-foreground">{feature}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <TechnologySection />

      {/* Skills Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">
              {t('about.page.skillsTitle')}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('about.page.skillsSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skills.map((skill, index) => (
              <Card key={index} className="neu-card hover:scale-105 transition-transform cursor-pointer group overflow-hidden">
                <div className="relative">
                  {/* Background Image */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-all duration-300"></div>
                  
                  {/* Gradient Background */}
                  <div className="relative h-32 overflow-hidden rounded-t-lg">
                    <div className={`absolute inset-0 bg-gradient-to-br ${skill.gradient} group-hover:scale-110 transition-transform duration-300`}></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent"></div>
                  </div>
                  
                  {/* Icon overlay */}
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <skill.icon className={`w-5 h-5 text-white`} />
                  </div>
                  
                  {/* Decorative elements */}
                  <div className="absolute bottom-4 left-4 w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm"></div>
                  <div className="absolute top-6 left-6 w-3 h-3 rounded-full bg-white/20 backdrop-blur-sm"></div>
                </div>
                
                <CardHeader className="text-center pt-4">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">{skill.name}</CardTitle>
                  {skill.description && (
                    <CardDescription className="text-sm leading-tight group-hover:text-foreground/80 transition-colors duration-300">
                      {skill.description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <Card className="neu-card max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {t('about.page.collaborationTitle')}
              </CardTitle>
              <CardDescription className="text-lg">
                {t('about.page.collaborationSubtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <ClientButton 
                  variant="outline" 
                  className="w-full"
                  href="mailto:korobprog@gmail.com"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {t('about.page.email')}
                </ClientButton>
                <ClientButton 
                  variant="outline" 
                  className="w-full"
                  href="https://www.linkedin.com/in/korobprog/"
                >
                  <Linkedin className="w-4 h-4 mr-2" />
                  {t('about.page.linkedin')}
                </ClientButton>
                <ClientButton 
                  variant="outline" 
                  className="w-full"
                  href="https://github.com/korobprog"
                >
                  <Github className="w-4 h-4 mr-2" />
                  {t('about.page.github')}
                </ClientButton>
                <ClientButton 
                  variant="outline" 
                  className="w-full"
                  href="https://t.me/korobprog"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {t('about.page.telegram')}
                </ClientButton>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
