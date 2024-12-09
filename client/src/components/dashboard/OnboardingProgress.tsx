import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

interface ProgressData {
  currentPhase: string;
  completedPhases: string[];
}

interface OnboardingProgressProps {
  isAdmin?: boolean;
  userId?: number;
  initialProgress?: ProgressData;
}

export const defaultSteps: OnboardingStep[] = [
  {
    id: 1,
    title: "Onboarding & Checkliste",
    description: "Erste Schritte und Grundeinstellung",
    completed: false,
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
    title: "Webinar",
    description: "Abschließendes Training und Schulung",
    completed: false,
  },
];

const calculateProgress = (phase: string, completedPhases: string[] = []): number => {
  // Wenn Onboarding abgeschlossen ist, zeige mindestens 20%
  if (completedPhases.includes("onboarding")) {
    switch (phase?.toLowerCase()) {
      case "onboarding":
        return 20; // Onboarding abgeschlossen = 20%
      case "landingpage":
        return 40;
      case "ads":
        return 60;
      case "whatsapp":
        return 80;
      case "webinar":
        return 100;
      default:
        return 20; // Mindestens 20% wenn Onboarding abgeschlossen
    }
  }

  // Wenn Onboarding nicht abgeschlossen ist, zeige 0%
  return 0;
};

const isStepCompleted = (step: OnboardingStep, currentPhase: string, completedPhases: string[] = []) => {
  // Für den ersten Schritt (Onboarding & Checkliste)
  if (step.id === 1) {
    return completedPhases.includes("onboarding");
  }

  const phaseOrder = {
    "onboarding": 1,
    "landingpage": 2,
    "ads": 3,
    "whatsapp": 4,
    "webinar": 5
  };

  const currentPhaseNumber = phaseOrder[currentPhase?.toLowerCase() as keyof typeof phaseOrder] || 1;
  return step.id <= currentPhaseNumber;
};

export default function OnboardingProgress({ isAdmin, userId, initialProgress }: OnboardingProgressProps) {
  const { data: progressData } = useQuery<ProgressData>({
    queryKey: ["progress", userId],
    queryFn: async () => {
      if (!userId) return initialProgress || { currentPhase: "onboarding", completedPhases: [] };
      const response = await axios.get("/api/customer/progress");
      return response.data;
    },
    initialData: initialProgress,
    refetchInterval: 0,
    enabled: !initialProgress
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-end mb-2">
          <span className="text-sm font-medium">
            {calculateProgress(progressData?.currentPhase || "onboarding", progressData?.completedPhases)}%
          </span>
        </div>
        <Progress value={calculateProgress(progressData?.currentPhase || "onboarding", progressData?.completedPhases)} />
      </div>
      
      <div className="grid gap-4">
        {defaultSteps.map((step) => (
          <div key={step.id} className="flex items-start gap-4">
            {isStepCompleted(step, progressData?.currentPhase || "onboarding", progressData?.completedPhases) ? (
              <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            )}
            <div>
              <div className="font-medium leading-none mb-1">{step.title}</div>
              <div className="text-sm text-muted-foreground">{step.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
