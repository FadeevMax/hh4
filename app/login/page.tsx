'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) router.push('/dashboard');
  }, [router]);

  const handleHHLogin = () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Генерация сложного state
      const state = [
        Math.random().toString(36).substring(2, 15),
        Date.now().toString(36),
        Math.random().toString(36).substring(2, 15)
      ].join('_');
      
      // Синхронное сохранение state
      localStorage.setItem('hh_oauth_state', state);
      console.log('[OAuth] Set state:', state);

      // Получение конфигурации
      const clientId = process.env.NEXT_PUBLIC_HH_CLIENT_ID;
      const redirectUri = process.env.NEXT_PUBLIC_HH_REDIRECT_URI;

      if (!clientId || !redirectUri) {
        throw new Error('Missing required configuration');
      }

      // Формирование URL
      const authUrl = `https://hh.ru/oauth/authorize?${
        new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          state: state,
          redirect_uri: redirectUri
        })
      }`;

      console.log('[OAuth] Redirecting to:', authUrl);
      window.location.href = authUrl;
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start login process');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Вход в систему
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Авторизуйтесь через HH.ru для начала работы
          </p>
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error}
                </h3>
              </div>
            </div>
          </div>
        )}
        <div>
          <button
            onClick={handleHHLogin}
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Загрузка...' : 'Войти через HH.ru'}
          </button>
        </div>
      </div>
    </div>
  );
}
