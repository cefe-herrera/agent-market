import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
import { TRANSLATIONS } from './translations';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    localStorage.removeItem('agentmarket.lang');
    TestBed.configureTestingModule({});
    service = TestBed.inject(I18nService);
  });

  it('should translate a key in English', () => {
    service.setLang('en');
    expect(service.t('nav.myAgents')).toBe('My Agents');
  });

  it('should translate a key in Spanish', () => {
    service.setLang('es');
    expect(service.t('nav.myAgents')).toBe('Mis Agentes');
  });

  it('should interpolate parameters', () => {
    service.setLang('en');
    expect(service.t('marketplace.found', { count: 12 })).toBe('12 agents found');
  });

  it('should expose the matching locale', () => {
    service.setLang('es');
    expect(service.locale()).toBe('es-ES');
    service.setLang('en');
    expect(service.locale()).toBe('en-US');
  });

  it('should fall back to the key when missing', () => {
    expect(service.t('does.not.exist')).toBe('does.not.exist');
  });

  it('should define the same keys in both languages', () => {
    const enKeys = Object.keys(TRANSLATIONS.en).sort();
    const esKeys = Object.keys(TRANSLATIONS.es).sort();
    expect(esKeys).toEqual(enKeys);
  });
});
