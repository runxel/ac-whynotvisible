import './styles.css';
import { elements, reasons, ui, views } from './data';
import { Combobox } from './combobox';
import { selectReasons } from './reasons';
import { initLang, persistLang, t } from './i18n';
import type { Lang } from './types';

let lang: Lang = initLang();
let elementId: string | null = null;
let viewId: string | null = null;

const $ = <T extends Element>(sel: string): T => document.querySelector<T>(sel)!;

const titleEl = $<HTMLHeadingElement>('#app-title');
const subtitleEl = $<HTMLParagraphElement>('#app-subtitle');
const whatLabelEl = $<HTMLLabelElement>('#what-label');
const viewLabelEl = $<HTMLLabelElement>('#view-label');
const resultsHeadingEl = $<HTMLHeadingElement>('#results-heading');
const resultsBodyEl = $<HTMLDivElement>('#results-body');
const langSelect = $<HTMLSelectElement>('#lang-select');
const madebyEl = $<HTMLParagraphElement>('#footer-madeby');
const thanksEl = $<HTMLParagraphElement>('#footer-thanks');

// ---- abgehakte Gründe pro (Element × Sicht) in localStorage ----------------
function struckKey(): string {
  return `struck:${elementId}:${viewId}`;
}

function loadStruck(): Set<string> {
  if (!elementId || !viewId) return new Set();
  try {
    const raw = localStorage.getItem(struckKey());
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveStruck(set: Set<string>): void {
  if (!elementId || !viewId) return;
  localStorage.setItem(struckKey(), JSON.stringify([...set]));
}

// ---- Rendering -------------------------------------------------------------
function renderStaticText(): void {
  document.documentElement.lang = lang;
  document.title = t(ui.title, lang);
  titleEl.textContent = t(ui.title, lang);
  subtitleEl.textContent = t(ui.subtitle, lang);
  whatLabelEl.textContent = t(ui.what_label, lang);
  viewLabelEl.textContent = t(ui.view_label, lang);
  resultsHeadingEl.textContent = t(ui.results_heading, lang);
  thanksEl.textContent = t(ui.thanks, lang);
  madebyEl.textContent = t(ui.madeby, lang);
  langSelect.value = lang;
}

function renderResults(): void {
  resultsBodyEl.replaceChildren();

  if (!elementId || !viewId) {
    resultsBodyEl.append(hint(t(ui.empty_hint, lang)));
    return;
  }

  const list = selectReasons(reasons, elementId, viewId);
  if (list.length === 0) {
    resultsBodyEl.append(hint(t(ui.no_results, lang)));
    return;
  }

  const struck = loadStruck();
  const ul = document.createElement('ul');
  ul.className = 'reason-list';

  for (const r of list) {
    const li = document.createElement('li');
    li.className = 'reason';
    if (struck.has(r.id)) li.classList.add('struck');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'reason-check';
    checkbox.checked = struck.has(r.id);
    checkbox.id = `chk-${r.id}`;

    const body = document.createElement('div');
    body.className = 'reason-body';

    const title = document.createElement('label');
    title.className = 'reason-title';
    title.htmlFor = checkbox.id;
    title.textContent = t(r.title, lang);

    const comment = document.createElement('p');
    comment.className = 'reason-comment';
    comment.textContent = t(r.comment, lang);

    checkbox.addEventListener('change', () => {
      const current = loadStruck();
      if (checkbox.checked) current.add(r.id);
      else current.delete(r.id);
      saveStruck(current);
      li.classList.toggle('struck', checkbox.checked);
    });

    body.append(title, comment);
    li.append(checkbox, body);
    ul.append(li);
  }

  resultsBodyEl.append(ul);
}

function hint(text: string): HTMLParagraphElement {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

// ---- Aufbau ----------------------------------------------------------------
renderStaticText();

const comboWhat = new Combobox({
  container: $('#combo-what'),
  items: elements,
  lang,
  placeholder: t(ui.what_placeholder, lang),
  toggleLabel: t(ui.toggle_aria, lang),
  inputId: 'combo-what-input',
  iconDir: 'tools',
  onSelect: (id) => {
    elementId = id;
    renderResults();
  },
});

const comboView = new Combobox({
  container: $('#combo-view'),
  items: views,
  lang,
  placeholder: t(ui.view_placeholder, lang),
  toggleLabel: t(ui.toggle_aria, lang),
  inputId: 'combo-view-input',
  onSelect: (id) => {
    viewId = id;
    renderResults();
  },
});

langSelect.addEventListener('change', () => {
  lang = langSelect.value as Lang;
  persistLang(lang);
  renderStaticText();
  comboWhat.setLang(lang, t(ui.what_placeholder, lang), t(ui.toggle_aria, lang));
  comboView.setLang(lang, t(ui.view_placeholder, lang), t(ui.toggle_aria, lang));
  renderResults();
});

renderResults();
