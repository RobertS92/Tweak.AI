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
import NavigationBar from "@/components/navigation-bar";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavigationBar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/editor" component={ResumeEditor} />
          <Route path="/editor/:id" component={ResumeEditor} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/upload" component={ResumeUpload} />
          <Route path="/builder" component={ResumeBuilder} />
          <Route path="/interview-prep" component={InterviewPrep} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;