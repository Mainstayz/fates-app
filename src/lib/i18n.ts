import { get } from 'svelte/store';
import { writable } from 'svelte/store';
import en from '../i18n/en.json';
import zh from '../i18n/zh.json';

type Locale = 'en' | 'zh';
type Translations = typeof en;

const translations: Record<Locale, Translations> = {
  en,
  zh
};

const locale = writable<Locale>('zh');

function t(key: string): string {
  const currentLocale = get(locale);
  const translation = translations[currentLocale];

  // 使用 reduce 来安全地访问嵌套属性
  const result = key.split('.').reduce((obj: any, k) => {
    if (obj && typeof obj === 'object' && k in obj) {
      return obj[k];
    }
    return undefined;
  }, translation);

  return typeof result === 'string' ? result : key;
}

export { locale, t };
