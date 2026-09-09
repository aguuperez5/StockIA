import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService, type StockUser } from "@/services/auth";

type AuthContextValue = {
  user: StockUser | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<StockUser>;
  register: (fullName: string, email: string, password: string) => Promise<StockUser>;
  logout: () => Promise<void>;
};

const StockAuthContext = createContext<AuthContextValue | null>(null);

export function StockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StockUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    authService.me().then(result => setUser(result.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    error,
    async login(email, password) {
      setError("");
      try {
        const result = await authService.login({ email, password });
        setUser(result.user);
        return result.user;
      } catch (reason) {
        const message = (reason as Error).message;
        setError(message);
        throw reason;
      }
    },
    async register(fullName, email, password) {
      setError("");
      try {
        const result = await authService.register({ fullName, email, password });
        setUser(result.user);
        return result.user;
      } catch (reason) {
        const message = (reason as Error).message;
        setError(message);
        throw reason;
      }
    },
    async logout() {
      await authService.logout().catch(() => undefined);
      setUser(null);
    },
  }), [error, loading, user]);

  return <StockAuthContext.Provider value={value}>{children}</StockAuthContext.Provider>;
}

export function useStockAuth() {
  const context = useContext(StockAuthContext);
  if (!context) throw new Error("useStockAuth debe usarse dentro de StockAuthProvider");
  return context;
}
