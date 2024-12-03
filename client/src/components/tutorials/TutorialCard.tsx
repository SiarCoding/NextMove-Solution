import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import VideoPlayer from "./VideoPlayer";
import type { Tutorial } from "@db/schema";
import { cn } from "@/lib/utils";

interface TutorialCardProps {
  tutorial: Tutorial & { 
    completed?: boolean;
    thumbnailUrl?: string | null;
  };
  onComplete?: (tutorialId: number) => void;
}

export default function TutorialCard({ tutorial, onComplete }: TutorialCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleComplete = () => {
    if (onComplete) {
      onComplete(tutorial.id);
    }
    setIsOpen(false);
  };

  return (
    <>
      <Card className={cn(
        "h-full transition-all duration-200",
        tutorial.completed && "bg-primary/5 border-primary/20"
      )}>
        <CardHeader className="relative">
          <div className="absolute top-2 right-2 z-10">
            {tutorial.completed && (
              <div className="bg-background rounded-full p-1">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
            )}
          </div>
          <div className={cn(
            "aspect-video rounded-md flex items-center justify-center relative group cursor-pointer",
            tutorial.completed ? "bg-primary/10" : "bg-muted"
          )} onClick={() => setIsOpen(true)}>
            {tutorial.thumbnailUrl ? (
              <img 
                src={tutorial.thumbnailUrl} 
                alt={tutorial.title}
                className="w-full h-full object-cover rounded-md"
              />
            ) : (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-md flex items-center justify-center">
                <PlayCircle className={cn(
                  "h-12 w-12 transition-all duration-200",
                  tutorial.completed ? "text-primary" : "text-muted-foreground",
                )} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-md flex items-center justify-center">
              <PlayCircle className={cn(
                "h-12 w-12 transition-all duration-200 opacity-0 group-hover:opacity-100",
                tutorial.completed ? "text-primary" : "text-white",
              )} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{tutorial.title}</h3>
              {tutorial.completed && (
                <span className="text-xs text-primary font-medium">Abgeschlossen</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {tutorial.description}
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className={cn(
                "text-xs px-2 py-1 rounded",
                tutorial.completed ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
              )}>
                {tutorial.category}
              </span>
              <Button
                variant={tutorial.completed ? "outline" : "ghost"}
                size="sm"
                onClick={() => setIsOpen(true)}
                className={cn(
                  tutorial.completed && "border-primary/20 hover:border-primary/30"
                )}
              >
                {tutorial.completed ? "Erneut ansehen" : "Ansehen"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{tutorial.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video">
            <VideoPlayer
              videoUrl={tutorial.videoUrl}
              onComplete={handleComplete}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
