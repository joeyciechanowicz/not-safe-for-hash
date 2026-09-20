/**
 * Regenerates the pinned `hash()` output in the test suite.
 *
 * `hash()` promises that a given input always produces a given phrase, and
 * that promise is only as good as something noticing when it breaks. Two
 * assertions guard it: a table of known inputs and their exact phrases, and a
 * fingerprint of the dictionary those phrases came from. Both are written into
 * the tests between markers, and both are regenerated from here.
 *
 * Run this only when the change is deliberate. Every id every caller has ever
 * stored moves with it.
 *
 *   node scripts/hash-vectors.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { hash } from '../src/index.ts';
import { digest128 } from '../src/hash.ts';
import { ADJECTIVES, NOUNS, SUFFIXES } from '../src/words/index.ts';

/**
 * Inputs worth pinning: the empty string (which digests to xoshiro's one dead
 * state), multi-byte UTF-8, a key exactly one 16-byte block long, one that is
 * blocks plus a tail, and each option that steers the draw.
 */
const CASES = [
  ['', {}],
  ['hello', {}],
  ['joey', {}],
  ['café 🤬', {}],
  ['0123456789abcdef', {}],
  ['the quick brown fox jumps over the lazy dog', {}],
  ['hello', { seed: 1 }],
  ['hello', { words: 2 }],
  ['hello', { words: 6 }],
  ['hello', { casing: 'pascal' }],
  ['hello', { separator: '_', casing: 'upper' }],
  ['hello', { pattern: ['noun', 'noun', 'noun'], allowRepeats: true }],
];

/** A digest of the dictionary itself, so a word list edit reports as one. */
function fingerprint() {
  const joined = [ADJECTIVES.join(','), NOUNS.join(','), SUFFIXES.join(',')].join('\n');
  return digest128(new TextEncoder().encode(joined), 0)
    .map((word) => word.toString(16).padStart(8, '0'))
    .join('');
}

function replaceBlock(path, name, body) {
  const source = readFileSync(path, 'utf8');
  const pattern = new RegExp(`( *)// ${name}:start\\n[\\s\\S]*?// ${name}:end\\n`);
  const match = pattern.exec(source);
  if (!match) throw new Error(`${path}: no // ${name}:start … // ${name}:end block`);

  const indent = match[1];
  const indented = body
    .split('\n')
    .map((line) => (line ? indent + line : line))
    .join('\n');
  const updated = source.replace(pattern, `${indent}// ${name}:start\n${indented}\n${indent}// ${name}:end\n`);

  if (updated === source) return false;
  writeFileSync(path, updated);
  return true;
}

/** The value as TypeScript source, in this project's quoting style. */
function sourceOf(value) {
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) return `[${value.map(sourceOf).join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, inner]) => `${key}: ${sourceOf(inner)}`);
    return entries.length === 0 ? '{}' : `{ ${entries.join(', ')} }`;
  }
  return String(value);
}

const rows = CASES.map(
  ([input, options]) =>
    `  [${sourceOf(input)}, ${sourceOf(options)}, ${sourceOf(hash(input, options))}],`,
);

const vectors = [
  'const VECTORS: ReadonlyArray<readonly [string, HashOptions, string]> = [',
  ...rows,
  '];',
].join('\n');

const changedVectors = replaceBlock('test/hash.test.ts', 'vectors', vectors);
const changedPrint = replaceBlock(
  'test/words.test.ts',
  'fingerprint',
  `const FINGERPRINT = '${fingerprint()}';`,
);

for (const [path, changed] of [
  ['test/hash.test.ts', changedVectors],
  ['test/words.test.ts', changedPrint],
]) {
  console.log(`${changed ? 'updated' : 'unchanged'}  ${path}`);
}

if (changedVectors || changedPrint) {
  console.log(
    '\nhash() output has moved. That is a breaking change: bump the version and\n' +
      'say so in the release notes.',
  );
}
