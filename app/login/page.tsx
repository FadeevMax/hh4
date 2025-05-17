'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) router.push('/dashboard');
  }, [router]);

  const handleHHLogin = () => {
    setIsLoading(true);
    
    // Генерация state с добавлением временной метки
    const state = [
      Math.random().toString(36).substring(2, 15),
      Date.now().toString(36),
      Math.random().toString(36).substring(2, 15)
    ].join('_');
    
    localStorage.setItem('oauth_state', state);
    
    // Формирование redirect_uri
    const isProduction = process.env.NODE_ENV === 'production';
    const redirectUri = isProduction 
      ? 'https://hh-7c9gp334w-maxs-projects-7786cae4.vercel.app/auth/callback'
      : 'http://localhost:3000/auth/callback';

    // Формирование URL с использованием URL API
    const authUrl = new URL('https://hh.ru/oauth/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', 'MI6VLQ3KDNT1BOOLBC7VAB9F4IB1V8A73KAQ21IKI59Q618SQDD5IPA2R9GMPF9T');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', state);

    console.log('Auth URL:', authUrl.toString());
    window.location.assign(authUrl.toString());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 border border-gray-100 text-center">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-6">Вход через HeadHunter</h2>
        <p className="text-gray-600 mb-8">
          Для использования сервиса необходимо войти с помощью аккаунта HeadHunter.
        </p>
        
        <button
          onClick={handleHHLogin}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-full bg-red-600 text-white font-bold text-lg shadow hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? 'Перенаправление...' : 'Войти через HeadHunter'}
        </button>
        
        <div className="text-sm text-gray-500 mt-6">
          <p>Вы будете перенаправлены на официальный сайт HeadHunter для авторизации.</p>
        </div>
      </div>
    </div>
  );
}
