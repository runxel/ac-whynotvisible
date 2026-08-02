import type { Reason, Scope } from './types';

/**
 * Trifft der Geltungsbereich auf die gegebene ID zu?
 * - "*"                  -> alle
 * - "a" / [a, b]         -> nur a bzw. nur a und b
 * - ["*", "!a"] / ["!a"] -> alle außer a (Ausschluss gewinnt immer)
 *
 * Ein einzelner String wird wie eine einelementige Liste behandelt, damit
 * `elements: object` in der YAML dasselbe bedeutet wie `elements: [object]`.
 */
function inScope(scope: Scope, id: string): boolean {
  const entries = Array.isArray(scope) ? scope : [scope];
  if (entries.includes('!' + id)) return false;
  const positives = entries.filter((s) => s !== '*' && !s.startsWith('!'));
  return positives.length === 0 || positives.includes(id);
}

/**
 * Wertet die "Matrix" aus: liefert alle Gründe, die für die gewählte
 * Element- UND Sicht-ID gelten, sortiert nach Wertung (höchste zuerst).
 */
export function selectReasons(reasons: Reason[], elementId: string, viewId: string): Reason[] {
  return reasons
    .filter((r) => inScope(r.elements, elementId) && inScope(r.views, viewId))
    .sort((a, b) => b.rating - a.rating);
}
