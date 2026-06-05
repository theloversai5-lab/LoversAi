// context/AuthContext.jsx — JWT-based auth context (Firebase removed)
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { authAPI, getToken, setToken, removeToken } from '../api/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a stored token and fetch user
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await Promise.race([
          authAPI.getMe(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth init timeout')), 12000)
          ),
        ]);
        if (data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('userRole', data.user.role);
        } else {
          // Invalid token
          removeToken();
          localStorage.removeItem('user');
        }
      } catch (err) {
        console.error('Auth init error:', err);
        removeToken();
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login with email/password
  const login = useCallback(async (email, password) => {
    const data = await authAPI.login({ email, password });
    if (data.success) {
      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userRole', data.user.role);
    }
    return data;
  }, []);

  // Register
  const register = useCallback(async (userData) => {
    const data = await authAPI.register(userData);
    if (data.success) {
      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('isNewUser', 'true');
    }
    return data;
  }, []);

  // Google OAuth
  const googleLogin = useCallback(async (credential, role) => {
    const data = await authAPI.googleLogin({ credential, role });
    if (data.success) {
      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userRole', data.user.role);
      if (data.isNewUser) {
        localStorage.setItem('isNewUser', 'true');
      }
    }
    return data;
  }, []);

  // Firebase Google OAuth
  const firebaseLogin = useCallback(async (token, role) => {
    const data = await authAPI.firebaseLogin({ token, role });
    if (data.success) {
      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userRole', data.user.role);
      if (data.isNewUser) {
        localStorage.setItem('isNewUser', 'true');
      }
    }
    return data;
  }, []);

  // Logout
  const logout = useCallback(() => {
    removeToken();
    setCurrentUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isNewUser');
    localStorage.removeItem('redirectAfterProfile');
    localStorage.removeItem('companyName');
    localStorage.removeItem('userEmail');
  }, []);

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    try {
      const data = await authAPI.getMe();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  }, []);

  const value = {
    currentUser,
    loading,
    login,
    register,
    googleLogin,
    firebaseLogin,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
