export type Lang = 'de' | 'en' | 'fr';

/** Inline übersetzbarer Text. `de` ist Pflicht und dient als Fallback. */
export type I18nText = { de: string } & Partial<Record<Lang, string>>;

/** Eintrag eines Dropdowns (Elementtyp oder Sicht). */
export interface Item {
  id: string;
  icon: string;
  label: I18nText;
}

/**
 * Geltungsbereich: "*" für „alle", eine einzelne ID, oder eine Liste von IDs.
 * Einträge mit "!"-Präfix schließen die ID aus. Enthält der Bereich
 * nur Ausschlüsse (und optional "*"), gilt er als „alle außer …".
 * In YAML müssen "!…"-Einträge in Anführungszeichen stehen.
 */
export type Scope = string | string[];

/** Eine mögliche Fehlerquelle aus reasons.yaml. */
export interface Reason {
  id: string;
  elements: Scope;
  views: Scope;
  rating: number;
  title: I18nText;
  comment: I18nText;
}
