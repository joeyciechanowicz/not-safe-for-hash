#!/usr/bin/env node
/**
 * nsfh CLI. Prints rude ids.
 *
 * Deliberately argument-parser-free: the whole point of the package is that it
 * pulls in nothing.
 */

import { generate, generateMany, combinations, entropyBits, idsUntilCollision } from '../dist/esm/index.js';

const USAGE = `nsfh — human-readable unique ids, but rude

Usage
  nsfh [count] [options]

Options
  -w, --words <2-6>        words per id (default 3)
  -s, --separator <str>    string between words (default "-")
  -c, --casing <casing>    lower | upper | title | camel | pascal (default lower)
      --allow-repeats      let the same word appear twice in one id
      --stats              print combination count and entropy instead of ids
  -h, --help               show this
  -v, --version            show the package version

Examples
  nsfh
  nsfh 10
  nsfh 5 --words 4 --casing pascal
`;

function parseArgs(argv) {
  const options = {};
  let count = 1;
  let sawCount = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) fail(`${arg} needs a value`);
      return value;
    };

    switch (arg) {
      case '-h': case '--help': return { help: true };
      case '-v': case '--version': return { version: true };
      case '--stats': options.stats = true; break;
      case '--allow-repeats': options.allowRepeats = true; break;
      case '-w': case '--words': options.words = Number(next()); break;
      case '-s': case '--separator': options.separator = next(); break;
      case '-c': case '--casing': options.casing = next(); break;
      default: {
        if (arg.startsWith('-')) fail(`Unknown option ${arg}`);
        if (sawCount) fail(`Unexpected argument ${arg}`);
        count = Number(arg);
        sawCount = true;
        if (!Number.isInteger(count) || count < 1) fail(`count must be a positive integer, got ${arg}`);
      }
    }
  }

  return { count, options };
}

function fail(message) {
  process.stderr.write(`nsfh: ${message}\n\nRun nsfh --help for usage.\n`);
  process.exit(1);
}

const parsed = parseArgs(process.argv.slice(2));

if (parsed.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}

if (parsed.version) {
  const { default: pkg } = await import('../package.json', { with: { type: 'json' } });
  process.stdout.write(`${pkg.version}\n`);
  process.exit(0);
}

const { count, options } = parsed;
const { stats, ...generateOptions } = options;

try {
  if (stats) {
    const total = combinations(generateOptions);
    process.stdout.write(
      `combinations   ${total.toLocaleString()}\n` +
        `entropy        ${entropyBits(generateOptions).toFixed(2)} bits\n` +
        `50% collision  after ~${idsUntilCollision(0.5, generateOptions).toLocaleString()} ids\n`,
    );
  } else if (count === 1) {
    process.stdout.write(`${generate(generateOptions)}\n`);
  } else {
    process.stdout.write(`${generateMany(count, generateOptions).join('\n')}\n`);
  }
} catch (error) {
  fail(error.message);
}
