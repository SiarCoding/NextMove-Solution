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

const calculateProgress = (phase: string): number => {
  switch (phase?.toLowerCase()) {
    case "onboarding":
    case "checkliste":
      return 20;
    case "landingpage":
    case "setup":
      return 40;
    case "ads":
    case "werbung":
      return 60;
    case "whatsapp":
      return 80;
    case "webinar":
      return 100;
    default:
      return 20;
  }
};

const isStepCompleted = (step: OnboardingStep, currentPhase: string) => {
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

  const progress = calculateProgress(progressData?.currentPhase || "onboarding");
  const currentPhase = progressData?.currentPhase || "onboarding";

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between gap-2">
        {defaultSteps.map((step) => {
          const isCompleted = isStepCompleted(step, currentPhase);
          return (
            <div key={step.id} className="flex flex-col items-center text-center flex-1">
              <div className="mb-2">
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-primary transition-all duration-300 transform scale-100" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground transition-all duration-300 transform scale-100" />
                )}
              </div>
              <div className="text-sm font-medium mb-1">{step.title}</div>
              <div className="text-xs text-muted-foreground leading-tight">
                {step.description}
              </div>
            </div>
          );
        })}
      </div>
      <Progress 
        value={progress} 
        className="h-2 transition-all duration-500 ease-in-out" 
      />
    </div>
  );
}
