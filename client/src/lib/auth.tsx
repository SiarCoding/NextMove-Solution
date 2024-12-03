import { createContext, useContext, type ReactNode } from "react";
import { useLocation } from "wouter";
import type { User } from "@db/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string, portal: "admin" | "customer") => Promise<any>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
  loginResponse: any | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refetchUser: async () => {},
  loginResponse: null,
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: session, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch session");
      }
      return res.json();
    },
  });

  const login = async (email: string, password: string, portal: "admin" | "customer") => {
    const endpoint = portal === "admin" ? "/api/auth/admin/login" : "/api/auth/login";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Login failed");
    }

    await queryClient.invalidateQueries({ queryKey: ["session"] });
    const data = await res.json();
    return data;
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      queryClient.clear();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refetchUser = async () => {
    await queryClient.refetchQueries({ queryKey: ["session"] });
    await queryClient.refetchQueries({ queryKey: ["user"] });
  };

  const value: AuthContextType = {
    user: session?.user ?? null,
    isAdmin: session?.user?.role === "admin",
    isLoading,
    login,
    logout,
    refetchUser,
    loginResponse: session?.user ?? null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return null;
  }

  if (!user) {
    navigate("/");
    return null;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return null;
  }

  if (!user || !isAdmin) {
    navigate("/admin/login");
    return null;
  }

  return <>{children}</>;
}

export const useAuth = () => useContext(AuthContext);
