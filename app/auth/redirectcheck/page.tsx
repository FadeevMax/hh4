'use client';

export default function RedirectCheck() {
  // Calculate the encoded URL for clarity
  const redirectUri = 'http://localhost:3000/auth/callback';
  const encodedUri = encodeURIComponent(redirectUri);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Redirect Check Successful</h2>
        <p className="mb-4">
          If you&apos;re seeing this page, it means the redirect URI is working correctly. 
          You can now register the following URL in your HH.ru developer account:
        </p>
        <div className="bg-gray-100 p-4 rounded text-left mb-4">
          <p className="text-sm font-bold mb-2">Original URI:</p>
          <code className="block text-xs break-all">{redirectUri}</code>
        </div>
        <div className="bg-gray-100 p-4 rounded text-left mb-6">
          <p className="text-sm font-bold mb-2">URL-encoded URI (as used in requests):</p>
          <code className="block text-xs break-all">{encodedUri}</code>
        </div>
        <button
          onClick={() => window.location.href = '/login'}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Return to Login Page
        </button>
      </div>
    </div>
  );
} 