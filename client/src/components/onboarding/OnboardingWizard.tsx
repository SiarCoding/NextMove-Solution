import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import ChecklistForm from "./ChecklistForm";

const steps = [
  {
    title: "Willkommen",
    description: "Erste Schritte im Portal",
  },
  {
    title: "Einführungsvideo",
    description: "Lernen Sie die wichtigsten Funktionen kennen",
  },
  {
    title: "Checkliste",
    description: "Wichtige Informationen für den Start",
  },
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = (currentStep / (steps.length - 1)) * 100;

  const [, navigate] = useLocation();

  const handleComplete = async () => {
    try {
      setCurrentStep(currentStep + 1);
      // Force navigation to dashboard
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0B] z-50 overflow-auto">
      <div className="container max-w-5xl mx-auto py-12">
        <div className="bg-[#141417]/80 w-full p-8 rounded-2xl border border-[#ffffff0f] shadow-2xl backdrop-blur-xl">
          <div className="space-y-10">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                {steps[currentStep].title}
              </h2>
              <p className="text-[#8F8F90] text-lg">
                {steps[currentStep].description}
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#8F8F90] font-medium">Fortschritt</span>
                <span className="text-[#ff5733] font-medium">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress
                value={progress}
                className="h-1.5 bg-[#1E1E20] [&>div]:bg-gradient-to-r [&>div]:from-[#ff5733] [&>div]:to-[#ff7a66]"
              />
              <div className="flex justify-between mt-4">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center ${index > 0 ? "ml-4" : ""}`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        currentStep > index
                          ? "bg-[#ff5733]"
                          : currentStep === index
                            ? "bg-[#ff5733]/50"
                            : "bg-[#2E2E32]"
                      }`}
                    />
                    <span className="ml-3 text-sm font-medium text-[#8F8F90]">
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {currentStep === 1 && (
              <div className="aspect-video bg-[#1E1E20] rounded-xl border border-[#ffffff0f] shadow-lg">
                {/* Video player component */}
              </div>
            )}
            {currentStep === 2 && <ChecklistForm onComplete={handleComplete} />}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="border-[#2E2E32] hover:bg-[#1E1E20] text-[#8F8F90] hover:text-white transition-colors"
              >
                Zurück
              </Button>
              <Button
                onClick={() =>
                  setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
                }
                disabled={currentStep === steps.length - 1}
                className="bg-[#ff5733] hover:bg-[#ff7a66] text-white shadow-lg transition-colors"
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
