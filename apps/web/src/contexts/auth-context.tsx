import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { useNavigate } from 'react-router-dom';
import { SessionTimeoutModal } from '@/components/session-timeout-modal';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  username: string;
  role: string;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, keepLoggedIn: boolean) => Promise<{ mustChangePassword?: boolean } | void>;
  logout: (reason?: 'manual' | 'timeout') => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout configuration
const ACCESS_TOKEN_DURATION = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_EXPIRY = 60 * 1000; // Show warning 60 seconds before expiry
const SESSION_CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const timeoutCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Clear all session timers
  const clearSessionTimers = useCallback(() => {
    if (timeoutCheckIntervalRef.current) {
      clearInterval(timeoutCheckIntervalRef.current);
      timeoutCheckIntervalRef.current = null;
    }
  }, []);

  // Refresh the session by getting a new access token
  const refreshSession = useCallback(async () => {
    try {
      const { accessToken, refreshToken } = await apiClient.refreshAccessToken();
      apiClient.setToken(accessToken);
      apiClient.setRefreshToken(refreshToken);
      
      // Reset session expiry
      const newExpiry = Date.now() + ACCESS_TOKEN_DURATION;
      setSessionExpiresAt(newExpiry);
      localStorage.setItem('session_expires_at', newExpiry.toString());
      
      setShowTimeoutWarning(false);
      return true;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return false;
    }
  }, []);

  // Check session status
  const checkSessionTimeout = useCallback(() => {
    if (!sessionExpiresAt || keepLoggedIn) return;

    const now = Date.now();
    const timeUntilExpiry = sessionExpiresAt - now;

    // Show warning if session will expire soon
    if (timeUntilExpiry <= WARNING_BEFORE_EXPIRY && timeUntilExpiry > 0) {
      setShowTimeoutWarning(true);
    }

    // Session has expired
    if (timeUntilExpiry <= 0) {
      logout('timeout');
    }
  }, [sessionExpiresAt, keepLoggedIn]);

  // Set up session timeout checker
  useEffect(() => {
    if (user && !keepLoggedIn && sessionExpiresAt) {
      clearSessionTimers();
      
      timeoutCheckIntervalRef.current = setInterval(() => {
        checkSessionTimeout();
      }, SESSION_CHECK_INTERVAL);
    }

    return () => {
      clearSessionTimers();
    };
  }, [user, keepLoggedIn, sessionExpiresAt, checkSessionTimeout, clearSessionTimers]);

  // Initialize auth state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const storedKeepLoggedIn = localStorage.getItem('keep_logged_in') === 'true';
        const storedExpiry = localStorage.getItem('session_expires_at');

        if (!token) {
          setIsLoading(false);
          return;
        }

        setKeepLoggedIn(storedKeepLoggedIn);
        
        if (storedExpiry) {
          setSessionExpiresAt(parseInt(storedExpiry));
        }

        const userData = await apiClient.getMe();
        setUser(userData);
      } catch (error) {
        apiClient.setToken(null);
        apiClient.setRefreshToken(null);
        localStorage.removeItem('keep_logged_in');
        localStorage.removeItem('session_expires_at');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string, keepLoggedInFlag: boolean) => {
    const response = await apiClient.login(username, password);
    
    // Store tokens even if password change is required
    // User needs tokens to authenticate for the password change endpoint
    apiClient.setToken(response.token || response.accessToken);
    if (response.refreshToken) {
      apiClient.setRefreshToken(response.refreshToken);
    }
    
    // Set user state (include mustChangePassword if present)
    setUser({
      ...response.user,
      mustChangePassword: response.mustChangePassword
    });
    setKeepLoggedIn(keepLoggedInFlag);
    
    // Store preference
    localStorage.setItem('keep_logged_in', keepLoggedInFlag.toString());
    
    if (!keepLoggedInFlag) {
      // Set session expiry time
      const expiry = Date.now() + ACCESS_TOKEN_DURATION;
      setSessionExpiresAt(expiry);
      localStorage.setItem('session_expires_at', expiry.toString());
    }
    
    // Return user info so login page can redirect based on role
    return { 
      user: response.user,
      mustChangePassword: response.mustChangePassword 
    };
  };

  const logout = useCallback((reason: 'manual' | 'timeout' = 'manual') => {
    clearSessionTimers();
    apiClient.logout();
    apiClient.setToken(null);
    setUser(null);
    setKeepLoggedIn(false);
    setSessionExpiresAt(null);
    setShowTimeoutWarning(false);
    localStorage.removeItem('keep_logged_in');
    localStorage.removeItem('session_expires_at');
    
    if (reason === 'timeout') {
      toast({
        title: 'Session Expired',
        description: 'You have been logged out due to inactivity for security reasons.',
        variant: 'destructive',
      });
      navigate('/login', { state: { sessionExpired: true } });
    }
  }, [clearSessionTimers, navigate, toast]);

  const handleStayLoggedIn = useCallback(async () => {
    const refreshed = await refreshSession();
    if (!refreshed) {
      logout('timeout');
    }
  }, [refreshSession, logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
      {!keepLoggedIn && (
        <SessionTimeoutModal
          isOpen={showTimeoutWarning}
          onStayLoggedIn={handleStayLoggedIn}
          onLogout={() => logout('timeout')}
          warningSeconds={60}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
