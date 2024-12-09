import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import ChecklistForm from "./ChecklistForm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

interface OnboardingVideo {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  isOnboarding: boolean;
  createdAt: string;
}

const steps = [
  {
    title: "Willkommen",
    description: "Erste Schritte im Portal",
  },
  {
    title: "Einführungsvideos",
    description: "Lernen Sie die wichtigsten Funktionen kennen",
  },
  {
    title: "Checkliste",
    description: "Wichtige Informationen für den Start",
  },
];

export default function OnboardingWizard() {
  const { user, refetchUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoWatched, setVideoWatched] = useState<boolean[]>([]);
  const [videoStarted, setVideoStarted] = useState(false);
  const progress = (currentStep / (steps.length - 1)) * 100;

  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    // If user has completed onboarding, redirect to dashboard
    if (user?.onboardingCompleted) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const { data: onboardingVideos, isLoading, error: fetchError } = useQuery<OnboardingVideo[]>({
    queryKey: ['onboarding-videos'],
    queryFn: async () => {
      const response = await fetch('/api/onboarding-videos');
      if (!response.ok) {
        throw new Error('Failed to fetch onboarding videos');
      }
      const data = await response.json();
      console.log('Fetched onboarding videos:', data);
      setVideoWatched(new Array(data.length).fill(false));
      return data;
    },
  });

  const currentVideo = onboardingVideos?.[currentVideoIndex];
  const isLastVideo = currentVideoIndex === (onboardingVideos?.length ?? 0) - 1;

  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement;
    if (video.currentTime / video.duration >= 0.95) {
      const newVideoWatched = [...videoWatched];
      newVideoWatched[currentVideoIndex] = true;
      setVideoWatched(newVideoWatched);
    }
  };

  const handleVideoEnded = () => {
    const newVideoWatched = [...videoWatched];
    newVideoWatched[currentVideoIndex] = true;
    setVideoWatched(newVideoWatched);
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < (onboardingVideos?.length ?? 0) - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
      setVideoStarted(false); // Reset videoStarted state for the next video
    } else {
      setCurrentStep(2); 
    }
  };

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Update onboarding status
      const response = await fetch('/api/customer/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      await queryClient.invalidateQueries({ queryKey: ["progress"] });
      
      // Refresh user data
      await refetchUser();

      // Navigate to dashboard and replace current history entry
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Error completing onboarding:", err);
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
            {onboardingVideos && onboardingVideos.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">{currentVideo?.title}</h3>
                  <span className="text-sm text-muted-foreground">
                    Video {currentVideoIndex + 1} von {onboardingVideos.length}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{currentVideo?.description}</p>
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  {currentVideo?.thumbnailUrl && !videoStarted && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center cursor-pointer z-10"
                      style={{ 
                        backgroundImage: `url(${currentVideo.thumbnailUrl.startsWith('http') 
                          ? currentVideo.thumbnailUrl 
                          : window.location.origin + currentVideo.thumbnailUrl})`
                      }}
                      onClick={() => {
                        const videoElement = document.querySelector('video');
                        if (videoElement) {
                          videoElement.play();
                          setVideoStarted(true);
                        }
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-[#ff5733] rounded-full flex items-center justify-center">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill="white" 
                            className="w-8 h-8"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                  <video
                    key={currentVideo?.videoUrl} 
                    className="w-full h-full"
                    controls={videoStarted}
                    controlsList="nodownload"
                    preload="metadata"
                    onTimeUpdate={handleVideoTimeUpdate}
                    onEnded={handleVideoEnded}
                  >
                    {currentVideo?.videoUrl && (
                      <source 
                        src={currentVideo.videoUrl.startsWith('http') 
                          ? currentVideo.videoUrl 
                          : window.location.origin + currentVideo.videoUrl
                        } 
                        type="video/mp4"
                      />
                    )}
                    Ihr Browser unterstützt das Video-Format nicht.
                  </video>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={handleNextVideo}
                    className="bg-[#ff5733] hover:bg-[#ff7a66] text-white w-full"
                    disabled={!videoWatched[currentVideoIndex]}
                  >
                    {isLastVideo ? 'Weiter zur Checkliste' : 'Nächstes Video'}
                  </Button>
                  {!videoWatched[currentVideoIndex] && (
                    <p className="text-sm text-muted-foreground text-center">
                      Bitte schauen Sie das Video zu Ende, um fortzufahren
                    </p>
                  )}
                  <div className="flex justify-center space-x-2 mt-4">
                    {onboardingVideos?.map((_: OnboardingVideo, index: number) => (
                      <div
                        key={index}
                        className={`h-2 w-2 rounded-full ${
                          index === currentVideoIndex
                            ? 'bg-[#ff5733]'
                            : videoWatched[index]
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">
                  {isLoading ? 'Lade Videos...' : fetchError ? 'Fehler beim Laden der Videos' : 'Keine Onboarding-Videos verfügbar'}
                </p>
              </div>
            )}
          </div>
        );
      case 2:
        return <ChecklistForm onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  // If user has completed onboarding, don't render anything
  if (user?.onboardingCompleted) {
    return null;
  }

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
