'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const stateParam = params.get('state');
    const errorParam = params.get('error');

    const handleAuth = async () => {
      try {
        console.log('Callback params:', { code, stateParam, errorParam });
        
        if (errorParam) {
          console.error('HH.ru returned error:', errorParam);
          throw new Error(`HH Error: ${errorParam}`);
        }
        if (!code || !stateParam) {
          console.error('Missing parameters:', { code, stateParam });
          throw new Error('Missing parameters');
        }

        // Получаем state из localStorage
        const storedState = localStorage.getItem('hh_oauth_state');
        console.log('[OAuth] Get state:', storedState, 'Received:', stateParam);

        if (!storedState || storedState !== stateParam) {
          console.error('State mismatch:', { stored: storedState, received: stateParam });
          throw new Error('Security check failed: State mismatch');
        }

        // Очищаем state сразу после проверки
        localStorage.removeItem('hh_oauth_state');

        // Отправляем код на сервер
        setStatus('Exchanging code...');
        console.log('Sending code to server for exchange');
        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        const data = await response.json();
        console.log('Token exchange response:', { status: response.status, ok: response.ok });

        if (!response.ok) {
          console.error('Token exchange failed:', data);
          throw new Error(data.error || 'Token exchange failed');
        }
        
        // Сохраняем токены и редирект
        console.log('Saving tokens to localStorage');
        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        console.log('Redirecting to dashboard');
        router.push('/dashboard');
        
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Произошла ошибка при авторизации');
        setStatus('error');
      }
    };

    handleAuth();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Ошибка авторизации
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {error}
            </p>
          </div>
          <div className="mt-8">
            <button
              onClick={() => router.push('/')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Вернуться к авторизации
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {status}
          </h2>
        </div>
      </div>
    </div>
  );
}
