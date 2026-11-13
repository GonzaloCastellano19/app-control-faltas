// Genera asistencia-dam.html: la aplicación completa en un solo archivo.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const out = '.html-build';
execSync(`npx vite build --outDir ${out} --emptyOutDir --assetsInlineLimit 4000000`, { stdio: 'inherit' });

const assets = readdirSync(`${out}/assets`);
const read = (ext) => readFileSync(`${out}/assets/${assets.find((f) => f.endsWith(ext))}`, 'utf8');
const css = read('.css');
const js = read('.js').replaceAll('</script', '<\\/script');
const favicon = readFileSync(`${out}/favicon.svg`).toString('base64');

let html = readFileSync(`${out}/index.html`, 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]*>/, () => `<style>${css}</style>`);
html = html.replace(/\s*<script type="module"[^>]*><\/script>/, '');
html = html.replace('href="./favicon.svg"', () => `href="data:image/svg+xml;base64,${favicon}"`);
const end = html.lastIndexOf('</body>');
html = `${html.slice(0, end)}<script type="module">${js}</script>\n${html.slice(end)}`;

writeFileSync('asistencia-dam.html', html);
rmSync(out, { recursive: true });
console.log('Creado asistencia-dam.html');
