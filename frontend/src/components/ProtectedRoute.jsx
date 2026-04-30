// components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({
  children,
  requireProfile = false,
  requiredRole = null,
}) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loverai-page-bg">
        <div className="text-center animate-fadeInUp">
          <div className="mb-6">
            <img
              src="/images/LogoLoversai.png"
              alt="LoversAI"
              className="h-16 w-auto mx-auto animate-float"
            />
          </div>
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-loverai-gold/30 border-t-loverai-gold animate-spin"></div>
          <p className="mt-4 text-sm text-[#9a8b7a]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Role-based access check
  if (requiredRole) {
    const userRole = currentUser?.role;
    if (userRole !== requiredRole) {
      // User has a different role. Redirect them to login for the required role with a message.
      return <Navigate to={`/login?role=${requiredRole}&mismatch=true`} state={{ from: location.pathname }} replace />;
    }
  }

  if (requireProfile) {
    // Intentionally omitting the forced redirect to /user-form as requested
  }

  return children;
};

export default ProtectedRoute;
