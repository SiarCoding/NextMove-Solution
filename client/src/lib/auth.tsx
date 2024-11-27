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
    const checkSession = async (retryCount = 0) => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: 'include'
        });
        
        if (!res.ok) {
          if (retryCount < 3 && res.status === 401) {
            // Retry after 1 second for 401 errors
            console.log(`Retrying session check (${retryCount + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return checkSession(retryCount + 1);
          }
          throw new Error(res.statusText);
        }
        
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem("cachedUser", JSON.stringify(data.user));
        } else {
          localStorage.removeItem("cachedUser");
          setUser(null);
        }
      } catch (error) {
        console.error("Session check failed:", error);
        
        // Try to use cached user data if available
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

    checkSession();

    // Set up periodic session check every 2 minutes
    const intervalId = setInterval(checkSession, 2 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Anmeldung fehlgeschlagen");
    }

    const data = await res.json();
    setUser(data.user);
    
    // Wait for session to be fully established
    await new Promise(resolve => setTimeout(resolve, 500));
    
    localStorage.setItem("cachedUser", JSON.stringify(data.user));
  };

  const logout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (!res.ok) {
      throw new Error("Abmeldung fehlgeschlagen");
    }
    
    setUser(null);
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
