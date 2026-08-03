# Why don't I see _that_ element in _this_ view in Archicad?

Easy question – and now, also some easy answers on this interactive diagnostic webpage.  
Just select the element (e.g. wall) and the viewpoint (e.g. floor plan) to see the possible reasons.


## Features
- dark / light mode
- checkboxes to control what you already tried
- element + view combo can be linked: `…/?element=wall&view=section` in the URL
- multilang (also linkable: `&lang=en`)
- runs as Github page
- tech: vite + typescript


## Development

```bash
npm install
npm run dev      # Dev-Server with hot-reload
npm run build    # local build
```

### Contents (`data/`)

All contents are in the YAML files inside `data/`. On building these will be baked in.  
After every commit & push a GitHub action runs automatically.

### Translations

All texts are multilang with two-char labels (e.g. `de`/`en`/`fr`). German is the fallback currently.  

```bash
npm run i18n-status          # show all languages
npm run i18n-status -- fr    # everything thats missing in French
```

Adding a lanugage:

1. Add the content in the YAML files (e.g. `it: …`).
2. Add code in `src/types.ts` (`Lang`) and `src/i18n.ts` (`LANGS`).
3. Add an option in `index.html` > `#lang-select`.


### Icons

For auto-colormode in an icon use the following command to insert a style block:

```bash
npm run theme-icons
```
