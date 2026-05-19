/**
 * UtpAuthContext -- session-token state for the unified-trading-platform.
 *
 * Distinct from the manus.im OAuth used by the rest of ikigai-trade-os.
 * UTP issues its own HMAC-SHA256 session token via POST /api/auth/login.
 * Frontend stores it in localStorage and sends it as Authorization: Bearer.
 *
 * Phase A.4 (today): single-password login that matches PLATFORM_PASSWORD
 * on UTP. Phase B+ can swap this for manus.im OAuth2 delegation without
 * changing the AuthContext consumer surface.
 *
 * Storage strategy: localStorage (canonical SPA + bearer pattern per the
 * 2026 FastAPI security guide). Token rotates on every login.
 */

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { registerUtpTokenGetter, utpPost, UtpApiError } from "@/lib/utpApi";

const TOKEN_KEY = "utp_session_token";
const USER_KEY = "utp_session_user";
const EXPIRES_KEY = "utp_session_expires_at";

interface LoginResponse {
  token: string;
  user: string;
  expires_in: number;
}

interface UtpAuthState {
  token: string | null;
  user: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
  loginError: string | null;
  isAuthRequired: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  markAuthRequired: () => void;
}

const UtpAuthContext = createContext<UtpAuthState | null>(null);

function readStored(): { token: string | null; user: string | null; expiresAt: number | null } {
  if (typeof window === "undefined") return { token: null, user: null, expiresAt: null };
  const token = window.localStorage.getItem(TOKEN_KEY);
  const user = window.localStorage.getItem(USER_KEY);
  const expiresAtRaw = window.localStorage.getItem(EXPIRES_KEY);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : null;
  if (expiresAt && Date.now() / 1000 > expiresAt) {
    // Token already expired; drop it
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(EXPIRES_KEY);
    return { token: null, user: null, expiresAt: null };
  }
  return { token, user, expiresAt };
}

export function UtpAuthProvider({ children }: { children: ReactNode }) {
  const initial = readStored();
  const [token, setToken] = useState<string | null>(initial.token);
  const [user, setUser] = useState<string | null>(initial.user);
  const [expiresAt, setExpiresAt] = useState<number | null>(initial.expiresAt);
  const [loginError, setLoginError] = useState<string | null>(null);
  // isAuthRequired is set when a UTP call returns 401, so the gate component
  // can pop the login form. In dev (REQUIRE_AUTH=false on backend) calls
  // succeed without a token; the gate stays hidden.
  const [isAuthRequired, setIsAuthRequired] = useState<boolean>(false);

  // Push the current token into the framework-agnostic utpApi module so its
  // fetch wrappers can attach Authorization headers automatically.
  useEffect(() => {
    registerUtpTokenGetter(() => token);
  }, [token]);

  const login = useCallback(async (password: string) => {
    setLoginError(null);
    try {
      const res = await utpPost<LoginResponse>("/api/auth/login", { password });
      const expiresAtUnix = Math.floor(Date.now() / 1000) + res.expires_in;
      window.localStorage.setItem(TOKEN_KEY, res.token);
      window.localStorage.setItem(USER_KEY, res.user);
      window.localStorage.setItem(EXPIRES_KEY, String(expiresAtUnix));
      setToken(res.token);
      setUser(res.user);
      setExpiresAt(expiresAtUnix);
      setIsAuthRequired(false);
    } catch (e) {
      const err = e as UtpApiError;
      const msg = err.status === 401
        ? "Wrong password"
        : err.message || "Login failed -- could not reach UTP";
      setLoginError(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) await utpPost<{ status: string }>("/api/auth/logout");
    } catch {
      // Logging out client-side regardless; server may already have dropped the token
    }
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(EXPIRES_KEY);
    setToken(null);
    setUser(null);
    setExpiresAt(null);
    setIsAuthRequired(false);
  }, [token]);

  const clearError = useCallback(() => setLoginError(null), []);
  const markAuthRequired = useCallback(() => setIsAuthRequired(true), []);

  const value = useMemo<UtpAuthState>(() => ({
    token,
    user,
    expiresAt,
    isAuthenticated: Boolean(token),
    loginError,
    isAuthRequired,
    login,
    logout,
    clearError,
    markAuthRequired,
  }), [token, user, expiresAt, loginError, isAuthRequired, login, logout, clearError, markAuthRequired]);

  return <UtpAuthContext.Provider value={value}>{children}</UtpAuthContext.Provider>;
}

export function useUtpAuth(): UtpAuthState {
  const ctx = useContext(UtpAuthContext);
  if (!ctx) {
    throw new Error("useUtpAuth must be used inside <UtpAuthProvider>");
  }
  return ctx;
}
