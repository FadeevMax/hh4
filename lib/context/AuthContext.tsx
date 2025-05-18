'use client';

import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Define context types
interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  connectToHH: () => void;
  hhConnected: boolean;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  connectToHH: () => {},
  hhConnected: false,
});

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hhConnected, setHHConnected] = useState(false);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const accessToken = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');
      
      if (accessToken && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        setHHConnected(true);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Login function - not used directly now since we use HH.ru OAuth
  const login = async (username: string, password: string) => {
    // This would typically call an API endpoint, but for this app we use HH.ru OAuth
    // We're keeping this for the interface consistency
    setIsLoading(true);
    
    try {
      // Mock login for demo
      const isValid = username === 'admin' && password === 'admin123';
      
      if (isValid) {
        setIsAuthenticated(true);
        setUser({
          id: 'local_user',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com'
        });
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('jobFilter');
    
    setUser(null);
    setIsAuthenticated(false);
    setHHConnected(false);
    
    router.push('/login');
  };

  // Connect to HH.ru
  const connectToHH = () => {
    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('hh_oauth_state', state);
    
    // Redirect to HH.ru OAuth authorization endpoint
    const clientId = process.env.NEXT_PUBLIC_HH_API_KEY || 'MI6VLQ3KDNT1BOOLBC7VAB9F4IB1V8A73KAQ21IKI59Q618SQDD5IPA2R9GMPF9T';
    const redirectUri = process.env.NEXT_PUBLIC_HH_REDIRECT_URI || 'http://localhost:3000/auth/callback';
    
    const authUrl = `https://hh.ru/oauth/authorize?response_type=code&client_id=${clientId}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    window.location.href = authUrl;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        connectToHH,
        hhConnected
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuthContext = () => useContext(AuthContext); 