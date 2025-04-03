import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ResumeEditor from "@/pages/resume-editor";
import Dashboard from "@/pages/dashboard";
import ResumeUpload from "@/components/resume-upload";
import ResumeBuilder from "@/pages/resume-builder";
import InterviewPrep from "@/pages/interview-prep";
import InterviewSimulation from "@/pages/interview-simulation";
import InterviewAnalysis from "@/pages/interview-analysis";
import AuthPage from "@/pages/auth-page";
import NavigationBar from "@/components/navigation-bar";
import MobileNavigation from "@/components/mobile-navigation";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavigationBar />
      <main className="flex-1 pb-16 md:pb-0"> {/* Add padding bottom for mobile nav */}
        <Switch>
          <ProtectedRoute path="/" component={Home} />
          <ProtectedRoute path="/editor" component={ResumeEditor} />
          <ProtectedRoute path="/editor/:id" component={ResumeEditor} />
          <ProtectedRoute path="/dashboard" component={Dashboard} />
          <ProtectedRoute path="/upload" component={ResumeUpload} />
          <ProtectedRoute path="/builder" component={ResumeBuilder} />
          <ProtectedRoute path="/interview-prep" component={InterviewPrep} />
          <ProtectedRoute path="/interview-simulation" component={InterviewSimulation} />
          <ProtectedRoute path="/interview-analysis" component={InterviewAnalysis} />
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <MobileNavigation className="md:hidden" />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;