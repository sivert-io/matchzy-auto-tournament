#!/usr/bin/env node
/** Standardize PageShell maxWidth to layout tokens across pages. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'src', 'pages');

const WIDTH_MAP = [
  [1700, 'pageWidth.full'],
  [1680, 'pageWidth.full'],
  [1440, 'pageWidth.wide'],
  [1400, 'pageWidth.wide'],
  [1200, 'pageWidth.default'],
  [1100, 'pageWidth.default'],
  [960, 'pageWidth.content'],
  [720, 'pageWidth.narrow'],
  [640, 'pageWidth.narrow'],
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function ensurePageWidthImport(src, relDepth) {
  if (!src.includes('pageWidth')) return src;
  if (/import\s*{[^}]*pageWidth[^}]*}\s*from\s*['"][^'"]*shared\/ui['"]/.test(src)) {
    return src;
  }
  const uiImport = src.match(/import\s*{([^}]+)}\s*from\s*['"]([^'"]*shared\/ui)['"];/);
  if (uiImport) {
    const names = uiImport[1].split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.includes('pageWidth')) {
      names.push('pageWidth');
      return src.replace(uiImport[0], `import { ${names.join(', ')} } from '${uiImport[2]}';`);
    }
    return src;
  }
  const prefix = '../'.repeat(relDepth) + 'shared/ui';
  const firstLine = src.indexOf('\n');
  return src.slice(0, firstLine + 1) + `import { pageWidth } from '${prefix}';\n` + src.slice(firstLine + 1);
}

function convertFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  if (!src.includes('PageShell')) return false;
  const original = src;
  const relDepth = filePath.replace(root, '').split(path.sep).filter(Boolean).length - 1;

  for (const [num, token] of WIDTH_MAP) {
    src = src.replace(new RegExp(`maxWidth=\\{${num}\\}`, 'g'), `maxWidth={${token}}`);
  }

  src = src.replace(
    /sx=\{\{\s*width:\s*['"]100%['"],\s*height:\s*['"]100%['"]\s*\}\}/g,
    ''
  );
  src = src.replace(/,\s*height:\s*['"]100%['"]\s*\}\}/g, ' }}');

  if (src.includes('pageWidth')) {
    src = ensurePageWidthImport(src, relDepth);
  }

  src = src.replace(/\s+sx=\{\{\s*\}\}/g, '');

  if (src !== original) {
    fs.writeFileSync(filePath, src, 'utf8');
    return true;
  }
  return false;
}

const changed = [];
for (const f of walk(root)) {
  if (convertFile(f)) changed.push(path.relative(root, f));
}
console.log('Updated', changed.length, 'files');
changed.forEach((f) => console.log(' -', f));
