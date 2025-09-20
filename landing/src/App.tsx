import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import LearningProcess from "./pages/LearningProcess";
import Features from "./pages/Features";
import Professions from "./pages/Professions";
import Languages from "./pages/Languages";
import Pricing from "./pages/Pricing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Documentation from "./pages/Documentation";
import Instructions from "./pages/Instructions";
import Support from "./pages/Support";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import { DevTools } from "@/components/DevTools";
import { queryClient } from "@/lib/queryClient";
import { StoreProvider } from "@/providers/StoreProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { useState } from "react";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Index /> },
      { path: "learning-process", element: <LearningProcess /> },
      { path: "features", element: <Features /> },
      { path: "professions", element: <Professions /> },
      { path: "languages", element: <Languages /> },
      { path: "pricing", element: <Pricing /> },
      { path: "privacy-policy", element: <PrivacyPolicy /> },
      { path: "terms-of-service", element: <TermsOfService /> },
      { path: "documentation", element: <Documentation /> },
      { path: "instructions", element: <Instructions /> },
      { path: "support", element: <Support /> },
      { path: "faq", element: <FAQ /> },
      { path: "about", element: <About /> },

      { path: "*", element: <NotFound /> }
    ]
  }
]);

const App = () => {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <StoreProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <RouterProvider router={router} />
            {process.env.NODE_ENV === 'development' && (
              <DevTools 
                isOpen={isDevToolsOpen} 
                onToggle={() => setIsDevToolsOpen(!isDevToolsOpen)} 
              />
            )}
          </TooltipProvider>
        </StoreProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
};

export default App;
