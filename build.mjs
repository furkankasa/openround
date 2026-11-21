// Builds the single-file app: dist/index.html (web, GitHub Pages) and desktop/app/index.html (Electron).
import fs from 'node:fs';
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const rd = p => fs.readFileSync(path.join(root, p));
const esc = s => s.toString().replace(/<\/script/g, '<\\/script');
let html = rd('src/index.template.html').toString();
const fonts = [
  ['archivo-latin-standard-normal.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
  ['archivo-latin-ext-standard-normal.woff2', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF']
].map(([f, r]) => `@font-face{font-family:'Archivo';font-style:normal;font-display:swap;font-weight:100 900;font-stretch:62% 125%;src:url(data:font/woff2;base64,${rd('fonts/' + f).toString('base64')}) format('woff2-variations');unicode-range:${r}}`).join('');
html = html.replace('/*FONTS*/', fonts)
  .replace('<script>/*ENGINE*/</script>', '<script>/*CLIPPER*/</script>\n<script>/*ENGINE*/</script>');
for (const [k, f] of [['CLIPPER', 'lib/clipper.min.js'], ['ENGINE', 'src/engine.js'], ['DEFAULTS', 'src/defaults.js'], ['I18N', 'src/i18n.js'], ['APP', 'src/app.js']])
  html = html.split(`/*${k}*/`).join(esc(rd(f)));
for (const out of ['dist/index.html', 'desktop/app/index.html']) { fs.mkdirSync(path.join(root, path.dirname(out)), { recursive: true }); fs.writeFileSync(path.join(root, out), html); }
console.log('built', (html.length / 1024).toFixed(0) + ' KB');
