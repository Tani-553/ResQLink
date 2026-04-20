import React, { createContext, useContext, useState } from "react";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState("en"); // ✅ IMPORTANT

  const translations = {
    en: { login: "Login", email: "Email", password: "Password" },
    ta: { login: "உள்நுழை", email: "மின்னஞ்சல்", password: "கடவுச்சொல்" },
    hi: { login: "लॉगिन", email: "ईमेल", password: "पासवर्ड" }
  };

  const t = (key) => translations[lang][key] || key;

  return (
    <LanguageContext.Provider value={{ t, lang, setLang }}> {/* ✅ ADD setLang */}
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);