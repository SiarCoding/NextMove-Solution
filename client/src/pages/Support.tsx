import { Support } from "@/components/dashboard/Support";
import CustomerLayout from "@/components/layout/CustomerLayout";
import { Card } from "@/components/ui/card";

export default function SupportPage() {
  return (
    <CustomerLayout>
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Card className="overflow-hidden rounded-xl grid md:grid-cols-2 gap-0 bg-gradient-to-br from-card to-card/90">
            {/* Linke Seite - Formular */}
            <div className="p-8 lg:p-12 space-y-8">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white/90 to-white text-transparent bg-clip-text whitespace-nowrap">
                  Wir sind jederzeit für Sie da!
                </h1>
                <p className="text-xl text-muted-foreground">
                  Unser Support-Team steht Ihnen bei allen Fragen zur Verfügung.
                </p>
              </div>
              
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground/80">
                  Wir behandeln Ihre Daten vertraulich und melden uns werktags innerhalb von 24 Stunden bei Ihnen.
                </p>
                <div className="bg-background/5 backdrop-blur-sm rounded-lg p-6 shadow-xl">
                  <Support />
                </div>
              </div>
            </div>

            {/* Rechte Seite - Bild */}
            <div className="relative hidden md:block">
              <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/50 to-background/20 z-10" />
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: 'url("/admin.jpg")',
                }}
              />
              <div className="absolute inset-x-0 top-0 p-8 text-center z-20">
                <h3 className="text-2xl font-bold text-white mb-2">Professioneller Support</h3>
                <p className="text-gray-200">Ihre Zufriedenheit ist unser oberstes Ziel</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </CustomerLayout>
  );
}
