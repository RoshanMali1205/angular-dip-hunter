/**
 * Language Service - Multi-language support
 * Translations are embedded directly for synchronous access
 */

import { Injectable, signal, computed } from '@angular/core';
import translationsData from '../../../assets/i18n/translations.json';

export type Language = 'en' | 'hi' | 'mr';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' }
];

// Allow nested translation values (for tour.welcome.title etc.)
type TranslationValue = string | Record<string, string | Record<string, string>>;
type TranslationsMap = Record<Language, Record<string, Record<string, TranslationValue>>>;

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  // All available languages
  readonly languages = LANGUAGES;
  
  // Current language signal
  readonly language = signal<Language>(this.loadLanguage());
  
  // Current language object (computed)
  readonly currentLanguage = computed(() => 
    this.languages.find(l => l.code === this.language())
  );
  
  // Translations storage - loaded synchronously from imported JSON
  private translations: TranslationsMap = translationsData as unknown as TranslationsMap;
  
  /**
   * Load persisted language from localStorage
   */
  private loadLanguage(): Language {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('dh_language');
      if (saved && ['en', 'hi', 'mr'].includes(saved)) {
        return saved as Language;
      }
    }
    return 'en';
  }
  
  /**
   * Set the current language
   */
  setLanguage(lang: Language): void {
    this.language.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dh_language', lang);
    }
  }
  
  /**
   * Translate a key using dot notation (e.g., 'nav.dashboard', 'tour.welcome.title')
   * Supports 2 or 3 level deep keys
   * @param key - The translation key in dot notation (e.g., 'nav.dashboard')
   * @param params - Optional parameters for interpolation
   */
  t(key: string, params?: Record<string, string | number>): string {
    if (!this.translations) {
      return key; // Return key if translations not available
    }
    
    const lang = this.language();
    const parts = key.split('.');
    
    if (parts.length < 2 || parts.length > 3) {
      return key; // Invalid key format
    }
    
    const langTranslations = this.translations[lang];
    const enTranslations = this.translations['en'];
    
    let value: TranslationValue | undefined;
    
    if (parts.length === 2) {
      // Standard 2-level key: section.key (e.g., 'nav.dashboard')
      const [section, subKey] = parts;
      value = langTranslations?.[section]?.[subKey];
      if (!value || typeof value !== 'string') {
        value = enTranslations?.[section]?.[subKey];
      }
    } else if (parts.length === 3) {
      // 3-level key: section.subsection.key (e.g., 'tour.welcome.title')
      const [section, subSection, subKey] = parts;
      const sectionData = langTranslations?.[section]?.[subSection];
      if (sectionData && typeof sectionData === 'object') {
        value = (sectionData as Record<string, string>)[subKey];
      }
      if (!value || typeof value !== 'string') {
        const enSectionData = enTranslations?.[section]?.[subSection];
        if (enSectionData && typeof enSectionData === 'object') {
          value = (enSectionData as Record<string, string>)[subKey];
        }
      }
    }
    
    if (!value || typeof value !== 'string') {
      return key;
    }
    
    return this.interpolate(value, params);
  }
  
  /**
   * Interpolate parameters into translation string
   * Supports {paramName} syntax
   */
  private interpolate(text: string, params?: Record<string, string | number>): string {
    if (!params) return text;
    
    let result = text;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    return result;
  }
  
  /**
   * Get current language name
   */
  getCurrentLanguageName(): string {
    const current = this.languages.find(l => l.code === this.language());
    return current?.nativeName || 'English';
  }
}
