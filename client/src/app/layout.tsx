
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import NavigationBar from "@/components/navigation-bar";
import MobileNavigation from "@/components/mobile-navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <NavigationBar />
      <main className="flex-1">
        {children}
      </main>
      <MobileNavigation className="md:hidden" />
    </div>
  );
}
