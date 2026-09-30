import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService, type StockUser } from "@/services/auth";

type AuthContextValue = {
  user: StockUser | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<StockUser>;
  register: (
    fullName: string,
    legajo: string,
    email: string,
    password: string
  ) => Promise<StockUser>;
  logout: () => Promise<void>;
};

const StockAuthContext = createContext<AuthContextValue | null>(null);

export function StockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StockUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    authService
      .me()
      .then(result => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("stockia:unauthorized", onExpired);
    return () => window.removeEventListener("stockia:unauthorized", onExpired);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
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
      async register(fullName, legajo, email, password) {
        setError("");
        try {
          const result = await authService.register({
            fullName,
            legajo,
            email,
            password,
          });
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
    }),
    [error, loading, user]
  );

  return (
    <StockAuthContext.Provider value={value}>
      {children}
    </StockAuthContext.Provider>
  );
}

export function useStockAuth() {
  const context = useContext(StockAuthContext);
  if (!context)
    throw new Error("useStockAuth debe usarse dentro de StockAuthProvider");
  return context;
}
