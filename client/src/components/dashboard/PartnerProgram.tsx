import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Share2, Copy, CheckCircle } from "lucide-react";

export function PartnerProgram() {
  const [referralLink, setReferralLink] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    pendingReferrals: 0,
    completedReferrals: 0,
  });

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const response = await fetch("/api/referrals/my-link", {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Fehler beim Laden des Empfehlungslinks");
      
      const data = await response.json();
      setReferralLink(data.referralLink);
      setReferralStats({
        totalReferrals: data.stats.total || 0,
        pendingReferrals: data.stats.pending || 0,
        completedReferrals: data.stats.completed || 0,
      });
    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Empfehlungslink konnte nicht geladen werden",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Link kopiert!",
        description: "Der Empfehlungslink wurde in die Zwischenablage kopiert.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Link konnte nicht kopiert werden",
      });
    }
  };

  return (
    <div className="space-y-8">
      <Card className="bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            Ihr persönlicher Empfehlungslink
          </CardTitle>
          <CardDescription>
            Teilen Sie Ihren Link und profitieren Sie von unserem Partnerprogramm
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-20 flex items-center justify-center">
              <div className="animate-spin">⏳</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-background/50 p-3 rounded-lg border">
                  <code className="text-sm text-muted-foreground break-all">
                    {referralLink}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {referralStats.totalReferrals}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Gesamt Empfehlungen
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-500">
                        {referralStats.pendingReferrals}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ausstehend
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {referralStats.completedReferrals}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Erfolgreich
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            So funktioniert's
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold">1</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Teilen Sie Ihren Link</h4>
                <p className="text-sm text-muted-foreground">
                  Senden Sie Ihren persönlichen Empfehlungslink an interessierte Kontakte
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold">2</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Registrierung</h4>
                <p className="text-sm text-muted-foreground">
                  Ihre Kontakte registrieren sich über Ihren Link
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold">3</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Profitieren Sie</h4>
                <p className="text-sm text-muted-foreground">
                  Sie erhalten Vorteile für jede erfolgreiche Empfehlung
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
