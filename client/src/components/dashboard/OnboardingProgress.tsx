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
    <Card>
      <CardHeader>
        <CardTitle>Ihre Fortschritte</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Progress value={progressPercentage} className="h-2" />

          <div className="relative">
            <div className="absolute left-0 right-0 h-0.5 -top-3 bg-border" />
            <div className="relative grid grid-cols-6 gap-4">
              {steps.map((step, index) => (
                <div key={step.id} className="text-center">
                  <div className="flex justify-center mb-2">
                    {step.completed ? (
                      <CheckCircle className="h-6 w-6 text-primary" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
