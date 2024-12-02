import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle } from "lucide-react";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

interface OnboardingProgressProps {
  progress?: {
    completedSteps: number;
    totalSteps: number;
    steps: OnboardingStep[];
  };
}

const defaultSteps: OnboardingStep[] = [
  {
    id: 1,
    title: "Onboarding & Checkliste",
    description: "Erste Schritte und Grundeinstellung",
    completed: true,
  },
  {
    id: 2,
    title: "Landingpage",
    description: "Erstellung und Optimierung der Landingpage",
    completed: false,
  },
  {
    id: 3,
    title: "Werbeanzeigen",
    description: "Einrichtung und Aktivierung von Werbekampagnen",
    completed: false,
  },
  {
    id: 4,
    title: "WhatsApp-Bot",
    description: "Integration der WhatsApp-Kommunikation",
    completed: false,
  },
  {
    id: 5,
    title: "CRM-System",
    description: "Implementierung des Kundenmanagements",
    completed: false,
  },
  {
    id: 6,
    title: "Webinar",
    description: "Durchführung von Online-Schulungen",
    completed: false,
  },
];

export default function OnboardingProgress({ progress }: OnboardingProgressProps) {
  const steps = progress?.steps || defaultSteps;
  const completedSteps = steps.filter((step) => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold tracking-tight">Ihre Fortschritte</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div className="relative pt-4">
            <Progress value={progressPercentage} className="h-3 rounded-lg bg-muted/30" />
            <span className="absolute right-0 top-0 text-sm font-medium text-muted-foreground">
              {Math.round(progressPercentage)}%
            </span>
          </div>

          <div className="relative">
            <div className="absolute left-0 right-0 h-0.5 -top-3 bg-gradient-to-r from-border/0 via-border to-border/0" />
            <div className="relative grid grid-cols-6 gap-6">
              {steps.map((step, index) => (
                <div key={step.id} className="group text-center">
                  <div className="flex justify-center mb-3">
                    {step.completed ? (
                      <div className="rounded-full bg-primary/10 p-2 ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-4">
                        <CheckCircle className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                      </div>
                    ) : (
                      <div className="rounded-full bg-muted/10 p-2 ring-2 ring-muted/20 transition-all duration-300 group-hover:ring-4">
                        <Circle className="h-6 w-6 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium leading-none tracking-tight">
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
