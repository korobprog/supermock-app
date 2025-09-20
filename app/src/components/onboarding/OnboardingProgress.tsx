interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export default function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-slate-500">Progress</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <span
            key={index}
            className={`h-2 w-8 rounded-full ${index < currentStep ? 'bg-secondary' : 'bg-slate-700'}`}
          />
        ))}
      </div>
    </div>
  );
}
