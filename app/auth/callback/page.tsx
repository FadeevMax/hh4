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
        
        if (errorParam) throw new Error(`HH Error: ${errorParam}`);
        if (!code || !stateParam) throw new Error('Missing parameters');

        // Получаем state из localStorage
        const storedState = localStorage.getItem('hh_oauth_state');
        console.log('[OAuth] Get state:', storedState, 'Received:', stateParam);

        if (!storedState || storedState !== stateParam) {
          throw new Error('Security check failed: State mismatch');
        }

        // Очищаем state сразу после проверки
        localStorage.removeItem('hh_oauth_state');

        // Отправляем код на сервер
        setStatus('Exchanging code...');
        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        if (!response.ok) throw new Error('Token exchange failed');
        
        // Сохраняем токены и редирект
        const { access_token, refresh_token } = await response.json();
        localStorage.setItem('accessToken', access_token);
        localStorage.setItem('refreshToken', refresh_token);
        
        router.push('/dashboard');
        
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        localStorage.removeItem('hh_oauth_state');
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
