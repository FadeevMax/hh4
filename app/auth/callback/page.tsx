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
        // Парсинг параметров
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const stateParam = urlParams.get('state');
        const errorParam = urlParams.get('error');

        console.log('Callback params:', { code, stateParam, errorParam });

        // Проверка ошибок
        if (errorParam) throw new Error(`Ошибка авторизации: ${errorParam}`);
        if (!code || !stateParam) throw new Error('Неполные параметры авторизации');

        // Проверка state
        const storedState = localStorage.getItem('oauth_state');
        console.log('State check:', { stored: storedState, received: stateParam });

        if (storedState !== stateParam) {
          throw new Error('Несоответствие параметра безопасности');
        }

        // Обмен кода на токен
        setStatus('Получаем токен доступа...');
        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            client_id: 'MI6VLQ3KDNT1BOOLBC7VAB9F4IB1V8A73KAQ21IKI59Q618SQDD5IPA2R9GMPF9T',
            client_secret: 'JFVAEI4Q1HRILG8Q6IDL7SAJK1PCS6FHL9I6B9K0CI4SVDIRKGVE1TMI9N658TDQ',
          }),
        });

        if (!response.ok) throw new Error('Ошибка сервера');
        
        const { access_token, refresh_token, expires_in } = await response.json();
        
        // Сохранение токенов
        localStorage.setItem('accessToken', access_token);
        localStorage.setItem('refreshToken', refresh_token);
        localStorage.setItem('tokenExpiration', String(Date.now() + expires_in * 1000));
        
        // Перенаправление
        router.push('/dashboard');
        
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
        localStorage.removeItem('oauth_state');
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
