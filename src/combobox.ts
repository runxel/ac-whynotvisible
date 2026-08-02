import type { Item, Lang } from './types';
import { t } from './i18n';

let counter = 0;

export interface ComboboxOptions {
  /** Container, in den die Combobox gerendert wird. */
  container: HTMLElement;
  /** Auswählbare Einträge (Elementtypen oder Sichten). */
  items: Item[];
  /** Aktuelle Sprache. */
  lang: Lang;
  /** Platzhaltertext. */
  placeholder: string;
  /** Aria-Label des Aufklapp-Buttons. */
  toggleLabel: string;
  /** id für das <input>, damit ein <label for> verknüpft werden kann. */
  inputId: string;
  /** Unterordner der Icons unterhalb von public/icons/, z. B. 'tools'. Ohne Angabe: direkt in icons/. */
  iconDir?: string;
  /** Wird bei jeder Auswahl mit der gewählten id (oder null) aufgerufen. */
  onSelect: (id: string | null) => void;
}

/** Zugängliche Combobox mit Tipp-Filter und Icon je Eintrag. Dependency-frei. */
export class Combobox {
  private items: Item[];
  private lang: Lang;
  private onSelect: (id: string | null) => void;
  private iconDir: string;

  private root: HTMLDivElement;
  private selIcon: HTMLImageElement;
  private input: HTMLInputElement;
  private toggle: HTMLButtonElement;
  private list: HTMLUListElement;

  private listId: string;
  private filtered: Item[] = [];
  private activeIndex = -1;
  private selectedId: string | null = null;
  private isOpen = false;

  constructor(opts: ComboboxOptions) {
    this.items = opts.items;
    this.lang = opts.lang;
    this.onSelect = opts.onSelect;
    this.iconDir = opts.iconDir ? `${opts.iconDir.replace(/\/+$/, '')}/` : '';
    this.listId = `cb-list-${counter++}`;

    this.root = document.createElement('div');
    this.root.className = 'cb';

    const control = document.createElement('div');
    control.className = 'cb-control';

    this.selIcon = document.createElement('img');
    this.selIcon.className = 'cb-selected-icon';
    this.selIcon.alt = '';
    this.selIcon.hidden = true;

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'cb-input';
    this.input.id = opts.inputId;
    this.input.placeholder = opts.placeholder;
    this.input.autocomplete = 'off';
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-autocomplete', 'list');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-controls', this.listId);

    this.toggle = document.createElement('button');
    this.toggle.type = 'button';
    this.toggle.className = 'cb-toggle';
    this.toggle.setAttribute('aria-label', opts.toggleLabel);
    this.toggle.tabIndex = -1;
    this.toggle.textContent = '▾';

    control.append(this.selIcon, this.input, this.toggle);

    this.list = document.createElement('ul');
    this.list.className = 'cb-list';
    this.list.id = this.listId;
    this.list.setAttribute('role', 'listbox');
    this.list.hidden = true;

    this.root.append(control, this.list);
    opts.container.append(this.root);

    this.attachEvents();
  }

  private attachEvents(): void {
    this.input.addEventListener('focus', () => this.open());
    this.input.addEventListener('input', () => {
      this.activeIndex = 0;
      this.recompute();
      this.paint();
      this.show();
    });
    this.input.addEventListener('keydown', (e) => this.onKeydown(e));

    this.toggle.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Fokus im Input halten
      if (this.isOpen) {
        this.close();
      } else {
        this.input.focus();
        this.open();
      }
    });

    document.addEventListener('click', (e) => {
      if (!this.root.contains(e.target as Node)) this.close();
    });
  }

  private onKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this.isOpen) return this.open();
        this.activeIndex = Math.min(this.activeIndex + 1, this.filtered.length - 1);
        this.updateActive();
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!this.isOpen) return this.open();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.updateActive();
        break;
      case 'Enter':
        if (this.isOpen && this.filtered[this.activeIndex]) {
          e.preventDefault();
          this.choose(this.filtered[this.activeIndex].id);
        }
        break;
      case 'Escape':
        if (this.isOpen) {
          e.preventDefault();
          this.close();
        }
        break;
    }
  }

  /** Filtert this.filtered anhand des aktuellen Eingabetexts. */
  private recompute(): void {
    const q = this.input.value.trim().toLowerCase();
    this.filtered = this.items.filter(
      (it) => !q || t(it.label, this.lang).toLowerCase().includes(q),
    );
  }

  /** Baut die Options-Liste neu auf. */
  private paint(): void {
    this.list.replaceChildren();
    if (this.filtered.length === 0) {
      const li = document.createElement('li');
      li.className = 'cb-empty';
      li.textContent = '—';
      this.list.append(li);
      this.input.removeAttribute('aria-activedescendant');
      return;
    }
    this.filtered.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'cb-option';
      li.id = `${this.listId}-opt-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(it.id === this.selectedId));

      const img = document.createElement('img');
      img.className = 'opt-icon';
      img.src = this.iconUrl(it.icon);
      img.alt = '';

      const span = document.createElement('span');
      span.textContent = t(it.label, this.lang);

      li.append(img, span);
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.choose(it.id);
      });
      this.list.append(li);
    });
    this.updateActive();
  }

  /** Markiert den aktiven Eintrag (Tastaturnavigation). */
  private updateActive(): void {
    const options = Array.from(this.list.querySelectorAll<HTMLLIElement>('.cb-option'));
    options.forEach((li, i) => li.classList.toggle('active', i === this.activeIndex));
    const active = options[this.activeIndex];
    if (active) {
      this.input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    } else {
      this.input.removeAttribute('aria-activedescendant');
    }
  }

  private show(): void {
    this.list.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
    this.isOpen = true;
  }

  /** Öffnet die Liste und zeigt alle Einträge. */
  private open(): void {
    if (this.isOpen) return;
    this.activeIndex = this.selectedId
      ? this.items.findIndex((x) => x.id === this.selectedId)
      : -1;
    this.input.value = '';
    this.recompute();
    this.activeIndex = this.selectedId
      ? this.filtered.findIndex((x) => x.id === this.selectedId)
      : -1;
    this.paint();
    this.show();
    this.input.select();
  }

  private close(): void {
    if (!this.isOpen) return;
    this.list.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
    this.isOpen = false;
    this.restoreInputText();
  }

  private choose(id: string): void {
    this.selectedId = id;
    this.close();
    this.restoreInputText();
    this.onSelect(id);
  }

  /** Setzt Eingabetext und Icon passend zur aktuellen Auswahl. */
  private restoreInputText(): void {
    const it = this.items.find((x) => x.id === this.selectedId);
    if (it) {
      this.input.value = t(it.label, this.lang);
      this.selIcon.src = this.iconUrl(it.icon);
      this.selIcon.hidden = false;
    } else {
      this.input.value = '';
      this.selIcon.hidden = true;
    }
  }

  /** Aktualisiert Sprache und ggf. den angezeigten Text. */
  setLang(lang: Lang, placeholder: string, toggleLabel: string): void {
    this.lang = lang;
    this.input.placeholder = placeholder;
    this.toggle.setAttribute('aria-label', toggleLabel);
    if (!this.isOpen) this.restoreInputText();
    else {
      this.recompute();
      this.paint();
    }
  }

  getValue(): string | null {
    return this.selectedId;
  }

  private iconUrl(file: string): string {
    return `${import.meta.env.BASE_URL}icons/${this.iconDir}${file}`;
  }
}
