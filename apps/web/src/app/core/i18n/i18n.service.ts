import { Injectable, computed, signal } from '@angular/core';
import { Lang, TRANSLATIONS } from './translations';

const STORAGE_KEY = 'agentmarket.lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly current = signal<Lang>(this.resolveInitialLang());

  readonly lang = this.current.asReadonly();
  readonly locale = computed(() => (this.current() === 'es' ? 'es-ES' : 'en-US'));

  constructor() {
    document.documentElement.lang = this.current();
  }

  /**
   * Reads the language signal, so any template calling it re-renders on change.
   * Placeholders use the {name} syntax.
   */
  readonly t = (key: string, params?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[this.current()];
    let value = dict[key] ?? TRANSLATIONS.en[key] ?? key;

    if (params) {
      for (const [name, replacement] of Object.entries(params)) {
        value = value.replace(`{${name}}`, String(replacement));
      }
    }

    return value;
  };

  setLang(lang: Lang): void {
    this.current.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage unavailable (private mode); language stays in memory only.
    }
    document.documentElement.lang = lang;
  }

  private resolveInitialLang(): Lang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'es') return stored;
    } catch {
      // ignore
    }
    return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
  }
}
