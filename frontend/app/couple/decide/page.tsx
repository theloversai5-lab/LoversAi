'use client';

import { useRouter } from 'next/navigation';

export default function DecidePage() {
  const router = useRouter();
  const handleChoice = (choice: 'self' | 'planner') => {
    if (choice === 'self') {
      router.push('/couple/vendors');
    } else {
      router.push('/couple/request');
    }
  };

  return (
    <div className="min-h-screen bg-[#1E4636] flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-[#E2B451] mb-4">
            How do you want
            <br />
            to plan?
          </h1>
          <p className="text-[#E2B451]/80 text-lg">
            Choose your path
          </p>
        </div>

        {/* Two Choice Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Plan Myself Card */}
          <button
            onClick={() => handleChoice('self')}
            className="group relative bg-[#E2B451] rounded-lg p-8 text-left hover:scale-105 transition-transform duration-300"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-[#F08A3C] rounded-t-lg" />
            
            <div className="mb-6">
              <div className="w-16 h-16 bg-[#1E4636] rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-[#E2B451]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-[#1E4636] mb-2">
                Plan myself
              </h2>
              <p className="text-[#1E4636]/70 text-lg">
                Find and hire vendors
                <br />
                Build your dream team
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start text-[#1E4636]">
                <span className="mr-2">•</span>
                <span>Browse wedding vendors</span>
              </li>
              <li className="flex items-start text-[#1E4636]">
                <span className="mr-2">•</span>
                <span>Direct communication</span>
              </li>
              <li className="flex items-start text-[#1E4636]">
                <span className="mr-2">•</span>
                <span>Full control over choices</span>
              </li>
              <li className="flex items-start text-[#1E4636]">
                <span className="mr-2">•</span>
                <span>No planner fees</span>
              </li>
            </ul>

            <div className="inline-flex items-center text-[#1E4636] font-semibold group-hover:gap-3 gap-2 transition-all">
              <span>Start browsing</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </button>

          {/* Hire Planner Card */}
          <button
            onClick={() => handleChoice('planner')}
            className="group relative bg-[#E2B451] rounded-lg p-8 text-left hover:scale-105 transition-transform duration-300"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-[#3A2563] rounded-t-lg" />
            
            <div className="mb-6">
              <div className="w-16 h-16 bg-[#1E4636] rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-[#E2B451]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-[#1E4636] mb-2">
                Hire planner
              </h2>
              <p className="text-[#1E4636]/70 text-lg">
                Work with experts
                <br />
                Stress free planning
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start text-[#1E4636]">
                <span className="mr-2">•</span>
                <span>Expert guidance and support</span>
              </li>
              <li className="flex items-start text-[#1E4636]">
                <span className="mr-2">•</span>
                <span>Vendor recommendations</span>
              </li>
              <li className="flex items-start text-[#1E4636]">
                <span className="mr-2">•</span>
                <span>Timeline management</span>
              </li>
              <li className="flex items-start text-[#1E4636]">
                <span className="mr-2">•</span>
                <span>Budget optimization</span>
              </li>
            </ul>

            <div className="inline-flex items-center text-[#1E4636] font-semibold group-hover:gap-3 gap-2 transition-all">
              <span>Request planner</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </button>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.back()}
            className="text-[#E2B451]/70 hover:text-[#E2B451] transition-colors"
          >
            ← Go back
          </button>
        </div>
      </div>
    </div>
  );
}
