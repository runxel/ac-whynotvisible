/**
 * Makes the icon SVGs under public/icons/ dark-mode compatible.
 *
 *   node scripts/theme-icons.mjs        (or: npm run theme-icons)
 *
 * Replaces the hard color values in the paths with CSS variables and appends
 * a <style> block directly under the <svg> tag in each file, defining these
 * variables for light and dark mode. CSS *inside* an SVG works
 * also when the file is included via <img>.
 *
 * The script is idempotent: files that already contain "--ink" remain
 * unchanged. Line endings and indentation of the file are preserved.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const ROOT = fileURLToPath(new URL('../public/icons', import.meta.url));

/** Color palette -> [light, dark]. --paper corresponds to --surface in styles.css. */
const VARS = {
	'--ink': ['#263238', '#c8d1d9'],
	'--ink-soft': ['#92989b', '#7f8894'],
	'--paper': ['#fafafa', '#1e2127'],
	'--paper-shade': ['#f1f1f1', '#262b32'],
};

/** The placeholder view icons use a lighter stroke than the tool icons. */
const VIEW_INK = ['#5b6470', '#aeb7c2'];

const REPLACEMENTS = [
	[/rgb\(38,\s*50,\s*56\)/g, 'var(--ink)'],
	[/(?<=(?:fill|stroke):\s*)#263238\b/g, 'var(--ink)'],
	[/rgb\(146,\s*152,\s*155\)/g, 'var(--ink-soft)'],
	[/rgb\(250,\s*250,\s*250\)/g, 'var(--paper)'],
	[/rgb\(241,\s*241,\s*241\)/g, 'var(--paper-shade)'],
	[/(?<=(?:fill|stroke):\s*)white\b/g, 'var(--paper)'],
	[/(?<=(?:fill|stroke):\s*)#fff\b/g, 'var(--paper)'],
];

/** Color values that remain after replacement — usually a new tone from the export. */
const LEFTOVER = /(?:fill|stroke)\s*[:=]\s*"?(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|(?!none|var|currentColor|inherit)[a-z]+)/g;

function styleBlock(used, indent, eol, viewIcon) {
	const light = [];
	const dark = [];
	for (const name of used) {
		const [l, d] = name === '--ink' && viewIcon ? VIEW_INK : VARS[name];
		light.push(`${name}: ${l};`);
		dark.push(`${name}: ${d};`);
	}
	// Coerce the color
	if (viewIcon) light.push('stroke: var(--ink);');

	return [
		`${indent}<style>`,
		`${indent}\t:root { ${light.join(' ')} }`,
		`${indent}\t@media (prefers-color-scheme: dark) {`,
		`${indent}\t\t:root { ${dark.join(' ')} }`,
		`${indent}\t}`,
		`${indent}</style>`,
	].join(eol);
}

function processFile(path) {
	const original = readFileSync(path, 'utf8');
	if (original.includes('--ink')) return { status: 'unchanged (already has variables)' };

	const eol = original.includes('\r\n') ? '\r\n' : '\n';
	const viewIcon = original.includes(VIEW_INK[0]);

	let out = original;
	const used = new Set();
	for (const [re, repl] of REPLACEMENTS) {
		if (re.test(out)) used.add(repl.slice(4, -1));
		out = out.replace(re, repl);
	}
	if (viewIcon) used.add('--ink');
	if (used.size === 0) return { status: 'skipped (no known colors)' };

	const indent = (out.split(/\r?\n/)[1] ?? '').match(/^[\t ]*/)[0] || '  ';
	const openTag = out.match(/<svg[^>]*>/);
	if (!openTag) return { status: 'ERROR: no <svg> tag found' };

	const order = Object.keys(VARS).filter((v) => used.has(v));
	const at = openTag.index + openTag[0].length;
	out = out.slice(0, at) + eol + styleBlock(order, indent, eol, viewIcon) + out.slice(at);

	writeFileSync(path, out);
	return { status: order.join(', '), changed: true, leftover: [...new Set(out.match(LEFTOVER) ?? [])] };
}

function* svgFiles(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) yield* svgFiles(join(dir, entry.name));
		else if (entry.name.endsWith('.svg')) yield join(dir, entry.name);
	}
}

let changed = 0;
const warnings = [];
for (const file of svgFiles(ROOT)) {
	const name = relative(ROOT, file);
	const { status, changed: didChange, leftover } = processFile(file);
	if (didChange) changed++;
	console.log(`  ${name.padEnd(24)} ${status}`);
	// A literal that could not be assigned to any variable would remain in the Dark Mode.
	for (const hit of leftover ?? []) warnings.push(`${name}: unknown color value ${hit}`);
}

console.log(`\n${changed} file(s) rewritten.`);
if (warnings.length) {
	console.log('\nPlease check (color value not assigned to any variable):');
	for (const w of warnings) console.log(`  ! ${w}`);
	process.exitCode = 1;
}
