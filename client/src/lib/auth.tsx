import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import type { User } from "@db/schema";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: async () => {},
  isLoading: true,
  isAdmin: false,
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    let hasRetried = false;
    const retryDelay = 1000;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) {
          throw new Error(res.statusText);
        }
        
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem("cachedUser", JSON.stringify(data.user));
        } else {
          // Clear cached data if no user in session
          localStorage.removeItem("cachedUser");
          setUser(null);
        }
      } catch (error) {
        console.error("Session check failed:", error);
        
        if (!hasRetried) {
          hasRetried = true;
          setTimeout(checkSession, retryDelay);
          return;
        }
        
        // Try to use cached user data only after retry failed
        const cachedUser = localStorage.getItem("cachedUser");
        if (cachedUser) {
          try {
            const userData = JSON.parse(cachedUser);
            setUser(userData);
          } catch (e) {
            console.error("Failed to parse cached user data:", e);
            localStorage.removeItem("cachedUser");
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Try to use cached user data immediately while checking session
    const cachedUser = localStorage.getItem("cachedUser");
    if (cachedUser) {
      setUser(JSON.parse(cachedUser));
    }

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      throw new Error("Anmeldung fehlgeschlagen");
    }

    const data = await res.json();
    setUser(data.user);
    // Cache the user data on successful login
    localStorage.setItem("cachedUser", JSON.stringify(data.user));
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    // Clear cached user data
    localStorage.removeItem("cachedUser");
    navigate("/");
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <div>Lade...</div>;
  }

  return user ? <>{children}</> : null;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading, isAdmin } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate("/admin/login");
    }
  }, [user, isAdmin, isLoading, navigate]);

  if (isLoading) {
    return <div>Lade...</div>;
  }

  return user && isAdmin ? <>{children}</> : null;
}

export const useAuth = () => useContext(AuthContext);
