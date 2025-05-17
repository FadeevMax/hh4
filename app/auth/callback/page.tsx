'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Проверяем авторизацию...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  const handleAuth = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      
      // Проверка обязательных параметров
      if (!params.has('code') || !params.has('state')) {
        throw new Error('Missing required parameters');
      }

      const code = params.get('code');
      const stateParam = params.get('state');
      const errorParam = params.get('error');

      // Проверка ошибок от HH
      if (errorParam) throw new Error(`HH Error: ${errorParam}`);

      // Проверка состояния
      const storedState = localStorage.getItem('oauth_state');
      console.log('State check:', { stored: storedState, received: stateParam });

      if (!storedState || storedState !== stateParam) {
        throw new Error('Security state mismatch');
      }

      // Очистка состояния
      localStorage.removeItem('oauth_state');

      // Дальнейшая обработка...
      
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  handleAuth();
}, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-xl font-semibold mb-4 text-center">{status}</h1>
        {error && (
          <div className="mt-4 p-4 bg-red-100 rounded-lg">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Вернуться к авторизации
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
