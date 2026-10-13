import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check initial authentication state using httpOnly cookie session
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch {
        // If not authenticated or cookie missing, guest/visitor state
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const receivedUser = res.data.user;
    setUser(receivedUser);
    return receivedUser;
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    const receivedUser = res.data.user;
    setUser(receivedUser);
    return receivedUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout error:', e.message);
    } finally {
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch (e) {
      console.error('Failed to refresh user profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
