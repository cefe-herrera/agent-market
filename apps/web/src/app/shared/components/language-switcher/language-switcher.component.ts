import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LANGUAGES, Lang } from '../../../core/i18n/translations';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  template: `
    <div
      class="inline-flex overflow-hidden rounded border border-surface-300"
      role="group"
      [attr.aria-label]="i18n.t('common.language')"
    >
      @for (option of languages; track option.code) {
        <button
          type="button"
          (click)="select(option.code)"
          [attr.aria-pressed]="i18n.lang() === option.code"
          class="px-2.5 py-1 font-mono-data text-xs font-medium transition"
          [class.bg-brand-500]="i18n.lang() === option.code"
          [class.text-black]="i18n.lang() === option.code"
          [class.bg-surface-100]="i18n.lang() !== option.code"
          [class.text-surface-600]="i18n.lang() !== option.code"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class LanguageSwitcherComponent {
  readonly i18n = inject(I18nService);
  readonly languages = LANGUAGES;

  select(lang: Lang): void {
    this.i18n.setLang(lang);
  }
}
