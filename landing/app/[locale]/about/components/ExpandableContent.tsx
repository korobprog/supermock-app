'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ExpandableContentProps {
  translations: {
    readMore: string;
    hideDetails: string;
    authorIntro: string;
    problemDescription: string;
    solutionTitle: string;
    solutionText: string;
    experienceDescription: string;
    ideaTitle: string;
    ideaText: string;
    learningDescription: string;
    conclusion: string;
  };
}

export default function ExpandableContent({ translations }: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Button 
          variant="outline" 
          size="lg"
          className="neu-button hover:glow-primary transition-all duration-300"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? translations.hideDetails : translations.readMore}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-6 text-muted-foreground leading-relaxed animate-fade-in">
          <div className="space-y-4">
            <p>
              {translations.authorIntro}
            </p>
            
            <p>
              {translations.problemDescription}
            </p>

            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg border-l-4 border-primary">
              <h4 className="font-semibold text-foreground mb-2">{translations.solutionTitle}</h4>
              <p>
                {translations.solutionText}
              </p>
            </div>

            <p>
              {translations.experienceDescription}
            </p>

            <div className="bg-gradient-to-r from-accent/10 to-primary/10 p-6 rounded-lg border-l-4 border-accent">
              <h4 className="font-semibold text-foreground mb-2">{translations.ideaTitle}</h4>
              <p>
                {translations.ideaText}
              </p>
            </div>

            <p>
              {translations.learningDescription}
            </p>

            <div className="text-center p-6 bg-gradient-to-r from-secondary/10 to-accent/10 rounded-lg">
              <p className="text-lg font-medium text-foreground">
                {translations.conclusion}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}