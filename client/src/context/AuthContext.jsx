import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE } from "../config/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("axon_token") || "");
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState("landing"); // "landing" | "dashboard"
  const [authError, setAuthError] = useState("");

  // Check URL params for token or code after GitHub OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    const codeParam = params.get("code");
    const errorParam = params.get("error");
    const authStatus = params.get("auth_status");

    if (tokenParam) {
      localStorage.setItem("axon_token", tokenParam);
      setToken(tokenParam);
      setCurrentView("dashboard");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (codeParam) {
      // GitHub redirected directly to frontend with code! Exchange with backend
      const exchangeCode = async () => {
        try {
          const res = await fetch(`${API_BASE}/auth/github/exchange`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: codeParam })
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("axon_token", data.token);
            setToken(data.token);
            setUser(data.user);
            setCurrentView("dashboard");
          } else {
            const errData = await res.json();
            setAuthError(errData.error || "Failed to exchange GitHub authorization code");
            setIsAuthModalOpen(true);
          }
        } catch (e) {
          setAuthError("Failed to reach Axon server for code exchange");
          setIsAuthModalOpen(true);
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      exchangeCode();
    } else if (errorParam || authStatus) {
      setAuthError(decodeURIComponent(errorParam || "Authentication configuration required in .env"));
      setIsAuthModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch current user if token exists
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token invalid or expired
          localStorage.removeItem("axon_token");
          setToken("");
          setUser(null);
        }
      } catch (err) {
        console.warn("Could not reach Axon server auth check:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const loginWithGitHub = () => {
    // Strictly redirect to backend GitHub OAuth endpoint preserving frontend origin
    const returnTo = typeof window !== "undefined" ? window.location.origin : "";
    const redirectUrl = returnTo
      ? `${API_BASE}/auth/github?return_to=${encodeURIComponent(returnTo)}`
      : `${API_BASE}/auth/github`;
    window.location.href = redirectUrl;
  };

  const devLogin = async (username = "bharatSati", name = "Bharat Sati", email = "ceo@axon.workspace") => {
    try {
      const res = await fetch(`${API_BASE}/auth/dev-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name, email })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("axon_token", data.token);
        setToken(data.token);
        setUser(data.user);
        setIsAuthModalOpen(false);
        setCurrentView("dashboard");
        return { success: true };
      }
    } catch (err) {
      console.error("Dev login failed:", err);
      setAuthError("Could not connect to Axon authentication server. Please verify your server connection.");
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.warn("Logout request failed:", e);
    }
    localStorage.removeItem("axon_token");
    localStorage.removeItem("axon_active_workspace_id");
    setToken("");
    setUser(null);
    setCurrentView("landing");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        currentView,
        setCurrentView,
        loginWithGitHub,
        devLogin,
        logout,
        authError,
        setAuthError
      }}
    >
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
