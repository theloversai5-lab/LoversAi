'use client';

import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[#1E4636] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-8 text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-[#E2B451] mb-2">
          Something went wrong
        </h2>
        
        <p className="text-[#E2B451]/70 mb-6">
          We encountered an unexpected error. Please try again.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="text-[#E2B451] cursor-pointer mb-2 text-sm">
              Error details (dev only)
            </summary>
            <pre className="text-xs text-[#E2B451]/70 bg-[#1E4636]/50 p-3 rounded overflow-auto max-h-40">
              {error.message}
            </pre>
          </details>
        )}

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 px-6 py-3 bg-[#E2B451] text-[#1E4636] rounded-lg font-semibold hover:bg-[#E2B451]/90 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 px-6 py-3 bg-[#E2B451]/20 text-[#E2B451] rounded-lg font-semibold hover:bg-[#E2B451]/30 transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
