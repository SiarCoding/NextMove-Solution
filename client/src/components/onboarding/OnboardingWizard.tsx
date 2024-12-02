import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import ChecklistForm from "./ChecklistForm";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = (currentStep / (steps.length - 1)) * 100;

  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/customer/onboarding/complete", {
        method: "POST",
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to complete onboarding");
      }

      await queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError("Fehler beim Abschließen des Onboardings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-4">
            <h3 className="text-xl text-white">
              Willkommen im NextMove Portal
            </h3>
            <p className="text-[#8F8F90]">
              Lassen Sie uns gemeinsam die ersten Schritte gehen
            </p>
            <Button
              onClick={() => setCurrentStep(1)}
              className="bg-[#ff5733] hover:bg-[#ff7a66] text-white"
            >
              Starten
            </Button>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="aspect-video bg-[#1E1E20] rounded-lg" />
            <Button
              onClick={() => setCurrentStep(2)}
              className="bg-[#ff5733] hover:bg-[#ff7a66] text-white"
            >
              Video abgeschlossen
            </Button>
          </div>
        );
      case 2:
        return <ChecklistForm onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0B] z-50 overflow-auto">
      <div className="container max-w-5xl mx-auto py-12">
        <div className="bg-[#141417]/80 w-full p-8 rounded-2xl border border-[#ffffff0f] shadow-2xl backdrop-blur-xl">
          <div className="space-y-10">
            {/* Progress header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-white">
                  {steps[currentStep].title}
                </h2>
                <span className="text-sm text-[#8F8F90]">
                  Schritt {currentStep + 1} von {steps.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Step content */}
            <div className="space-y-6">
              {renderStepContent()}
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
