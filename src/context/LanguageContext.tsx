"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { en } from '@/locales/en';
import { th } from '@/locales/th';

type Language = 'en' | 'th';
type Dictionary = typeof en;

interface LanguageContextType {
    language: Language;
    t: Dictionary;
    setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    // Thai is the primary audience, so it is the default.
    const [language, setLanguageState] = useState<Language>('th');

    useEffect(() => {
        // Run once on mount: sync with localStorage if exists
        try {
            const savedLang = localStorage.getItem('fitvision_lang');
            if (savedLang === 'en' || savedLang === 'th') {
                setLanguageState(savedLang);
            }
        } catch {
            // storage unavailable — keep default
        }
    }, []);

    useEffect(() => {
        // Screen readers and the browser's font fallback rely on the page language.
        document.documentElement.lang = language;
    }, [language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        try {
            localStorage.setItem('fitvision_lang', lang);
        } catch {
            // ignore
        }
    };

    const t = language === 'en' ? en : th;

    return (
        <LanguageContext.Provider value={{ language, t, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
