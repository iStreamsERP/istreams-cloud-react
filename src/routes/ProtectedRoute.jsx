// ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = () => {
  const { userData, loading } = useAuth();

  if (loading) return null;

  return userData?.userEmail ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;