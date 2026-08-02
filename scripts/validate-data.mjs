/**
 * CHECK YAML FILES
 *
 *   node scripts/validate-data.mjs      (or: npm run validate, runs in the build as well)
 *
 * Loaded via Vite, so that exactly the same YAML parsing and the same
 * selectReasons() logic applies as in the app.
 */
import { createServer } from 'vite';

/** Fields that a reason is allowed to have. Everything else is a typo. */
const REASON_KEYS = new Set(['id', 'elements', 'views', 'rating', 'title', 'comment', 'link']);

const server = await createServer({
	logLevel: 'warn',
	appType: 'custom',
	server: { middlewareMode: true },
});

let elements, views, reasons, ui, selectReasons;
try {
	({ elements, views, reasons, ui } = await server.ssrLoadModule('/src/data.ts'));
	({ selectReasons } = await server.ssrLoadModule('/src/reasons.ts'));
} finally {
	await server.close();
}

const errors = [];
const err = (msg) => errors.push(msg);

/** Checks elements.yaml / views.yaml and returns the set of IDs. */
function checkItems(items, file) {
	const ids = new Set();
	if (!Array.isArray(items)) {
		err(`${file}: keine Liste`);
		return ids;
	}
	items.forEach((item, i) => {
		if (!item?.id || typeof item.id !== 'string') return err(`${file}[${i}]: id fehlt`);
		if (ids.has(item.id)) err(`${file}: doppelte id "${item.id}"`);
		ids.add(item.id);
		if (!item.icon) err(`${file} "${item.id}": icon fehlt`);
		if (!item.label?.de) err(`${file} "${item.id}": label.de fehlt`);
	});
	return ids;
}

/** Checks a scope (string, list, "*", "!..." exclusions). */
function checkScope(scope, known, reasonId, field) {
	if (scope === undefined || scope === null || scope === '') {
		return err(`reasons.yaml "${reasonId}": ${field} fehlt`);
	}
	const entries = Array.isArray(scope) ? scope : [scope];
	if (entries.length === 0) return err(`reasons.yaml "${reasonId}": ${field} ist leer`);
	for (const entry of entries) {
		if (typeof entry !== 'string') {
			err(`reasons.yaml "${reasonId}": ${field} enthaelt ${JSON.stringify(entry)} statt einer ID`);
			continue;
		}
		const bare = entry.startsWith('!') ? entry.slice(1) : entry;
		if (bare === '*') continue;
		if (!known.has(bare)) {
			err(`reasons.yaml "${reasonId}": ${field} kennt keine ID "${bare}"`);
		}
	}
}

const elementIds = checkItems(elements, 'elements.yaml');
const viewIds = checkItems(views, 'views.yaml');

const reasonIds = new Set();
for (const [i, r] of (reasons ?? []).entries()) {
	if (!r?.id || typeof r.id !== 'string') {
		err(`reasons.yaml[${i}]: id fehlt`);
		continue;
	}
	if (reasonIds.has(r.id)) err(`reasons.yaml: doppelte id "${r.id}"`);
	reasonIds.add(r.id);

	for (const key of Object.keys(r)) {
		if (!REASON_KEYS.has(key)) err(`reasons.yaml "${r.id}": unbekanntes Feld "${key}"`);
	}
	checkScope(r.elements, elementIds, r.id, 'elements');
	checkScope(r.views, viewIds, r.id, 'views');

	if (!Number.isFinite(r.rating) || r.rating < 1 || r.rating > 10) {
		err(`reasons.yaml "${r.id}": rating muss eine Zahl von 1 bis 10 sein (ist ${JSON.stringify(r.rating)})`);
	}
	if (!r.title?.de) err(`reasons.yaml "${r.id}": title.de fehlt`);
}

// The actual test: does the reason appear in any combination?
// Catches every path where an entry becomes unreachable — including future ones.
const reachable = new Set();
for (const elementId of elementIds) {
	for (const viewId of viewIds) {
		for (const r of selectReasons(reasons, elementId, viewId)) reachable.add(r.id);
	}
}
for (const id of reasonIds) {
	if (!reachable.has(id)) {
		err(`reasons.yaml "${id}": erscheint bei keiner Kombination aus Element und Sicht`);
	}
}

for (const [key, text] of Object.entries(ui ?? {})) {
	if (!text?.de) err(`ui.yaml "${key}": de fehlt`);
}

if (errors.length) {
	console.error(`\n${errors.length} Problem(e) in data/:\n`);
	for (const e of errors) console.error(`  ! ${e}`);
	console.error('');
	process.exit(1);
}

console.log(
	`data/ ok — ${elementIds.size} Elemente, ${viewIds.size} Sichten, ${reasonIds.size} Gruende (alle erreichbar).`,
);
