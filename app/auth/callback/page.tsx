'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Проверяем авторизацию...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      try {
        // Clear any previously stored tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiration');

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const stateParam = urlParams.get('state');

        // Check the stored state
        const storedState = localStorage.getItem('oauth_state');
        localStorage.removeItem('oauth_state'); // clear it for security

        if (!code) {
          throw new Error('Отсутствует код авторизации');
        }

        if (!stateParam || stateParam !== storedState) {
          throw new Error('Ошибка проверки состояния (возможная атака CSRF)');
        }

        setStatus('Получение токена...');

        // Send code to your API for token exchange
        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Ошибка при получении токена');
        }

        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);
        localStorage.setItem('tokenExpiration', data.expirationTimestamp.toString());
        localStorage.setItem('user', JSON.stringify(data.user));

        setStatus('Авторизация успешна! Перенаправление...');
        router.push('/dashboard');
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('Ошибка авторизации');
        setError(error instanceof Error ? error.message : 'Неизвестная ошибка авторизации');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiration');
      }
    };

    exchangeCodeForToken();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold mb-4">{status}</h2>

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
            <p>{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Вернуться на страницу входа
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
