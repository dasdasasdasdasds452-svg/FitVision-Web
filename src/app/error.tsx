"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main role="alert" className="min-h-[70vh] md:ml-64 flex flex-col items-center justify-center text-center px-5 py-16 gap-4">
      <span className="material-symbols-outlined text-5xl text-orange-300">error</span>
      <h1 className="text-2xl font-semibold text-white">{t.system.errorTitle}</h1>
      <p className="text-slate-300 max-w-sm">{t.system.errorDesc}</p>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="h-12 px-6 rounded-xl bg-primary text-background-dark font-semibold flex items-center gap-2 cursor-pointer hover:brightness-110"
        >
          <span className="material-symbols-outlined text-xl">refresh</span>
          {t.system.tryAgain}
        </button>
        <Link href="/" className="h-12 px-6 rounded-xl border border-white/20 text-white font-medium flex items-center gap-2 hover:bg-white/5">
          <span className="material-symbols-outlined text-xl">home</span>
          {t.system.goHome}
        </Link>
      </div>
    </main>
  );
}
