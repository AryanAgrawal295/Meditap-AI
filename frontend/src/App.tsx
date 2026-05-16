import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import MedicineAlarmManager from "@/components/MedicineAlarmManager";
import { HelpmanGuide } from "@/components/HelpmanGuide";
import PatientStartPage from "./pages/PatientStartPage";
import BasicInfoPage from "./pages/BasicInfoPage";
import PatientLookupPage from "./pages/PatientLookupPage";
import PatientRegistrationPage from "./pages/PatientRegistrationPage";
import RoleSelectionPage from "./pages/RoleSelectionPage";
import AuthenticationPage from "./pages/AuthenticationPage";
import MedicalHistoryPage from "./pages/MedicalHistoryPage";
import PrescriptionsPage from "./pages/PrescriptionsPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import AddMedicalRecordPage from "./pages/AddMedicalRecordPage";
import VitalSignsPage from "./pages/VitalSignsPage";
import AnalyticsDashboardPage from "./pages/AnalyticsDashboardPage";
import ReportsAndExportPage from "./pages/ReportsAndExportPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <MedicineAlarmManager />
            <HelpmanGuide />
            <Routes>
              <Route path="/" element={<PatientStartPage />} />
              <Route path="/patient-access" element={<BasicInfoPage />} />
              <Route path="/patient-lookup" element={<PatientLookupPage />} />
              <Route path="/register-patient" element={<PatientRegistrationPage />} />
              <Route path="/role-selection" element={<RoleSelectionPage />} />
              <Route path="/authentication" element={<AuthenticationPage />} />
              <Route path="/dashboard" element={<Navigate to="/medical-history" replace />} />
              <Route path="/medical-history" element={<MedicalHistoryPage />} />
              <Route path="/prescriptions" element={<PrescriptionsPage />} />
              <Route path="/ai-assistant" element={<AIAssistantPage />} />
              <Route path="/appointments" element={<Navigate to="/medical-history" replace />} />
              <Route path="/vital-signs" element={<VitalSignsPage />} />
              <Route path="/analytics" element={<AnalyticsDashboardPage />} />
              <Route path="/chat" element={<Navigate to="/medical-history" replace />} />
              <Route path="/reports" element={<ReportsAndExportPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/edit-profile" element={<EditProfilePage />} />
              <Route path="/add-medical-record" element={<AddMedicalRecordPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
