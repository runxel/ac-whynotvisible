/**
 * TRANSLATION STATUS
 *
 *   node scripts/i18n-status.mjs          (or: npm run i18n-status)
 *   node scripts/i18n-status.mjs fr       lists every missing text of one language
 *
 * Loaded via Vite, so it sees exactly the same data as the app — including the
 * rule from t(): an empty value ("") counts as untranslated and falls back to de.
 *
 * Never fails the build: a missing translation is a todo, not an error.
 */
import { createServer } from 'vite';

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));

const server = await createServer({
	logLevel: 'warn',
	appType: 'custom',
	server: { middlewareMode: true },
});

let elements, views, reasons, ui, LANGS, DEFAULT_LANG;
try {
	({ elements, views, reasons, ui } = await server.ssrLoadModule('/src/data.ts'));
	({ LANGS, DEFAULT_LANG } = await server.ssrLoadModule('/src/i18n.ts'));
} finally {
	await server.close();
}

/** Alle übersetzbaren Texte aus data/, in der Reihenfolge der Dateien. */
const entries = [];
const collect = (file, path, text) => entries.push({ file, path, text });

for (const [key, text] of Object.entries(ui ?? {})) collect('ui.yaml', key, text);
for (const it of elements ?? []) collect('elements.yaml', `${it.id}.label`, it.label);
for (const it of views ?? []) collect('views.yaml', `${it.id}.label`, it.label);
for (const r of reasons ?? []) {
	collect('reasons.yaml', `${r.id}.title`, r.title);
	collect('reasons.yaml', `${r.id}.comment`, r.comment);
}

/** Wie t(): nur ein nicht-leerer String zählt als übersetzt. */
const has = (text, lang) => typeof text?.[lang] === 'string' && text[lang].trim() !== '';

const unknown = args.filter((lang) => !LANGS.includes(lang));
if (unknown.length) {
	console.error(`Unbekannte Sprache: ${unknown.join(', ')} — bekannt sind: ${LANGS.join(', ')}`);
	process.exit(1);
}

const langs = args.length ? args : LANGS;
const missing = new Map(langs.map((lang) => [lang, entries.filter((e) => !has(e.text, lang))]));

console.log(`\ni18n-Status — ${entries.length} Texte in data/\n`);
for (const lang of langs) {
	const gaps = missing.get(lang).length;
	const done = entries.length - gaps;
	const percent = entries.length ? Math.round((done / entries.length) * 100) : 100;
	const note = lang === DEFAULT_LANG ? '  (Fallback-Sprache)' : gaps ? `  ${gaps} fehlen` : '';
	console.log(`  ${lang.padEnd(4)} ${String(done).padStart(4)}/${entries.length}  ${String(percent).padStart(3)}%${note}`);
}

// Die Liste ist die Arbeitsliste für die Übersetzung — nur auf Nachfrage,
// sonst wäre die Ausgabe bei einer frischen Sprache hunderte Zeilen lang.
if (args.length === 1) {
	const gaps = missing.get(args[0]);
	if (gaps.length) {
		console.log(`\nfehlt in "${args[0]}":`);
		const width = Math.max(...gaps.map((e) => e.file.length));
		for (const e of gaps) {
			console.log(`  ${e.file.padEnd(width)}  ${e.path}`);
			console.log(`  ${' '.repeat(width)}  de: ${e.text?.[DEFAULT_LANG] ?? ''}`);
		}
	}
} else if (langs.some((lang) => missing.get(lang).length)) {
	console.log(`\nEinzelne Sprache im Detail: npm run i18n-status -- fr`);
}

console.log('');
