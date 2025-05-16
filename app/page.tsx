'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = "force-dynamic";

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Instead of using useSearchParams, check manually on the client side
  useEffect(() => {
    // Check if user is logged in
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      router.push('/dashboard');
      return;
    }

    // Get URL parameters manually on the client side
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const oauthError = urlParams.get('error');
      
      if (code) {
        handleOAuthCallback(code, state);
      } else if (oauthError) {
        setError(`Ошибка авторизации: ${oauthError}`);
        setStatus('error');
      }
    }
  }, [router]);

  const handleOAuthCallback = useCallback(async (code: string, state: string | null) => {
    setStatus('loading');
    try {
      const storedState = localStorage.getItem('oauth_state');
      localStorage.removeItem('oauth_state');
      if (!state || state !== storedState) {
        throw new Error('Ошибка проверки безопасности. Попробуйте войти снова.');
      }
      console.log('Processing OAuth callback with code:', code);
      console.log('Current URL:', window.location.href);
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Token exchange error:', data);
        throw new Error(data.error || 'Ошибка при получении токена');
      }
      localStorage.setItem('accessToken', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setStatus('success');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Произошла ошибка при авторизации');
    }
  }, [router]);

  // If we're processing an OAuth callback, show a loading/result screen
  if (status === 'loading' || status === 'success' || status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 border border-gray-100 text-center">
          {status === 'loading' && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Завершаем авторизацию...</h2>
              <p className="text-gray-600">Пожалуйста, подождите, идет обработка данных авторизации</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <h2 className="text-2xl font-bold text-red-600 mb-4">Ошибка авторизации</h2>
              <p className="text-gray-700 mb-6">{error}</p>
              <Link 
                href="/login"
                className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
              >
                Вернуться на страницу входа
              </Link>
            </>
          )}
          
          {status === 'success' && (
            <>
              <h2 className="text-2xl font-bold text-green-600 mb-4">Авторизация успешна!</h2>
              <p className="text-gray-700">Перенаправляем вас в личный кабинет...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Regular home page content
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <header className="w-full border-b border-gray-200 bg-white py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-red-600">hh<span className="text-black">Auto</span></span>
          </div>
          <nav className="hidden md:flex gap-8 text-base font-medium">
            <Link href="#mission" className="hover:text-red-600 transition">Миссия</Link>
            <Link href="#how" className="hover:text-red-600 transition">Как это работает</Link>
            <Link href="#about" className="hover:text-red-600 transition">О нас</Link>
            <Link href="#pricing" className="hover:text-red-600 transition">Тарифы</Link>
            <Link href="#blog" className="hover:text-red-600 transition">Блог</Link>
          </nav>
          <Link href="/login" className="ml-4 px-6 py-2 rounded-full bg-red-600 text-white font-semibold shadow hover:bg-red-700 transition">Войти в систему</Link>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h1 className="mt-16 text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 max-w-3xl leading-tight">
            Умный сервис для поиска работы на <span className="text-red-600">hh.ru</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-xl">
            Автоматически ищет вакансии, анализирует ваше резюме и откликается на подходящие предложения за секунды.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="px-8 py-3 rounded-full bg-red-600 text-white font-bold text-lg shadow hover:bg-red-700 transition">
              Войти в систему
            </Link>
            <button className="px-8 py-3 rounded-full border-2 border-red-600 text-red-600 font-bold text-lg hover:bg-red-50 transition">
              Попробовать бесплатно
            </button>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl w-full">
            <div className="bg-red-50 rounded-lg p-6 shadow-sm">
              <div className="text-2xl font-bold text-red-600 mb-2">Быстро</div>
              <div className="text-gray-700">Более 100 откликов за 5 минут</div>
            </div>
            <div className="bg-red-50 rounded-lg p-6 shadow-sm">
              <div className="text-2xl font-bold text-red-600 mb-2">Безопасно</div>
              <div className="text-gray-700">Никаких блокировок и ограничений</div>
            </div>
            <div className="bg-red-50 rounded-lg p-6 shadow-sm">
              <div className="text-2xl font-bold text-red-600 mb-2">Эффективно</div>
              <div className="text-gray-700">Экономит до 8 часов в день</div>
            </div>
          </div>
          <div className="mt-16 text-gray-400 text-sm">© 2024 hhAuto. Неофициальный сервис для автоматизации поиска работы на hh.ru</div>
        </main>
      </div>
    </Suspense>
  );
}
