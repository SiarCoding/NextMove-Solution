import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { type User } from "@db/schema";

interface CustomerData extends User {
  progress: number;
  currentPhase: string;
  completedPhases: string[];
  onboardingCompleted: boolean;
}

export default function Tracking() {
  const { data: customers } = useQuery<CustomerData[]>({
    queryKey: ["customers-tracking"],
    queryFn: async () => {
      const res = await fetch("/api/admin/customers/tracking", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    }
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Kundentracking</h1>
        </div>
        
        <div className="grid gap-4">
          {customers?.map((customer) => (
            <div key={customer.id} className="bg-card p-6 rounded-lg border">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold">{customer.firstName} {customer.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Status: {customer.currentPhase}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Fortschritt</span>
                  <span>{customer.progress}%</span>
                </div>
                <Progress value={customer.progress} className="h-2" />
                
                <div className="grid grid-cols-6 gap-2 text-sm">
                  {["Checkliste", "Landingpage", "Werbeanzeigen", "WhatsApp-Bot", "CRM", "Webinar"].map((phase, index) => (
                    <div 
                      key={phase}
                      className={`p-2 rounded-full text-center text-xs ${
                        customer.completedPhases.includes(phase)
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {phase}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
