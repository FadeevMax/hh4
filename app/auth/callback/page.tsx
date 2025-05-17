'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Проверяем авторизацию...');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({
    received: null,
    stored: null
  });

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      try {
        // Clear any previously stored tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiration');
        
        // Get query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const stateParam = urlParams.get('state');
        
        // Get stored state
        const storedState = localStorage.getItem('oauth_state');
        
        // Debug information
        setDebugInfo({
          received: stateParam,
          stored: storedState
        });
        
        console.log('Received state:', stateParam);
        console.log('Stored state:', storedState);
        
        if (!code) {
          throw new Error('Отсутствует код авторизации');
        }
        
        // Check the state parameter
        if (!stateParam || stateParam !== storedState) {
          console.error('State mismatch:', { 
            received: stateParam, 
            stored: storedState,
            url: window.location.href
          });
          throw new Error('Ошибка проверки состояния (CSRF)');
        }
        
        // Clear state for security
        localStorage.removeItem('oauth_state');
        
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
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('Ошибка авторизации');
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка авторизации');
        
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
        
        {/* Debugging section - remove in production */}
        {debugInfo.received !== null && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left text-sm">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <p>Received state: <code>{debugInfo.received || 'null'}</code></p>
            <p>Stored state: <code>{debugInfo.stored || 'null'}</code></p>
          </div>
        )}
      </div>
    </div>
  );
}
