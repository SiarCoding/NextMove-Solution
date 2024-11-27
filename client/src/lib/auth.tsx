import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import type { User } from "@db/schema";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, portal: "admin" | "customer") => Promise<void>;
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
        // Try to get cached user first
        const cachedUser = localStorage.getItem("cachedUser");
        if (cachedUser && !user) {
          setUser(JSON.parse(cachedUser));
        }

        const res = await fetch("/api/auth/session", {
          credentials: 'include'
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem("cachedUser", JSON.stringify(data.user));
          } else {
            throw new Error("No user data in response");
          }
        } else {
          // Only retry on network errors or 401, not on other status codes
          if (retryCount < 3 && (res.status === 401 || !res.ok)) {
            console.log(`Retrying session check (${retryCount + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return checkSession(retryCount + 1);
          }
          throw new Error(await res.text());
        }
      } catch (error) {
        console.error("Session check failed:", error);
        // Only clear user on final retry
        if (retryCount >= 2) {
          setUser(null);
          localStorage.removeItem("cachedUser");
        }
      } finally {
        if (retryCount === 0) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    const intervalId = setInterval(() => checkSession(), 2 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);

  const login = async (email: string, password: string, portal: "admin" | "customer") => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, portal }),
      credentials: 'include'
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Anmeldung fehlgeschlagen");
    }

    const data = await res.json();
    setUser(data.user);
    
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

  if (!user) {
    return <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Zugriff verweigert</h2>
        <p className="text-muted-foreground">Bitte melden Sie sich an, um fortzufahren.</p>
      </div>
    </div>;
  }

  if (!isAdmin) {
    return <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Kein Administratorzugriff</h2>
        <p className="text-muted-foreground">
          Sie haben keine Berechtigung, auf den Administratorbereich zuzugreifen.
        </p>
      </div>
    </div>;
  }

  return <>{children}</>;
}

export const useAuth = () => useContext(AuthContext);
