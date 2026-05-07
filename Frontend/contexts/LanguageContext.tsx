"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "hi" | "mr" | "es" | "fr" | "de" | "ja";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string; // Kept for minimal UI strings if needed, but simplified
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Sync state with localStorage and Cookies on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("app_language") as Language;
    
    // Also check googtrans cookie to stay in sync with auto-translate
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const googTrans = getCookie('googtrans');
    if (googTrans) {
      const langCode = googTrans.split('/').pop() as Language;
      if (langCode && langCode !== language) {
        setLanguageState(langCode);
        localStorage.setItem("app_language", langCode);
      }
    } else if (savedLang) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
    
    const hostname = window.location.hostname;
    
    if (lang === 'en') {
      // Clear cookies for English
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`;
    } else {
      // Set Google Translate Cookie
      const googleTransValue = `/en/${lang}`;
      document.cookie = `googtrans=${googleTransValue}; path=/;`;
      document.cookie = `googtrans=${googleTransValue}; path=/; domain=${hostname};`;
      if (hostname !== 'localhost') {
        document.cookie = `googtrans=${googleTransValue}; path=/; domain=localhost;`;
      }
    }
    
    // Update HTML lang attribute
    document.documentElement.lang = lang;
    
    // Reload page to apply Google Translate changes
    window.location.reload();
  };

  // Simplified t function - since we use auto-translate, we don't need a massive dictionary
  const t = (key: string): string => {
    return key; // Just return the key, let Google Translate handle the DOM translation
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
