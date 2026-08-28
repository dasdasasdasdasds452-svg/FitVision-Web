"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark text-slate-100 font-sans p-4" style={{ animation: "fade-up 0.8s ease-out forwards" }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
      <span className="material-symbols-outlined text-red-500 text-6xl mb-6 shadow-neon rounded-full p-4 bg-red-500/10">
        error
      </span>
      <h1 className="text-3xl font-display font-bold mb-4 text-white">Oops! Something went wrong</h1>
      <p className="text-slate-400 mb-8 max-w-md text-center">
        We hit a snag in the FitVision system. Don't worry, your gains are safe.
      </p>
      
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-white transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Try Again
        </button>
        <Link 
          href="/"
          className="px-6 py-3 bg-surface-darker text-white border border-white/10 font-bold rounded-xl hover:border-primary/50 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">home</span>
          Go Home
        </Link>
      </div>
    </div>
  );
}
