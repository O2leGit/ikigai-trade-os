import { useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { useLocation } from "wouter";
import { Lock, LogOut, CheckCircle, AlertTriangle } from "lucide-react";

export default function Admin() {
  const { isAdmin, login, logout } = useAdmin();
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const success = await login(password);
      if (success) {
        setLocation("/");
      } else {
        setError("Invalid password");
        setPassword("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded bg-primary/20 border border-primary/40 flex items-center justify-center font-display font-bold text-primary text-lg">
            IK
          </div>
          <div>
            <div className="font-display font-bold text-lg text-foreground leading-none">IkigaiTradeOS</div>
            <div className="text-[10px] text-primary uppercase tracking-widest font-semibold">Admin Access</div>
          </div>
        </div>

        {isAdmin ? (
          /* Already logged in */
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 text-bull">
              <CheckCircle className="w-5 h-5" />
              <p className="text-sm font-semibold">You are logged in as admin</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Portfolio Review and Upload are visible on the main dashboard.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLocation("/")}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-muted-foreground border border-border hover:text-foreground hover:border-bear/40 hover:bg-bear/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </div>
        ) : (
          /* Login form */
          <form onSubmit={handleLogin} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Lock className="w-4 h-4" />
              <p className="text-sm font-semibold text-foreground">Admin Login</p>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-bear text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Verifying..." : "Login"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
