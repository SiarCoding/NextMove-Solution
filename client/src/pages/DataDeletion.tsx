import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function DataDeletion() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleDeleteRequest = async () => {
    setIsSubmitting(true);
    try {
      // Sende Anfrage an Backend
      const response = await fetch('/api/data-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_type: 'user_initiated'
        })
      });

      if (response.ok) {
        toast({
          title: "Anfrage erfolgreich gesendet",
          description: "Wir werden Ihre Daten innerhalb von 30 Tagen löschen.",
        });
      } else {
        throw new Error('Fehler beim Senden der Anfrage');
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Ihre Anfrage konnte nicht gesendet werden. Bitte kontaktieren Sie unseren Support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-6">Datenlöschung</h1>
          
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Wie Sie Ihre Daten löschen können</h2>
            <p className="mb-4">
              Sie haben das Recht, die Löschung Ihrer personenbezogenen Daten zu verlangen. 
              Um dieses Recht auszuüben, haben Sie folgende Möglichkeiten:
            </p>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Option 1: Direkte Löschung</h3>
                <p>Klicken Sie auf den untenstehenden Button, um eine Löschanfrage zu stellen:</p>
                <Button 
                  onClick={handleDeleteRequest} 
                  disabled={isSubmitting}
                  className="mt-2"
                >
                  {isSubmitting ? "Wird gesendet..." : "Löschung beantragen"}
                </Button>
              </div>

              <div>
                <h3 className="font-semibold">Option 2: Kontakt per E-Mail</h3>
                <p>
                  Senden Sie eine E-Mail an{" "}
                  <a 
                    href="mailto:datenschutz@nextmove-consulting.de" 
                    className="text-blue-600 hover:underline"
                  >
                    datenschutz@nextmove-consulting.de
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Was wird gelöscht?</h2>
            <p>Bei einer Löschanfrage werden folgende Daten gelöscht:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Ihre Kontaktinformationen</li>
              <li>Ihre Geschäftsdaten</li>
              <li>Ihre Marketing-Daten</li>
              <li>Alle weiteren personenbezogenen Daten</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Zeitrahmen</h2>
            <p>
              Nach Eingang Ihrer Löschanfrage werden wir Ihre Daten innerhalb von 30 Tagen 
              vollständig aus unseren Systemen entfernen. Sie erhalten eine Bestätigung, 
              sobald der Löschvorgang abgeschlossen ist.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Wichtige Hinweise</h2>
            <ul className="list-disc ml-6">
              <li>Die Löschung ist unwiderruflich</li>
              <li>Gesetzliche Aufbewahrungsfristen bleiben unberührt</li>
              <li>
                Nach der Löschung ist kein Zugriff mehr auf das Kundenportal möglich
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
