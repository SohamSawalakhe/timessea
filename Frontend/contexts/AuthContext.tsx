"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user && !!token;

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Auto-refresh token before it expires (every 14 minutes, token expires in 15)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(
      async () => {
        await refreshToken();
      },
      14 * 60 * 1000,
    ); // 14 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const refreshToken = async (): Promise<string | null> => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include", // Important: sends cookies
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        setUser(data.user);
        return data.access_token;
      } else {
        // Refresh token invalid or expired
        setUser(null);
        setToken(null);
        return null;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      setUser(null);
      setToken(null);
      return null;
    }
  };

  const checkAuth = async (): Promise<boolean> => {
    try {
      // Try to refresh token using the httpOnly cookie
      const newToken = await refreshToken();

      if (newToken) {
        setIsLoading(false);
        return true;
      } else {
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsLoading(false);
      return false;
    }
  };

  const login = (newToken: string, newUser: User) => {
    // Only store access token in memory (not localStorage)
    // Refresh token is in httpOnly cookie set by backend
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      // Call backend to clear refresh token cookie
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        logout,
        checkAuth,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
