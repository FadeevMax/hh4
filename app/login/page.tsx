'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/context/AuthContext';

export default function Login() {
  const router = useRouter();
  const { } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  // On page load, check if the user is already logged in
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleHHLogin = () => {
    setIsLoading(true);
    
    // Clear any existing tokens to prevent background API calls with invalid tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiration');
    localStorage.removeItem('oauth_state');
    
    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state in localStorage
    localStorage.setItem('oauth_state', state);
    
    // Get redirect URI - hardcode for production but use env for local dev
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const redirectUri = isLocalhost 
      ? 'http://localhost:3000/auth/callback'
      : 'https://hh-7c9gp334w-maxs-projects-7786cae4.vercel.app/auth/callback';
    
    // Debug logging
    console.log('Generated state:', state);
    console.log('Is localhost:', isLocalhost);
    console.log('Final redirectUri value:', redirectUri);
    
    // Create the full authorization URL with proper encoding
    const clientId = 'MI6VLQ3KDNT1BOOLBC7VAB9F4IB1V8A73KAQ21IKI59Q618SQDD5IPA2R9GMPF9T';
    
    const authUrl = 
      `https://hh.ru/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `state=${encodeURIComponent(state)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log('Auth URL state:', state);
    console.log('Redirecting to auth URL:', authUrl);
    
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 border border-gray-100 text-center">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-6">Вход через HeadHunter</h2>
        <p className="text-gray-600 mb-8">
          Для использования сервиса автоматического отклика необходимо войти с помощью вашего аккаунта HeadHunter.
        </p>
        
        <button
          onClick={handleHHLogin}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-full bg-red-600 text-white font-bold text-lg shadow hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Перенаправление...
            </>
          ) : (
            'Войти через HeadHunter'
          )}
        </button>
        
        <div className="text-sm text-gray-500 mt-6">
          <p>
            При нажатии кнопки вы будете перенаправлены на официальный сайт HeadHunter для авторизации. 
            Ваши данные для входа никогда не будут сохранены в нашей системе.
          </p>
        </div>
      </div>
    </div>
  );
}
