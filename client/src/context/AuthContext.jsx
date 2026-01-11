import React, { createContext, useState, useContext, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);

  // Initialize - check for existing token
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        // Verify token is still valid
        try {
          const response = await authAPI.getMe();
          setUser(response.data.data.user);
          localStorage.setItem("user", JSON.stringify(response.data.data.user));
        } catch (error) {
          // Token invalid, clear storage
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // Login
  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { data } = response.data;

      if (data.requires2FA || response.data.requires2FA) {
        setRequires2FA(true);
        return { success: true, requires2FA: true };
      }

      setToken(data.token);
      setUser(data.user);
      setRequires2FA(false);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      return { success: true, requires2FA: false };
    } catch (error) {
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setToken(null);
      setUser(null);
      setRequires2FA(false);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  };

  // Update user
  const updateUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data.data.user);
      localStorage.setItem("user", JSON.stringify(response.data.data.user));
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  // Change password
  const changePassword = async (data) => {
    try {
      const response = await authAPI.changePassword(data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // 2FA Setup
  const setup2FA = async () => {
    try {
      const response = await authAPI.setup2FA();
      return response.data.data;
    } catch (error) {
      throw error;
    }
  };

  // 2FA Verify
  const verify2FA = async (token) => {
    try {
      const response = await authAPI.verify2FA(token);
      await updateUser(); // Refresh user data
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // 2FA Disable
  const disable2FA = async (data) => {
    try {
      const response = await authAPI.disable2FA(data);
      await updateUser(); // Refresh user data
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    requires2FA,
    setRequires2FA,
    login,
    logout,
    updateUser,
    changePassword,
    setup2FA,
    verify2FA,
    disable2FA,
    isAuthenticated: !!token,
    isSuperAdmin: user?.role === "super_admin",
    isAdmin: user?.role === "admin" || user?.role === "super_admin",
    isManager:
      user?.role === "manager" ||
      user?.role === "admin" ||
      user?.role === "super_admin",
    isEmployee: user?.role === "employee",
    isObserver: user?.role === "observer",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
