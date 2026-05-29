import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimatePresence } from "framer-motion";

// Eagerly load Index (landing page) for fast first paint
import Index from "./pages/Index";

// Lazy load all other pages
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Pricing = lazy(() => import("./pages/Pricing"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const NewDiagnosis = lazy(() => import("./pages/NewDiagnosis"));
const DiagnosisResult = lazy(() => import("./pages/DiagnosisResult"));
const SharedDiagnosis = lazy(() => import("./pages/SharedDiagnosis"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const FAQ = lazy(() => import("./pages/FAQ"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminLibrary = lazy(() => import("./pages/admin/AdminLibrary"));
const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/account" element={<Dashboard />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/new-diagnosis" element={<NewDiagnosis />} />
        <Route path="/diagnosis/share/:token" element={<SharedDiagnosis />} />
        <Route path="/diagnosis/:id" element={<DiagnosisResult />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="finance" element={<AdminFinance />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="library" element={<AdminLibrary />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Sonner position="bottom-right" richColors toastOptions={{ style: { zIndex: 999999 } }} />
        <BrowserRouter>
          <Suspense fallback={<LazyFallback />}>
            <AnimatedRoutes />
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
