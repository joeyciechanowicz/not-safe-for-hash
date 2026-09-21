/**
 * not-safe-for-hash — human-readable unique ids, but rude.
 *
 * ```ts
 * import { generate, hash } from 'not-safe-for-hash';
 * generate();      // 'stupid-cunt-head' — a different one every time
 * hash('joey');    // the same phrase for 'joey', for ever
 * ```
 */

import { hashStream } from './hash.ts';
import { indexFrom, randomIndex, randomIndexFrom } from './random.ts';
import { ADJECTIVES, NOUNS, SUFFIXES, words } from './words/index.ts';

export { ADJECTIVES, NOUNS, SUFFIXES, words };

/** The kind of word a slot in a pattern is filled from. */
export type Role = 'adjective' | 'noun' | 'suffix';

/** How the words are cased before they are joined. */
export type Casing = 'lower' | 'upper' | 'title' | 'camel' | 'pascal';

export interface GenerateOptions {
  /**
   * The roles to fill, in order. Defaults to {@link DEFAULT_PATTERN}.
   * Takes precedence over `words`.
   */
  pattern?: readonly Role[];
  /** Shorthand for a stock pattern of this length (2–6). Ignored if `pattern` is set. */
  words?: number;
  /** Joins the words. Defaults to `'-'`, or `''` for camel and pascal casing. */
  separator?: string;
  /** Defaults to `'lower'`. */
  casing?: Casing;
  /** Allow the same word twice in one phrase. Defaults to `false`. */
  allowRepeats?: boolean;
  /**
   * Source of randomness, returning a number in `[0, 1)`. Defaults to
   * `crypto.getRandomValues`. Supply your own to make output reproducible.
   */
  random?: () => number;
}

/** `adjective-noun-suffix`, e.g. `stupid-cunt-head`. */
export const DEFAULT_PATTERN: readonly Role[] = Object.freeze<Role[]>([
  'adjective',
  'noun',
  'suffix',
]);

const LISTS: Readonly<Record<Role, readonly string[]>> = Object.freeze({
  adjective: ADJECTIVES,
  noun: NOUNS,
  suffix: SUFFIXES,
});

/** Stock patterns reachable through the `words` shorthand. */
const WORD_PATTERNS: Readonly<Record<number, readonly Role[]>> = Object.freeze({
  2: Object.freeze<Role[]>(['adjective', 'noun']),
  3: DEFAULT_PATTERN,
  4: Object.freeze<Role[]>(['adjective', 'adjective', 'noun', 'suffix']),
  5: Object.freeze<Role[]>(['adjective', 'adjective', 'noun', 'noun', 'suffix']),
  6: Object.freeze<Role[]>(['adjective', 'adjective', 'adjective', 'noun', 'noun', 'suffix']),
});

export const MIN_WORDS = 2;
export const MAX_WORDS = 6;

/** How many times a slot is redrawn looking for an unused word before giving in. */
const REPEAT_RETRIES = 100;

function resolvePattern(options?: GenerateOptions): readonly Role[] {
  if (options?.pattern !== undefined) {
    const pattern = options.pattern;
    if (!Array.isArray(pattern) || pattern.length === 0) {
      throw new TypeError('options.pattern must be a non-empty array of roles');
    }
    for (const role of pattern) {
      if (!Object.hasOwn(LISTS, role)) {
        throw new TypeError(
          `Unknown role ${JSON.stringify(role)}. Expected one of: adjective, noun, suffix`,
        );
      }
    }
    return pattern;
  }

  if (options?.words !== undefined) {
    const count = options.words;
    const pattern = WORD_PATTERNS[count];
    if (!Number.isInteger(count) || pattern === undefined) {
      throw new RangeError(
        `options.words must be an integer between ${MIN_WORDS} and ${MAX_WORDS}, got ${count}`,
      );
    }
    return pattern;
  }

  return DEFAULT_PATTERN;
}

function resolveSeparator(options?: GenerateOptions): string {
  if (options?.separator !== undefined) return options.separator;
  const casing = options?.casing;
  // Hyphens in a camelCase id defeat the point of asking for camelCase.
  return casing === 'camel' || casing === 'pascal' ? '' : '-';
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function applyCasing(word: string, casing: Casing, index: number): string {
  switch (casing) {
    case 'lower':
      return word;
    case 'upper':
      return word.toUpperCase();
    case 'title':
    case 'pascal':
      return capitalise(word);
    case 'camel':
      return index === 0 ? word : capitalise(word);
    default:
      throw new TypeError(
        `Unknown casing ${JSON.stringify(casing)}. Expected one of: lower, upper, title, camel, pascal`,
      );
  }
}

/**
 * Fill a pattern, one word per slot.
 *
 * A random id and a hashed one differ only in where the indices come from, so
 * both go through here. `stream` is the deterministic source behind
 * {@link hash}; without it, indices come from `options.random` or the crypto
 * pool as usual.
 *
 * The three sources are branched on rather than passed in as one function
 * because this is the library's hot loop: a call through a parameter costs
 * roughly 15% of `parts()`, where a perfectly predicted branch costs nothing.
 */
function drawParts(options: GenerateOptions | undefined, stream?: () => number): string[] {
  const pattern = resolvePattern(options);
  const casing = options?.casing ?? 'lower';
  const allowRepeats = options?.allowRepeats ?? false;
  const random = options?.random;

  const result: string[] = new Array(pattern.length) as string[];
  // A plain array beats a Set here: patterns are a handful of words long.
  const chosen: string[] = [];

  for (let i = 0; i < pattern.length; i++) {
    const list = LISTS[pattern[i] as Role];
    const bound = list.length;
    let word = '';
    for (let attempt = 0; attempt <= REPEAT_RETRIES; attempt++) {
      const index = stream
        ? indexFrom(stream, bound)
        : random
          ? randomIndexFrom(random, bound)
          : randomIndex(bound);
      word = list[index] as string;
      if (allowRepeats || !chosen.includes(word)) break;
    }
    chosen.push(word);
    result[i] = applyCasing(word, casing, i);
  }

  return result;
}

/**
 * The words of one id, unjoined and already cased.
 *
 * `parts(options).join(separator)` is exactly what {@link generate} returns.
 */
export function parts(options?: GenerateOptions): string[] {
  return drawParts(options);
}

/**
 * One rude id, e.g. `stupid-cunt-head`.
 *
 * Uses `crypto.getRandomValues` unless `options.random` says otherwise.
 */
export function generate(options?: GenerateOptions): string {
  return parts(options).join(resolveSeparator(options));
}

/**
 * `count` ids, with no repeats within the batch.
 *
 * Throws if `count` is so close to {@link combinations} that distinct ids cannot
 * be found in a reasonable number of attempts.
 */
export function generateMany(count: number, options?: GenerateOptions): string[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`count must be a non-negative integer, got ${count}`);
  }
  if (count === 0) return [];

  const total = combinations(options);
  if (count > total) {
    throw new RangeError(
      `Cannot generate ${count} distinct ids: this pattern only has ${total} combinations`,
    );
  }

  const separator = resolveSeparator(options);
  const seen = new Set<string>();
  const result: string[] = [];
  // Generous enough that an honest request never trips it, bounded enough that a
  // near-exhaustive one fails fast instead of spinning.
  const budget = count * 20 + 100;

  for (let attempt = 0; attempt < budget && result.length < count; attempt++) {
    const id = parts(options).join(separator);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  if (result.length < count) {
    throw new Error(
      `Gave up finding ${count} distinct ids after ${budget} attempts. ` +
        `Use a longer pattern: this one has only ${total} combinations.`,
    );
  }

  return result;
}

export interface HashOptions extends Omit<GenerateOptions, 'random'> {
  /**
   * Namespaces the hash: the same input under a different seed gives a
   * different phrase. Defaults to `0`.
   */
  seed?: number;
}

/**
 * The words of {@link hash}, unjoined and already cased.
 *
 * `hashParts(input, options).join(separator)` is exactly what `hash` returns.
 */
export function hashParts(input: string | Uint8Array, options?: HashOptions): string[] {
  return drawParts(options, hashStream(input, options?.seed ?? 0));
}

/**
 * The same input always gives the same rude phrase.
 *
 * ```ts
 * hash('joey');              // 'feeble-punk-clobberer', every time
 * hash('joey', { seed: 1 }); // a different phrase, just as stable
 * ```
 *
 * Not a cryptographic hash, and not collision-free: the output space is the id
 * space, so {@link combinations} is also the number of distinct phrases there
 * are to go round. Unlike a collision between two random ids, a collision here
 * is permanent — those two inputs map to that phrase for good.
 *
 * Output is tied to the packaged dictionary. Adding or removing a word moves
 * every phrase, which is why a dictionary change is a breaking change.
 */
export function hash(input: string | Uint8Array, options?: HashOptions): string {
  return hashParts(input, options).join(resolveSeparator(options));
}

/**
 * How many distinct ids a pattern can produce.
 *
 * With `allowRepeats: false` this accounts for a role being drawn more than once.
 * It is a slight overcount when the same word appears in two different lists
 * (`goblin` is both a noun and a suffix), which is rare enough to ignore.
 */
export function combinations(options?: GenerateOptions): number {
  const pattern = resolvePattern(options);
  const allowRepeats = options?.allowRepeats ?? false;
  const drawn = new Map<Role, number>();

  let total = 1;
  for (const role of pattern) {
    const size = (LISTS[role] as readonly string[]).length;
    const already = drawn.get(role) ?? 0;
    total *= allowRepeats ? size : size - already;
    drawn.set(role, already + 1);
  }
  return total;
}

/** The entropy of a pattern in bits, i.e. `log2(combinations())`. */
export function entropyBits(options?: GenerateOptions): number {
  return Math.log2(combinations(options));
}

/**
 * Roughly how many ids you can draw before a collision becomes likelier than not.
 *
 * The birthday bound: at `probability` 0.5 and the default pattern, about 8,500.
 */
export function idsUntilCollision(probability = 0.5, options?: GenerateOptions): number {
  if (!(probability > 0 && probability < 1)) {
    throw new RangeError(`probability must be between 0 and 1 exclusive, got ${probability}`);
  }
  return Math.round(Math.sqrt(2 * combinations(options) * Math.log(1 / (1 - probability))));
}
