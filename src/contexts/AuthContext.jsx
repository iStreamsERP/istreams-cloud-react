import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Create the context
const AuthContext = createContext(null);

const PUBLIC_SERVICE_URL = import.meta.env.VITE_SOAP_ENDPOINT;

// Default userData object with standardized keys
const defaultUserData = {
  serviceUrl: PUBLIC_SERVICE_URL,
  clientURL: "",
  userEmail: "",
  userName: "",
  userEmployeeNo: "",
  userAvatar: "",
  companyName: "",
  companyAddress: "",
  companyLogo: "",
  companyCurrName: "",
  companyCurrDecimals: 0,
  companyCurrSymbol: null,
  companyCurrIsIndianStandard: false,
};

export const AuthProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [userData, setUserData] = useState(defaultUserData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUserData = JSON.parse(sessionStorage.getItem("userData")) || JSON.parse(localStorage.getItem("userData"));

    if (storedUserData?.userEmail) {
      setUserData(storedUserData);
    } else {
      setUserData(defaultUserData);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const login = useCallback((data, rememberMe = false) => {
    const newUserData = { ...defaultUserData, ...data };
    setUserData(newUserData);

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("userData", JSON.stringify(newUserData));
  }, []);

  const logout = useCallback(() => {
    setUserData(defaultUserData);
    localStorage.removeItem("userData");
    sessionStorage.removeItem("userData");
  }, []);

  if (loading) return null; // Don't render app until ready

  return <AuthContext.Provider value={{ login, logout, userData, loading }}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);