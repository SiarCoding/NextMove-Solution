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
    <div className="fixed inset-0 bg-[#1a1b1e] z-50">
      <div className="container max-w-2xl mx-auto h-screen flex items-center">
        <div className="bg-card/10 w-full p-8 rounded-xl border border-border/20 shadow-lg backdrop-blur-sm">
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">{steps[currentStep].title}</h2>
              <p className="text-gray-400">{steps[currentStep].description}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Fortschritt</span>
                <span className="text-orange-500">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-gray-800" indicatorClassName="bg-orange-500" />
              
              <div className="flex justify-between mt-2">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center ${index > 0 ? 'ml-4' : ''}`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${
                        currentStep > index
                          ? 'bg-orange-500'
                          : currentStep === index
                          ? 'bg-orange-500/50'
                          : 'bg-gray-700'
                      }`}
                    />
                    <span className="ml-2 text-xs text-gray-400">{step.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {currentStep === 1 && (
              <div className="aspect-video bg-gray-800 rounded-lg border border-border/20">
                {/* Video player component */}
              </div>
            )}

            {currentStep === 2 && (
              <ChecklistForm onComplete={() => {
                setCurrentStep(currentStep + 1);
                // Redirect to dashboard after completion
                window.location.href = '/dashboard';
              }} />
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="border-gray-700 hover:bg-gray-800 text-gray-300"
              >
                Zurück
              </Button>
              <Button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={currentStep === steps.length - 1}
                className="bg-orange-500 hover:bg-orange-600 text-white"
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
