"use client";

import { LANGUAGES } from "@/app/lib/i18n";
import { useI18n } from "@/app/context/I18nProvider";

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div
      className="inline-flex overflow-hidden border border-surface-300"
      role="group"
      aria-label="Language"
    >
      {LANGUAGES.map((option) => (
        <button
          key={option.code}
          type="button"
          aria-pressed={lang === option.code}
          onClick={() => setLang(option.code)}
          className={`px-2.5 py-1 font-mono-data text-xs font-medium transition ${
            lang === option.code
              ? "bg-brand-500 text-black"
              : "bg-surface-100 text-surface-600"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
