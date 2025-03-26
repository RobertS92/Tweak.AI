
import { SideNavigation } from "@/components/ui/SideNavigation";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <SideNavigation />
      <div className="pl-[220px] p-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        {/* Dashboard content */}
      </div>
    </div>
  );
}
