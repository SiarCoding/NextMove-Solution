import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type Tutorial } from '@db/schema';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TutorialList() {
  const queryClient = useQueryClient();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoStarted, setVideoStarted] = useState(false);

  const { data: tutorials, isLoading } = useQuery<(Tutorial & { completed?: boolean })[]>({
    queryKey: ['tutorials'],
    queryFn: async () => {
      const response = await fetch('/api/tutorials');
      if (!response.ok) {
        throw new Error('Failed to fetch tutorials');
      }
      return response.json();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (tutorialId: number) => {
      const response = await fetch(`/api/tutorials/${tutorialId}/complete`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to mark tutorial as completed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorials'] });
    },
  });

  const currentTutorial = tutorials?.[currentVideoIndex];
  const isLastVideo = currentVideoIndex === (tutorials?.length ?? 0) - 1;
  const isFirstVideo = currentVideoIndex === 0;

  const handleNextVideo = () => {
    if (!isLastVideo) {
      setCurrentVideoIndex(currentVideoIndex + 1);
      setVideoStarted(false);
    }
  };

  const handlePreviousVideo = () => {
    if (!isFirstVideo) {
      setCurrentVideoIndex(currentVideoIndex - 1);
      setVideoStarted(false);
    }
  };

  if (isLoading) {
    return <div>Lädt Tutorials...</div>;
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-12rem)]">
      {/* Main Video Section */}
      <div className="flex-1">
        <div className="space-y-6">
          {currentTutorial && (
            <div className="p-4 rounded-lg bg-[#1a1b1e]">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {currentTutorial?.title || "Kein Tutorial ausgewählt"}
                  </h1>
                  {currentTutorial?.category && (
                    <span className={cn(
                      "text-sm px-3 py-1 rounded-full",
                      currentTutorial.completed ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
                    )}>
                      {currentTutorial.category}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {currentTutorial?.description || ""}
                </p>
              </div>
            </div>
          )}

          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            {currentTutorial?.thumbnailUrl && !videoStarted && (
              <div 
                className="absolute inset-0 bg-cover bg-center cursor-pointer z-10"
                style={{ 
                  backgroundImage: `url(${currentTutorial.thumbnailUrl})`
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
              key={currentTutorial?.videoUrl}
              className="w-full h-full"
              controls={videoStarted}
              controlsList="nodownload"
              onEnded={() => {
                if (currentTutorial?.id) {
                  completeMutation.mutate(currentTutorial.id);
                }
              }}
            >
              <source src={currentTutorial?.videoUrl} type="video/mp4" />
              Ihr Browser unterstützt das Video-Format nicht.
            </video>
          </div>
          
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousVideo}
              disabled={isFirstVideo}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Vorheriges Video
            </Button>
            <Button
              variant="outline"
              onClick={handleNextVideo}
              disabled={isLastVideo}
            >
              Nächstes Video <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar with Video List */}
      <div className="w-80 bg-card rounded-lg flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Kursübersicht</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {tutorials?.length || 0} Videos in diesem Kurs
          </p>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {tutorials?.map((tutorial, index) => (
            <div
              key={tutorial.id}
              className={cn(
                "p-3 rounded-lg cursor-pointer transition-all",
                index === currentVideoIndex
                  ? "bg-primary/20 border-primary"
                  : "hover:bg-muted-foreground/10",
                tutorial.completed && "border-l-2 border-primary"
              )}
              onClick={() => {
                setCurrentVideoIndex(index);
                setVideoStarted(false);
              }}
            >
              <div className="flex items-start gap-3">
                <div className="relative w-24 aspect-video rounded overflow-hidden">
                  {tutorial.thumbnailUrl ? (
                    <img
                      src={tutorial.thumbnailUrl}
                      alt={tutorial.title}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-background flex items-center justify-center">
                      <div className="w-8 h-8 bg-[#ff5733] rounded-full flex items-center justify-center">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="white" 
                          className="w-4 h-4"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{tutorial.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tutorial.category}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
