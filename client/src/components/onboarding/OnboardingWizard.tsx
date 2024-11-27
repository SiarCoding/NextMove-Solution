import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";
import ChecklistForm from "./ChecklistForm";

const steps = [
  {
    title: "Willkommen",
    description: "Erste Schritte im Portal"
  },
  {
    title: "Einführungsvideo",
    description: "Lernen Sie die wichtigsten Funktionen kennen"
  },
  {
    title: "Checkliste",
    description: "Wichtige Informationen für den Start"
  }
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = (currentStep / (steps.length - 1)) * 100;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="container max-w-2xl mx-auto h-screen flex items-center">
        <div className="bg-card w-full p-6 rounded-xl border shadow-lg">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{steps[currentStep].title}</h2>
              <p className="text-muted-foreground">{steps[currentStep].description}</p>
            </div>

            <Progress value={progress} className="h-2" />

            {currentStep === 1 && (
              <div className="aspect-video bg-muted rounded-lg">
                {/* Video player component */}
              </div>
            )}

            {currentStep === 2 && (
              <ChecklistForm onComplete={() => setCurrentStep(currentStep + 1)} />
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                Zurück
              </Button>
              <Button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={currentStep === steps.length - 1}
              >
                Weiter
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
