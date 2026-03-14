import { createContext, useContext, useState, type ReactNode } from "react";

interface AdminContextType {
  isAdmin: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  login: async () => false,
  logout: () => {},
});

// SHA-256 hash of the admin password "ikigai2026!"
const ADMIN_HASH = "87f5b15a55a6f8e36408813d3ea07ae0f2fbadc60f00afacfb655956113eae13";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("ikigai-admin") === "true";
  });

  const login = async (password: string): Promise<boolean> => {
    const hash = await hashPassword(password);
    if (hash === ADMIN_HASH) {
      setIsAdmin(true);
      localStorage.setItem("ikigai-admin", "true");
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    localStorage.removeItem("ikigai-admin");
  };

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
