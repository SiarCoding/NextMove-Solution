import CustomerLayout from "@/components/layout/CustomerLayout";
import { CustomerSettings } from "@/components/dashboard/CustomerSettings";

export default function Settings() {
  return (
    <CustomerLayout>
      <div className="container mx-auto py-6">
        <h1 className="mb-6 text-2xl font-bold">Einstellungen</h1>
        <CustomerSettings />
      </div>
    </CustomerLayout>
  );
}
