import CustomerLayout from "@/components/layout/CustomerLayout";
import { PartnerProgram } from "@/components/dashboard/PartnerProgram";

export default function PartnerProgramPage() {
  return (
    <CustomerLayout>
      <div className="container mx-auto px-4 py-8">
        <PartnerProgram />
      </div>
    </CustomerLayout>
  );
}
