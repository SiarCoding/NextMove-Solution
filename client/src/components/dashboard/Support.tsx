import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Phone } from "lucide-react";

export function Support() {
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestCallback = async () => {
    if (!phone) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte geben Sie Ihre Telefonnummer ein",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          toast({
            variant: "destructive",
            title: "Zu viele Anfragen",
            description: data.error,
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast({
        title: "Vielen Dank!",
        description: "Wir werden uns schnellstmöglich um Ihr Anliegen kümmern.",
      });
      setPhone("");
    } catch (error) {
      console.error("Error requesting callback:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Rückruf konnte nicht angefordert werden. Bitte versuchen Sie es später erneut.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300" 
            size="lg"
          >
            <Phone className="mr-2 h-5 w-5" />
            Rückruf vereinbaren
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-sm border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">Rückruf anfordern</DialogTitle>
            <DialogDescription className="text-muted-foreground/90">
              Wir rufen Sie schnellstmöglich zurück
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="tel"
              placeholder="Ihre Telefonnummer"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
              className="bg-background/50 border-primary/20 focus-visible:ring-primary"
            />
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
              onClick={requestCallback}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2">⏳</span>
                  Wird gesendet...
                </span>
              ) : (
                "Rückruf anfordern"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
