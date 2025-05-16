'use client';

import { signIn } from 'next-auth/react';
import { Suspense, useState, useEffect } from 'react';

export const dynamic = "force-dynamic";

export default function SignIn() {
  const [callbackUrl, setCallbackUrl] = useState('/');

  // Get the callback URL from the query string without useSearchParams
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const callback = params.get('callbackUrl');
      if (callback) {
        setCallbackUrl(callback);
      }
    }
  }, []);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Connect with HH.ru to start auto-applying
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <button
              onClick={() => signIn('hh', { callbackUrl })}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in with HH.ru
            </button>
          </div>
        </div>
      </div>
    </Suspense>
  );
} 