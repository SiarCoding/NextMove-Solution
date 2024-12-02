import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminLogin from "./pages/admin/Login";
import OnboardingWizard from "./components/onboarding/OnboardingWizard";
import AdminDashboard from "./pages/admin/Dashboard";
import UserApproval from "./pages/admin/UserApproval";
import ContentManagement from "./pages/admin/ContentManagement";
import Settings from "./pages/admin/Settings";
import CustomerSettings from "./pages/customer/Settings";
import Customers from "./pages/admin/Customers";
import Tracking from "./pages/admin/Tracking";

// Auth Provider
import { AuthProvider, RequireAuth, RequireAdmin } from "./lib/auth.tsx";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/onboarding">
        <RequireAuth>
          <OnboardingWizard />
        </RequireAuth>
      </Route>
      <Route path="/dashboard">
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      </Route>
      <Route path="/settings">
        <RequireAuth>
          <CustomerSettings />
        </RequireAuth>
      </Route>
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin">
        <RequireAdmin>
          <AdminDashboard />
        </RequireAdmin>
      </Route>
      <Route path="/admin/users">
        <RequireAdmin>
          <UserApproval />
        </RequireAdmin>
      </Route>
      <Route path="/admin/content">
        <RequireAdmin>
          <ContentManagement />
        </RequireAdmin>
      </Route>
      <Route path="/admin/customers">
        <RequireAdmin>
          <Customers />
        </RequireAdmin>
      </Route>
      <Route path="/admin/settings">
        <RequireAdmin>
          <Settings />
        </RequireAdmin>
      </Route>
      <Route path="/admin/tracking">
        <RequireAdmin>
          <Tracking />
        </RequireAdmin>
      </Route>
      <Route>404 - Seite nicht gefunden</Route>
    </Switch>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
