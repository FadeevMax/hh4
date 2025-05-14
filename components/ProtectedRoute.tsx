'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthentication();
  }, [router]);

  const checkAuthentication = async () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const user = localStorage.getItem('user');
    
    if (!accessToken || !user) {
      setIsAuthenticated(false);
      setAuthError('Вы не авторизованы. Пожалуйста, войдите.');
      router.push('/login');
      return;
    }
    
    // Check token expiration
    const tokenExpirationStr = localStorage.getItem('tokenExpiration');
    
    if (tokenExpirationStr) {
      const tokenExpiration = parseInt(tokenExpirationStr, 10);
      
      if (tokenExpiration < Date.now()) {
        // Token has expired, try to refresh it
        if (refreshToken && user) {
          try {
            const userData = JSON.parse(user);
            
            const refreshResponse = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: userData.id
              })
            });
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              
              // Token refreshed successfully
              if (refreshData.success) {
                // Update expiration in localStorage
                const newExpiration = Date.now() + (refreshData.expiresIn * 1000);
                localStorage.setItem('tokenExpiration', newExpiration.toString());
                
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
              }
            } else {
              const errorData = await refreshResponse.json();
              
              // If refresh token is expired, we need to re-authenticate
              if (errorData.requireReauth) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('tokenExpiration');
                
                setIsAuthenticated(false);
                setAuthError('Ваша сессия истекла. Пожалуйста, войдите снова.');
                setIsLoading(false);
                return;
              }
            }
          } catch (error) {
            console.error('Error refreshing token:', error);
          }
        }
        
        // If we get here, refresh failed
        setIsAuthenticated(false);
        setAuthError('Ваша сессия истекла. Пожалуйста, войдите снова.');
      } else {
        // Token is still valid
        setIsAuthenticated(true);
      }
    } else {
      // No expiration stored, assume token is valid
      setIsAuthenticated(true);
    }
    
    setIsLoading(false);
  };

  const handleReAuthenticate = () => {
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">Загрузка...</h2>
          <p className="text-gray-500 mt-2">Пожалуйста, подождите</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md p-8 bg-white shadow-lg rounded-lg">
            <svg className="h-16 w-16 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-700 mt-4">{authError}</h2>
            <button
              onClick={handleReAuthenticate}
              className="mt-6 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Войти снова
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
} 