/**
 * Post-build fixups.
 *
 * 1. Type markers. The package is `"type": "module"`, so the CommonJS build in
 *    dist/cjs would be parsed as ESM without a marker of its own. Node resolves
 *    that by walking up to the nearest package.json, so a two-line one in each
 *    directory is enough.
 *
 * 2. Declaration extensions. Source imports carry `.ts` extensions so that
 *    `node --test` can run them directly; `rewriteRelativeImportExtensions`
 *    rewrites those to `.js` in the emitted JavaScript, but not in the emitted
 *    `.d.ts` files. TypeScript resolves either form, but `.js` is what every
 *    other tool expects to see in a declaration file.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

for (const [dir, type] of [['dist/esm', 'module'], ['dist/cjs', 'commonjs']]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ type }, null, 2)}\n`);
}

let rewritten = 0;

function rewriteDeclarations(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteDeclarations(path);
    } else if (entry.name.endsWith('.d.ts')) {
      const source = readFileSync(path, 'utf8');
      // Only relative specifiers: a bare 'pkg.ts' would be a package name.
      const fixed = source.replace(/(from\s+['"]\.{1,2}\/[^'"]+)\.ts(['"])/g, '$1.js$2');
      if (fixed !== source) {
        writeFileSync(path, fixed);
        rewritten++;
      }
    }
  }
}

rewriteDeclarations('dist/esm');

console.log(`postbuild: wrote type markers, rewrote ${rewritten} declaration file(s)`);
