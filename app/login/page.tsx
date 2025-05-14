'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/context/AuthContext';

// Simple hardcoded credentials for demo - in production, these should be in a secure database
const VALID_CREDENTIALS = [
  { username: 'admin', password: 'admin123' }
];

export default function Login() {
  const router = useRouter();
  const { login, connectToHH, hhConnected } = useAuthContext();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // On page load, check if the user is already logged in
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate credentials locally (in a real app, this would be a server request)
    const isValid = VALID_CREDENTIALS.some(
      cred => cred.username === formData.username && cred.password === formData.password
    );
    
    if (isValid) {
      // Generate a random state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('oauth_state', state);
      
      // Redirect to HH.ru OAuth authorization endpoint
      const clientId = 'MI6VLQ3KDNT1BOOLBC7VAB9F4IB1V8A73KAQ21IKI59Q618SQDD5IPA2R9GMPF9T';
      
      // Always use the exact same redirect URI format throughout the application
      const redirectUri = 'http://localhost:3000/auth/callback';
      
      // Create the full authorization URL with proper encoding
      const authUrl = 
        `https://hh.ru/oauth/authorize?` +
        `response_type=code&` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `state=${encodeURIComponent(state)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      console.log('Redirecting to auth URL:', authUrl);
      console.log('Encoded redirect URI:', encodeURIComponent(redirectUri));
      
      window.location.href = authUrl;
    } else {
      setError('Неверное имя пользователя или пароль');
      setIsLoading(false);
    }
  };

  const handleHHConnect = () => {
    try {
      connectToHH();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка подключения к HeadHunter');
    }
  };

  const handleHHLogin = () => {
    setIsLoading(true);
    
    // Clear any existing tokens to prevent background API calls with invalid tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiration');
    localStorage.removeItem('oauth_state');
    
    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);
    
    // Redirect to HH.ru OAuth authorization endpoint
    const clientId = 'MI6VLQ3KDNT1BOOLBC7VAB9F4IB1V8A73KAQ21IKI59Q618SQDD5IPA2R9GMPF9T';
    
    // Always use the exact same redirect URI format throughout the application
    const redirectUri = 'http://localhost:3000/auth/callback';
    
    // Create the full authorization URL with proper encoding
    const authUrl = 
      `https://hh.ru/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `state=${encodeURIComponent(state)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log('Redirecting to auth URL:', authUrl);
    console.log('Encoded redirect URI:', encodeURIComponent(redirectUri));
    
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