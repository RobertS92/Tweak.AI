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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/editor/:id" component={ResumeEditor} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/upload" component={ResumeUpload} />
      <Route path="/builder" component={ResumeBuilder} />
      <Route component={NotFound} />
    </Switch>
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