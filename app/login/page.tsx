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
    
    // Генерация сложного state
    const state = [
      Math.random().toString(36).substring(2, 15),
      Date.now().toString(36),
      Math.random().toString(36).substring(2, 15)
    ].join('_');
    
    // Синхронное сохранение state
    localStorage.setItem('hh_oauth_state', state);
    console.log('Stored state:', state);

    // Формирование URL
    const redirectUri = process.env.NEXT_PUBLIC_HH_REDIRECT_URI || 'http://localhost:3000/auth/callback';
    
    const authUrl = `https://hh.ru/oauth/authorize?${
      new URLSearchParams({
        response_type: 'code',
        client_id: 'MI6VLQ3KDNT1BOOLBC7VAB9F4IB1V8A73KAQ21IKI59Q618SQDD5IPA2R9GMPF9T',
        state: state,
        redirect_uri: redirectUri
      })
    }`;

    console.log('Redirecting to:', authUrl);
    window.location.href = authUrl;
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
