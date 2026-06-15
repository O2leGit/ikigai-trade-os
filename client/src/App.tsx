import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import CommandPalette, { CommandPaletteHint } from "./components/CommandPalette";
import { KillSwitchBanner } from "./components/KillSwitchConfirm";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminProvider } from "./contexts/AdminContext";
import { UtpAuthProvider, useUtpAuth } from "./contexts/UtpAuthContext";
import { registerUtpUnauthorizedListener } from "./lib/utpApi";

// Pages are lazy-loaded so each route ships in its own chunk and the initial
// bundle stays small (the dashboard page alone is large). NotFound is eager
// since it's the Switch fallback.
const Home = lazy(() => import("./pages/Home"));
const Archive = lazy(() => import("./pages/Archive"));
const Admin = lazy(() => import("./pages/Admin"));
const Upload = lazy(() => import("./pages/Upload"));
const Connections = lazy(() => import("./pages/Connections"));
const ReportArchive = lazy(() => import("./pages/ReportArchive"));
const Engines = lazy(() => import("./pages/Engines"));

/** Lightweight fallback shown while a route chunk loads. */
function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm font-mono">Loading…</span>
      </div>
    </div>
  );
}

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
              <KillSwitchBanner />
              <CommandPalette />
              <Suspense fallback={<PageLoading />}>
                <Router />
              </Suspense>
              <div className="pointer-events-none fixed bottom-2 right-3 z-40">
                <span className="pointer-events-auto">
                  <CommandPaletteHint />
                </span>
              </div>
            </TooltipProvider>
          </UtpAuthProvider>
        </ThemeProvider>
      </AdminProvider>
    </ErrorBoundary>
  );
}

export default App;
