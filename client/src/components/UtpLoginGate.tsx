/**
 * UtpLoginGate -- wraps any UTP-talking page. Behavior:
 *
 *   - If a token exists and is unexpired, render children.
 *   - If no token AND UTP has signalled it requires auth (401 came back from
 *     any earlier call), render the inline login form.
 *   - If no token but UTP hasn't required auth yet (dev mode with
 *     REQUIRE_AUTH=false), still render children. Calls go out without auth
 *     and the backend accepts them; the gate flips on the first 401.
 *
 * The gate is intentionally minimal -- a single password field matching
 * UTP's POST /api/auth/login contract. Future work can swap this for a
 * proper manus.im OAuth2 redirect without changing the gate's API.
 */

import { useState, FormEvent } from "react";
import { Lock, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUtpAuth } from "@/contexts/UtpAuthContext";

export default function UtpLoginGate({ children }: { children: React.ReactNode }) {
  const auth = useUtpAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (auth.isAuthenticated || !auth.isAuthRequired) {
    return <>{children}</>;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    try {
      await auth.login(password);
      setPassword("");
    } catch {
      // error already exposed via auth.loginError
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <Card className="bg-slate-900/60 border-slate-800 w-full max-w-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            ikigaiOS Trading -- sign in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-400">
            UTP backend requires authentication. Enter the platform password to continue.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="password"
              autoFocus
              autoComplete="current-password"
              placeholder="platform password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (auth.loginError) auth.clearError();
              }}
              disabled={submitting}
              data-testid="utp-login-password"
            />
            {auth.loginError && (
              <p className="text-xs text-red-300" data-testid="utp-login-error">
                {auth.loginError}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting || !password}
              className="w-full"
              data-testid="utp-login-submit"
            >
              <LogIn className="h-3 w-3 mr-1" />
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
