"use client";

import { LANGUAGES } from "@/app/lib/i18n";
import { useI18n } from "@/app/context/I18nProvider";

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const other = LANGUAGES.find((option) => option.code !== lang) ?? LANGUAGES[0];

  return (
    <button
      type="button"
      aria-label={`Language: ${lang.toUpperCase()}`}
      onClick={() => setLang(other.code)}
      className="px-1.5 py-1 font-mono-data text-[10px] uppercase tracking-wider text-surface-500 transition hover:text-brand-500"
    >
      {lang.toUpperCase()}
    </button>
  );
}
