import { defineConfig } from 'vite';
import yaml from '@modyfi/vite-plugin-yaml';

// `base` muss bei GitHub *Project Pages* auf '/<repo-name>/' stehen, damit Assets
// (JS, CSS, Icons) korrekt geladen werden. Bei User-/Org-Pages oder eigener Domain '/'.
// Der Workflow kann den Wert via Umgebungsvariable BASE_PATH überschreiben.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/ac-ynovis/',
  plugins: [yaml()],
});
