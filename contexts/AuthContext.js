"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user and token from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    if (storedToken) {
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const login = (userData, authToken = null) => {
    setUser(userData);
    if (authToken) {
      setToken(authToken);
      localStorage.setItem("token", authToken);
    }
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/");
  };

  const isAuthenticated = () => {
    return user !== null && token !== null;
  };

  const getAuthHeader = () => {
    return token ? `Bearer ${token}` : null;
  };

  const fetchUser = async () => {
    if (!token) {
      throw new Error("No token available");
    }

    try {
      const response = await apiClient.getMe(token);
      
      // Merge the fetched user data with existing user data to preserve any frontend-only fields
      const updatedUser = {
        ...user,
        ...response.user,
        // Preserve method from original user if it exists
        method: user?.method || "password",
      };
      
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      console.error("Error fetching user data:", error);
      // If token is invalid, logout
      if (error.message.includes("401") || error.message.includes("403")) {
        logout();
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, isLoading, getAuthHeader, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
