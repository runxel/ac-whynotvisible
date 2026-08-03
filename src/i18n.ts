import type { I18nText, Lang } from './types';

export const LANGS: Lang[] = ['de', 'en', 'fr'];
export const DEFAULT_LANG: Lang = 'de';

const STORAGE_KEY = 'lang';

/**
 * Liefert den Text in der gewünschten Sprache, mit Fallback auf de.
 * Ein leerer Wert (`fr: ""`, angelegt aber noch nicht übersetzt) zählt als
 * fehlend – sonst stünde in der Oberfläche eine leere Zeile statt des Fallbacks.
 */
export function t(text: I18nText | undefined, lang: Lang): string {
  if (!text) return '';
  const value = text[lang];
  if (value && value.trim()) return value;
  return text.de ?? '';
}

function isLang(value: string | null | undefined): value is Lang {
  return !!value && (LANGS as string[]).includes(value);
}

/** Sucht in den Browser-Spracheinstellungen die erste unterstützte Sprache. */
function detectBrowserLang(): Lang | null {
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const pref of prefs) {
    const primary = pref.toLowerCase().split('-')[0]; // "de-DE" -> "de"
    if (isLang(primary)) return primary;
  }
  return null;
}

/**
 * Ermittelt die Startsprache. Vorrang: ?lang= (Link) > zuvor gewählte Sprache
 * (localStorage) > Browsersprache > Default. So bleibt eine bewusste Wahl erhalten.
 */
export function initLang(): Lang {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (isLang(fromUrl)) return fromUrl;

  const fromStore = localStorage.getItem(STORAGE_KEY);
  if (isLang(fromStore)) return fromStore;

  return detectBrowserLang() ?? DEFAULT_LANG;
}

/** Merkt sich die gewählte Sprache. */
export function persistLang(lang: Lang): void {
  localStorage.setItem(STORAGE_KEY, lang);
}
