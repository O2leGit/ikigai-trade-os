import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminProvider } from "./contexts/AdminContext";
import { UtpAuthProvider, useUtpAuth } from "./contexts/UtpAuthContext";
import { registerUtpUnauthorizedListener } from "./lib/utpApi";
import Home from "./pages/Home";
import Archive from "./pages/Archive";
import Admin from "./pages/Admin";
import Upload from "./pages/Upload";
import Connections from "./pages/Connections";
import ReportArchive from "./pages/ReportArchive";
import Engines from "./pages/Engines";

/** Bridge component: hooks up the UTP 401 listener to AuthContext. */
function UtpUnauthorizedBridge() {
  const auth = useUtpAuth();
  useEffect(() => {
    registerUtpUnauthorizedListener(() => auth.markAuthRequired());
  }, [auth]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/archive"} component={Archive} />
      <Route path={"/report-archive"} component={ReportArchive} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/upload"} component={Upload} />
      <Route path={"/connections"} component={Connections} />
      <Route path={"/engines"} component={Engines} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AdminProvider>
        <ThemeProvider defaultTheme="dark">
          <UtpAuthProvider>
            <UtpUnauthorizedBridge />
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </UtpAuthProvider>
        </ThemeProvider>
      </AdminProvider>
    </ErrorBoundary>
  );
}

export default App;
