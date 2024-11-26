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

interface TutorialCardProps {
  tutorial: Tutorial & { completed?: boolean };
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
      <Card className="h-full">
        <CardHeader className="relative">
          <div className="absolute top-2 right-2">
            {tutorial.completed && (
              <CheckCircle className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
            <PlayCircle className="h-12 w-12 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h3 className="font-semibold">{tutorial.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {tutorial.description}
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                {tutorial.category}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(true)}
              >
                Ansehen
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
