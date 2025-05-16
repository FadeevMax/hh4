'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';

export const dynamic = "force-dynamic";

export default function AuthError() {
  const [error, setError] = useState<string | null>(null);
  
  // Get error from query string without useSearchParams
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorMsg = params.get('error');
      if (errorMsg) {
        setError(errorMsg);
      }
    }
  }, []);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Authentication Error
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {error || 'An error occurred during authentication'}
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <Link
              href="/auth/signin"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Try Again
            </Link>
          </div>
        </div>
      </div>
    </Suspense>
  );
} 