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

// SHA-256 hash of the admin password
const ADMIN_HASH = "47e50d1abc9d70278b6634d5f95f62b9807ee21ed194825a979028b2472eef62";

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
