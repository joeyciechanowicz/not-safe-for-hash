/**
 * Assembles the GitHub Pages site into dist-site/.
 *
 * There is no bundler. `main.js` imports the bare specifier "not-safe-for-hash",
 * which the import map in index.html points at ./not-safe-for-hash/index.js — so
 * the page loads the same build that npm publishes, and a broken build breaks
 * the site too.
 *
 * Every path in the output is relative, so the site works from the
 * /not-safe-for-hash/ project sub-path on GitHub Pages without any base-url
 * configuration.
 */

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';

const OUT = 'dist-site';

if (!existsSync('dist/esm/index.js')) {
  console.error('build-site: dist/esm is missing — run `npm run build` first.');
  process.exit(1);
}

// tsc has already emitted main.js here; clear out anything else from a previous run.
for (const stale of ['not-safe-for-hash', 'index.html', 'styles.css']) {
  rmSync(`${OUT}/${stale}`, { recursive: true, force: true });
}
mkdirSync(OUT, { recursive: true });

cpSync('site/index.html', `${OUT}/index.html`);
cpSync('site/styles.css', `${OUT}/styles.css`);
cpSync('dist/esm', `${OUT}/not-safe-for-hash`, {
  recursive: true,
  // Source maps point at ../src, which is not deployed.
  filter: (source) => !source.endsWith('.map'),
});

console.log(`build-site: wrote ${OUT}/`);
