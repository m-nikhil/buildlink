import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Connections from "./pages/Connections";
import ProfileEdit from "./pages/ProfileEdit";
import ProfileComplete from "./pages/ProfileComplete";
import Settings from "./pages/Settings";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import Invite from "./pages/Invite";
import Install from "./pages/Install";
import CallRoom from "./pages/CallRoom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdatePrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/profile/complete" element={<ProfileComplete />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:groupId" element={<GroupDetail />} />
            <Route path="/invite" element={<Invite />} />
            <Route path="/install" element={<Install />} />
            <Route path="/call/:roomId" element={<CallRoom />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
