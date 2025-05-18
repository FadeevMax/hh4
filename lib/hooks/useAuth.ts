'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  hhId?: string;
}

interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: User | null;
  hhConnected: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

export function useAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    isLoading: true,
    user: null,
    hhConnected: false,
    accessToken: null,
    refreshToken: null,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const user = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (user) {
      setAuthState({
        isLoggedIn: true,
        isLoading: false,
        user: JSON.parse(user),
        hhConnected: !!accessToken,
        accessToken,
        refreshToken,
      });
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Login to the site (not HH.ru yet)
  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      
      // Store the user in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setAuthState({
        isLoggedIn: true,
        isLoading: false,
        user: data.user,
        hhConnected: false,
        accessToken: null,
        refreshToken: null,
      });

      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

 const connectToHH = useCallback(() => {
  const state = [
    Math.random().toString(36).substring(2, 15),
    Date.now().toString(36),
    Math.random().toString(36).substring(2, 15)
  ].join('_');
  
  localStorage.setItem('hh_oauth_state', state);
  
  // Жестко прописанный redirect_uri для продакшена
  const redirectUri = process.env.NEXT_PUBLIC_HH_REDIRECT_URI || 'http://localhost:3000/auth/callback';
  
  const authUrl = new URL('https://hh.ru/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('redirect_uri', redirectUri);

  window.location.assign(authUrl.toString());
}, []);
  
  // Process HH.ru OAuth token response
  const processHHToken = useCallback(async (code: string) => {
    try {
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Token exchange failed');
      }

      const tokenData = await response.json();
      
      // Save tokens and user to localStorage
      localStorage.setItem('accessToken', tokenData.access_token);
      localStorage.setItem('refreshToken', tokenData.refresh_token);
      localStorage.setItem('user', JSON.stringify(tokenData.user));
      
      // Update auth state
      setAuthState({
        isLoggedIn: true,
        isLoading: false,
        user: tokenData.user,
        hhConnected: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      });

      return tokenData;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // Reset auth state
    setAuthState({
      isLoggedIn: false,
      isLoading: false,
      user: null,
      hhConnected: false,
      accessToken: null,
      refreshToken: null,
    });
    
    // Redirect to login page
    router.push('/login');
  }, [router]);

  // Refresh the access token
  const refreshToken = useCallback(async () => {
    if (!authState.refreshToken || !authState.user) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: authState.user.id,
          refresh_token: authState.refreshToken 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // If refresh token is invalid, log out the user
        if (response.status === 400 && error.error === 'invalid_grant') {
          logout();
        }
        
        throw new Error(error.error || 'Token refresh failed');
      }

      const tokenData = await response.json();
      
      // Update tokens in localStorage
      localStorage.setItem('accessToken', tokenData.access_token);
      localStorage.setItem('refreshToken', tokenData.refresh_token);
      
      // Update auth state
      setAuthState(prev => ({
        ...prev,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      }));

      return tokenData.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }, [authState.refreshToken, authState.user, logout]);

  return {
    ...authState,
    login,
    connectToHH,
    processHHToken,
    refreshToken,
    logout,
  };
} 
