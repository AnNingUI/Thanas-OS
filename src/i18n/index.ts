import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import zhCommon from './locales/zh/common.json';
import jaCommon from './locales/ja/common.json';
import enOs from './locales/en/os.json';
import zhOs from './locales/zh/os.json';
import jaOs from './locales/ja/os.json';
import enSettings from './locales/en/settings.json';
import zhSettings from './locales/zh/settings.json';
import jaSettings from './locales/ja/settings.json';
import enAppsCore from './locales/en/appsCore.json';
import zhAppsCore from './locales/zh/appsCore.json';
import jaAppsCore from './locales/ja/appsCore.json';
import enAppsNew from './locales/en/appsNew.json';
import zhAppsNew from './locales/zh/appsNew.json';
import jaAppsNew from './locales/ja/appsNew.json';
import enAppsMedia from './locales/en/appsMedia.json';
import zhAppsMedia from './locales/zh/appsMedia.json';
import jaAppsMedia from './locales/ja/appsMedia.json';

export type AppLanguage = 'en' | 'zh' | 'ja';

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['en', 'zh', 'ja'];
export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  zh: '简体中文',
  ja: '日本語',
};

export const LANGUAGE_STORAGE_KEY = 'thanas-language';

/** 系统语言 → 支持的三种语言；其余回退英文。 */
export function detectLanguage(): AppLanguage {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === 'en' || saved === 'zh' || saved === 'ja') return saved;
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of candidates) {
    const lang = (raw || '').toLowerCase();
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('en')) return 'en';
  }
  return 'en';
}

export const resources = {
  en: { common: enCommon, os: enOs, settings: enSettings, appsCore: enAppsCore, appsMedia: enAppsMedia, appsNew: enAppsNew },
  zh: { common: zhCommon, os: zhOs, settings: zhSettings, appsCore: zhAppsCore, appsMedia: zhAppsMedia, appsNew: zhAppsNew },
  ja: { common: jaCommon, os: jaOs, settings: jaSettings, appsCore: jaAppsCore, appsMedia: jaAppsMedia, appsNew: jaAppsNew },
} as const;

const language = detectLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: language,
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  ns: ['common', 'os', 'settings', 'appsCore', 'appsMedia', 'appsNew'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

document.documentElement.lang = language;

/** 切换语言：i18next + localStorage + <html lang>。 */
export function setLanguage(lng: AppLanguage): void {
  i18n.changeLanguage(lng);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  document.documentElement.lang = lng;
}

export default i18n;
