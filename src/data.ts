import elementsRaw from '../data/elements.yaml';
import viewsRaw from '../data/views.yaml';
import reasonsRaw from '../data/reasons.yaml';
import uiRaw from '../data/ui.yaml';
import type { I18nText, Item, Reason } from './types';

// Die YAML-Dateien werden zur Build-Zeit zu JS-Objekten kompiliert (vite-plugin-yaml),
// daher gibt es keine Laufzeit-Abhängigkeit und keinen fetch.
export const elements = elementsRaw as Item[];
export const views = viewsRaw as Item[];
export const reasons = reasonsRaw as Reason[];
export const ui = uiRaw as Record<string, I18nText>;
