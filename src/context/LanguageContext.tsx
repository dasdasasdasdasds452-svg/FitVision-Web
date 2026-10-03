"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore, ReactNode } from 'react';
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

const LANG_KEY = 'fitvision_lang';
const LANG_EVENT = 'fitvision-language';
// Thai is the primary audience, so it is the default (also on the server).
const DEFAULT_LANGUAGE: Language = 'th';

function readLanguage(): Language {
    try {
        const saved = localStorage.getItem(LANG_KEY);
        return saved === 'en' || saved === 'th' ? saved : DEFAULT_LANGUAGE;
    } catch {
        return DEFAULT_LANGUAGE; // storage unavailable
    }
}

function subscribeLanguage(onChange: () => void) {
    // Same tab (setLanguage) and other tabs (storage event) both update the UI.
    window.addEventListener(LANG_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
        window.removeEventListener(LANG_EVENT, onChange);
        window.removeEventListener('storage', onChange);
    };
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const language = useSyncExternalStore(subscribeLanguage, readLanguage, () => DEFAULT_LANGUAGE);

    useEffect(() => {
        // Screen readers and the browser's font fallback rely on the page language.
        document.documentElement.lang = language;
    }, [language]);

    const setLanguage = (lang: Language) => {
        try {
            localStorage.setItem(LANG_KEY, lang);
        } catch {
            // storage blocked: the choice can't be saved, so it can't be shown either
        }
        window.dispatchEvent(new Event(LANG_EVENT));
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
