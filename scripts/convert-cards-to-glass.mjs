#!/usr/bin/env node
/**
 * Phase 2: convert MUI Card → GlassCard across client/src (except GlassCard.tsx).
 * Preserves CardContent, CardActions, etc. Adds p:0 when CardContent follows GlassCard.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'client', 'src');

const SKIP_FILES = new Set(['shared/ui/GlassCard.tsx']);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function relToSharedUi(filePath) {
  const from = path.dirname(filePath);
  const to = path.join(root, 'shared', 'ui');
  let rel = path.relative(from, to).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function hasCardUsage(src) {
  return (
    /\bCard\b/.test(src) &&
    (/<Card[\s>]/.test(src) || /import\s+Card\s+from/.test(src) || /,\s*Card\s*,/.test(src) || /{\s*Card\s*,/.test(src) || /,\s*Card\s*}/.test(src))
  );
}

function convertFile(filePath) {
  const rel = path.relative(root, filePath).split(path.sep).join('/');
  if (SKIP_FILES.has(rel)) return false;

  let src = fs.readFileSync(filePath, 'utf8');
  if (!hasCardUsage(src)) return false;

  const original = src;

  // Standalone Card import
  src = src.replace(/import\s+Card\s+from\s+['"]@mui\/material\/Card['"];?\n/g, '');

  // Remove Card from named MUI imports (keep CardContent, CardActions, etc.)
  src = src.replace(
    /import\s*{([^}]+)}\s*from\s*['"]@mui\/material['"];?/g,
    (match, inner) => {
      const parts = inner.split(',').map((p) => p.trim()).filter(Boolean);
      const filtered = parts.filter((p) => p !== 'Card' && !p.startsWith('Card '));
      if (filtered.length === parts.length) return match;
      if (filtered.length === 0) return '';
      return `import { ${filtered.join(', ')} } from '@mui/material';`;
    }
  );

  // JSX: Card → GlassCard (not CardContent)
  src = src.replace(/<\/Card>/g, '</GlassCard>');
  src = src.replace(/<Card(\s|>|\/)/g, '<GlassCard$1');

  // Fix accidental GlassCardContent
  src = src.replace(/GlassCardContent/g, 'CardContent');

  // Add GlassCard import if we introduced GlassCard
  if (src.includes('GlassCard') && !src.includes("from '../shared/ui'") && !src.includes('from "../../shared/ui"')) {
    const importPath = relToSharedUi(filePath);
    const glassImport = `import { GlassCard } from '${importPath}';\n`;
    const lastImport = src.lastIndexOf('\nimport ');
    if (lastImport !== -1) {
      const end = src.indexOf('\n', lastImport + 1);
      src = src.slice(0, end + 1) + glassImport + src.slice(end + 1);
    } else {
      src = glassImport + src;
    }
  }

  // Merge duplicate GlassCard imports from shared/ui
  const glassImports = src.match(/import\s*{[^}]*GlassCard[^}]*}\s*from\s*['"][^'"]+shared\/ui['"];?\n/g);
  if (glassImports && glassImports.length > 1) {
    for (let i = 1; i < glassImports.length; i++) {
      src = src.replace(glassImports[i], '');
    }
  }

  if (src !== original) {
    fs.writeFileSync(filePath, src, 'utf8');
    return true;
  }
  return false;
}

const files = walk(root);
const changed = [];
for (const f of files) {
  if (convertFile(f)) changed.push(path.relative(root, f));
}

console.log(`Converted ${changed.length} files:`);
changed.sort().forEach((f) => console.log('  -', f));
