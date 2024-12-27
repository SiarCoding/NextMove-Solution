import { Card, CardContent } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-6">Datenschutzrichtlinie</h1>
          
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">1. Einleitung</h2>
            <p>
              NextMove Consulting legt großen Wert auf den Schutz Ihrer personenbezogenen Daten. 
              Diese Datenschutzrichtlinie informiert Sie über die Art, den Umfang und den Zweck 
              der Verarbeitung personenbezogener Daten in unserem Kundenportal.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">2. Datenerhebung und -verwendung</h2>
            <p>Wir erheben und verarbeiten folgende Daten:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Kontaktinformationen (Name, E-Mail, Telefon)</li>
              <li>Geschäftsinformationen</li>
              <li>Marketing-Daten aus Facebook-Integration</li>
              <li>Nutzungsdaten des Kundenportals</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">3. Facebook-Integration</h2>
            <p>
              Unser Portal nutzt die Facebook Marketing API und Facebook Login. 
              Dabei werden folgende Daten verarbeitet:
            </p>
            <ul className="list-disc ml-6 mt-2">
              <li>Facebook Ad Account Informationen</li>
              <li>Marketing-Metriken und Statistiken</li>
              <li>Öffentliche Profilinformationen bei Facebook-Login</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">4. Datenspeicherung und -sicherheit</h2>
            <p>
              Ihre Daten werden auf sicheren Servern in der EU gespeichert und nach 
              höchsten Sicherheitsstandards geschützt. Wir verwenden SSL-Verschlüsselung 
              für alle Datenübertragungen.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">5. Ihre Rechte</h2>
            <p>Sie haben das Recht auf:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Auskunft über Ihre gespeicherten Daten</li>
              <li>Berichtigung unrichtiger Daten</li>
              <li>Löschung Ihrer Daten</li>
              <li>Einschränkung der Datenverarbeitung</li>
              <li>Datenübertragbarkeit</li>
              <li>Widerruf erteilter Einwilligungen</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">6. Kontakt</h2>
            <p>
              Bei Fragen zum Datenschutz kontaktieren Sie uns unter:<br />
              NextMove Consulting<br />
              E-Mail: datenschutz@nextmove-consulting.de
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
