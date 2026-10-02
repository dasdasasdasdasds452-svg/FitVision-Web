"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <main className="min-h-[70vh] md:ml-64 flex flex-col items-center justify-center text-center px-5 py-16 gap-4">
      <p className="text-6xl font-bold text-white/20 tabular-nums">404</p>
      <h1 className="text-2xl font-semibold text-white">{t.system.notFoundTitle}</h1>
      <p className="text-slate-300 max-w-sm">{t.system.notFoundDesc}</p>
      <Link href="/" className="mt-2 h-12 px-6 rounded-xl bg-primary text-background-dark font-semibold flex items-center gap-2 hover:brightness-110">
        <span className="material-symbols-outlined text-xl">home</span>
        {t.system.goHome}
      </Link>
    </main>
  );
}
