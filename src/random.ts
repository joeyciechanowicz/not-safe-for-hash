/**
 * Uniform random index selection.
 *
 * Words are picked far more often than once per phrase, so entropy is drawn in
 * batches: one `getRandomValues` call fills a pool of 32-bit words that is then
 * handed out one at a time. That turns a per-word crypto call into a per-256-word
 * one, which is the difference between tens of thousands and millions of ids a
 * second.
 */

const POOL_SIZE = 256;
const UINT32_RANGE = 0x1_0000_0000;

const webcrypto = globalThis.crypto;
const hasCrypto = typeof webcrypto?.getRandomValues === 'function';

const pool = new Uint32Array(POOL_SIZE);
let poolIndex = POOL_SIZE;

function nextUint32(): number {
  if (!hasCrypto) {
    // No Web Crypto (very old runtimes). Still fine for ids, just not for secrets.
    return Math.floor(Math.random() * UINT32_RANGE) >>> 0;
  }
  if (poolIndex >= POOL_SIZE) {
    webcrypto.getRandomValues(pool);
    poolIndex = 0;
  }
  return pool[poolIndex++] as number;
}

/**
 * A uniformly distributed integer in `[0, bound)`.
 *
 * `value % bound` alone would favour the low indices whenever `bound` does not
 * divide 2^32, so values in the final partial block are rejected and redrawn.
 */
export function randomIndex(bound: number): number {
  if (bound <= 1) return 0;
  const limit = Math.floor(UINT32_RANGE / bound) * bound;
  let value = nextUint32();
  while (value >= limit) value = nextUint32();
  return value % bound;
}

/** The same, but driven by a caller-supplied `() => number` in `[0, 1)`. */
export function randomIndexFrom(random: () => number, bound: number): number {
  if (bound <= 1) return 0;
  const value = random();
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new TypeError('options.random must return a number in [0, 1)');
  }
  // Clamp rather than throw: a random() returning exactly 1 is a common off-by-one.
  const index = Math.floor(value * bound);
  return index < 0 ? 0 : index >= bound ? bound - 1 : index;
}
