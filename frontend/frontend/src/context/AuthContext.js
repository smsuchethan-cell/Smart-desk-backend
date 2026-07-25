import React, { createContext, useContext, useState } from "react";
import axios from "axios";

const ROOT = "https://smart-desk-backend-11.onrender.com";
const STORAGE_KEY = "smartdesk_token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || null);

  const login = async (password) => {
    const { data } = await axios.post(`${ROOT}/api/v1/auth/login`, { password });
    localStorage.setItem(STORAGE_KEY, data.token);
    setToken(data.token);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
