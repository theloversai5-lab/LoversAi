import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/api';

const AdminProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        await apiFetch('/admin/me');
        setIsAdmin(true);
      } catch (error) {
        console.warn('Admin access check failed', error);
        setIsAdmin(false);
      }
    };

    if (currentUser) checkAdmin();
    if (!currentUser) setIsAdmin(false);
  }, [currentUser]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Checking admin access...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Admin access required</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return children;
};

export default AdminProtectedRoute;
