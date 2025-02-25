import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ResumeEditor from "@/pages/resume-editor";
import Dashboard from "@/pages/dashboard";
import ResumeBuilder from "@/pages/resume-builder";
import JobSearch from "@/pages/job-search";
import NavigationBar from "@/components/navigation-bar";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavigationBar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/resume/:id" component={ResumeEditor} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/builder" component={ResumeBuilder} />
          <Route path="/job-search" component={JobSearch} />
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