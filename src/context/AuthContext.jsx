import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({
          username: payload.sub,
          role: payload.role,
          isSuperAdmin: payload.role === "ROLE_SUPER_ADMIN",
          isAdmin:
            payload.role === "ROLE_ADMIN" ||
            payload.role === "ROLE_SUPER_ADMIN",
          isManager:
            payload.role === "ROLE_MANAGER" ||
            payload.role === "ROLE_ADMIN" ||
            payload.role === "ROLE_SUPER_ADMIN",
          isStaff: true, // all authenticated users are at least staff
        });
      } catch {
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await api.post("/auth/login", { username, password });
    localStorage.setItem("token", res.data.token);
    const payload = JSON.parse(atob(res.data.token.split(".")[1]));
    setUser({
      username: payload.sub,
      role: payload.role,
      isSuperAdmin: payload.role === "ROLE_SUPER_ADMIN",
      isAdmin:
        payload.role === "ROLE_ADMIN" || payload.role === "ROLE_SUPER_ADMIN",
      isManager:
        payload.role === "ROLE_MANAGER" ||
        payload.role === "ROLE_ADMIN" ||
        payload.role === "ROLE_SUPER_ADMIN",
      isStaff: true,
    });
  };

  const register = async (username, password) => {
    await api.post("/auth/register", { username, password });
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAdmin: !!user?.isAdmin,
        isManager: !!user?.isManager,
        isSuperAdmin: !!user?.isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
