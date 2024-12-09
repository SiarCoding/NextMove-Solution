import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
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
import CustomerDetails from "./pages/admin/CustomerDetails";
import Callbacks from "./pages/admin/Callbacks";
import Support from "./pages/Support";
import PartnerProgram from "./pages/PartnerProgram";
import Tutorials from "./pages/Tutorials";
import ResetPassword from "./pages/ResetPassword";

// Auth Provider
import { AuthProvider, RequireAuth, RequireAdmin } from "./lib/auth.tsx";
import { GoogleAuthProvider } from "./lib/googleDriveAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
      gcTime: 0,
      retry: false
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/reset-password/:token" component={ResetPassword} />
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
      <Route path="/admin">
        <RequireAdmin>
          <AdminDashboard />
        </RequireAdmin>
      </Route>
      <Route path="/admin/login" component={AdminLogin} />
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
      <Route path="/admin/settings">
        <RequireAdmin>
          <Settings />
        </RequireAdmin>
      </Route>
      <Route path="/admin/customers">
        <RequireAdmin>
          <Customers />
        </RequireAdmin>
      </Route>
      <Route path="/admin/tracking">
        <RequireAdmin>
          <Tracking />
        </RequireAdmin>
      </Route>
      <Route path="/admin/tracking/:id">
        <RequireAdmin>
          <CustomerDetails />
        </RequireAdmin>
      </Route>
      <Route path="/admin/callbacks">
        <RequireAdmin>
          <Callbacks />
        </RequireAdmin>
      </Route>
      <Route path="/settings">
        <RequireAuth>
          <CustomerSettings />
        </RequireAuth>
      </Route>
      <Route path="/support">
        <RequireAuth>
          <Support />
        </RequireAuth>
      </Route>
      <Route path="/partner">
        <RequireAuth>
          <PartnerProgram />
        </RequireAuth>
      </Route>
      <Route path="/tutorials">
        <RequireAuth>
          <Tutorials />
        </RequireAuth>
      </Route>
      <Route>404 - Seite nicht gefunden</Route>
    </Switch>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleAuthProvider>
          <Toaster />
          <Router />
        </GoogleAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
