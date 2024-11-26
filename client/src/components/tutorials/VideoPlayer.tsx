import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string;
  onComplete?: () => void;
}

export default function VideoPlayer({ videoUrl, onComplete }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasWatched, setHasWatched] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100;
      setProgress(progress);

      if (progress >= 90 && !hasWatched) {
        setHasWatched(true);
      }
    };

    const handleLoadedData = () => {
      setIsLoading(false);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadeddata", handleLoadedData);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [hasWatched]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleComplete = () => {
    if (hasWatched && onComplete) {
      onComplete();
    }
  };

  return (
    <div className="relative w-full h-full bg-black rounded-md overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        src={videoUrl}
        controlsList="nodownload"
      >
        Ihr Browser unterstützt das Video-Format nicht.
      </video>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayPause}
          >
            {isPlaying ? "Pause" : "Abspielen"}
          </Button>

          <div className="flex items-center gap-2">
            <div className="h-1 w-48 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>

            {hasWatched && (
              <Button
                size="sm"
                onClick={handleComplete}
              >
                Als gesehen markieren
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
