import CustomerLayout from "@/components/layout/CustomerLayout";
import { TutorialList } from "@/components/dashboard/TutorialList";

export default function Tutorials() {
  return (
    <CustomerLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tutorials</h2>
          <p className="text-muted-foreground">
            Hier finden Sie hilfreiche Video-Tutorials zu verschiedenen Themen.
          </p>
        </div>
        <TutorialList />
      </div>
    </CustomerLayout>
  );
}
