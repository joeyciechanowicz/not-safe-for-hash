/**
 * Deterministic word selection, driven by the bytes of an input rather than by
 * entropy.
 *
 * `generate()` asks the machine for random numbers; `hash()` has to conjure the
 * same kind of stream out of a string, so that the same input always lands on
 * the same words. That is two jobs: digest the input down to a fixed-size
 * value, then expand that value back into as many indices as the pattern needs.
 *
 * The digest is MurmurHash3 x86 128. It is not cryptographic — it is fast,
 * public-domain and avalanches well, which is all a phrase-hash needs. 128 bits
 * rather than 32 because the id space is bigger than 32 bits: a six-word
 * pattern has 1.2 x 10^15 combinations, and seeding the stream with a 32-bit
 * value would confine every possible input to 4.3 billion of them.
 *
 * The expansion is xoshiro128**, seeded with the four digest words. A
 * known-good generator beats a hand-rolled one here: the indices it produces
 * have to be independent of each other, or `hash('a')` and `hash('b')` would
 * share a suspicious number of words.
 */

const encoder = new TextEncoder();

/** Rotate a 32-bit word left. */
function rotl(value: number, bits: number): number {
  return (value << bits) | (value >>> (32 - bits));
}

/** Murmur's finaliser: the avalanche step that makes near-identical inputs diverge. */
function fmix32(value: number): number {
  let h = value;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h;
}

const C1 = 0x239b961b;
const C2 = 0xab0e9789;
const C3 = 0x38b34ae5;
const C4 = 0xa1e38b93;

/**
 * MurmurHash3 x86 128, as four 32-bit words.
 *
 * Written against the reference implementation, with its fallthrough tail
 * switch spelled out as `if`s because this project compiles with
 * `noFallthroughCasesInSwitch`.
 */
export function digest128(bytes: Uint8Array, seed: number): [number, number, number, number] {
  const length = bytes.length;
  const blocks = length >>> 4;

  let h1 = seed | 0;
  let h2 = seed | 0;
  let h3 = seed | 0;
  let h4 = seed | 0;

  for (let i = 0; i < blocks; i++) {
    const at = i << 4;
    let k1 =
      (bytes[at] as number) |
      ((bytes[at + 1] as number) << 8) |
      ((bytes[at + 2] as number) << 16) |
      ((bytes[at + 3] as number) << 24);
    let k2 =
      (bytes[at + 4] as number) |
      ((bytes[at + 5] as number) << 8) |
      ((bytes[at + 6] as number) << 16) |
      ((bytes[at + 7] as number) << 24);
    let k3 =
      (bytes[at + 8] as number) |
      ((bytes[at + 9] as number) << 8) |
      ((bytes[at + 10] as number) << 16) |
      ((bytes[at + 11] as number) << 24);
    let k4 =
      (bytes[at + 12] as number) |
      ((bytes[at + 13] as number) << 8) |
      ((bytes[at + 14] as number) << 16) |
      ((bytes[at + 15] as number) << 24);

    k1 = Math.imul(rotl(Math.imul(k1, C1), 15), C2);
    h1 ^= k1;
    h1 = rotl(h1, 19);
    h1 = (h1 + h2) | 0;
    h1 = (Math.imul(h1, 5) + 0x561ccd1b) | 0;

    k2 = Math.imul(rotl(Math.imul(k2, C2), 16), C3);
    h2 ^= k2;
    h2 = rotl(h2, 17);
    h2 = (h2 + h3) | 0;
    h2 = (Math.imul(h2, 5) + 0x0bcaa747) | 0;

    k3 = Math.imul(rotl(Math.imul(k3, C3), 17), C4);
    h3 ^= k3;
    h3 = rotl(h3, 15);
    h3 = (h3 + h4) | 0;
    h3 = (Math.imul(h3, 5) + 0x96cd1c35) | 0;

    k4 = Math.imul(rotl(Math.imul(k4, C4), 18), C1);
    h4 ^= k4;
    h4 = rotl(h4, 13);
    h4 = (h4 + h1) | 0;
    h4 = (Math.imul(h4, 5) + 0x32ac3b17) | 0;
  }

  const at = blocks << 4;
  const tail = length & 15;
  let k1 = 0;
  let k2 = 0;
  let k3 = 0;
  let k4 = 0;

  if (tail >= 15) k4 ^= (bytes[at + 14] as number) << 16;
  if (tail >= 14) k4 ^= (bytes[at + 13] as number) << 8;
  if (tail >= 13) {
    k4 ^= bytes[at + 12] as number;
    h4 ^= Math.imul(rotl(Math.imul(k4, C4), 18), C1);
  }

  if (tail >= 12) k3 ^= (bytes[at + 11] as number) << 24;
  if (tail >= 11) k3 ^= (bytes[at + 10] as number) << 16;
  if (tail >= 10) k3 ^= (bytes[at + 9] as number) << 8;
  if (tail >= 9) {
    k3 ^= bytes[at + 8] as number;
    h3 ^= Math.imul(rotl(Math.imul(k3, C3), 17), C4);
  }

  if (tail >= 8) k2 ^= (bytes[at + 7] as number) << 24;
  if (tail >= 7) k2 ^= (bytes[at + 6] as number) << 16;
  if (tail >= 6) k2 ^= (bytes[at + 5] as number) << 8;
  if (tail >= 5) {
    k2 ^= bytes[at + 4] as number;
    h2 ^= Math.imul(rotl(Math.imul(k2, C2), 16), C3);
  }

  if (tail >= 4) k1 ^= (bytes[at + 3] as number) << 24;
  if (tail >= 3) k1 ^= (bytes[at + 2] as number) << 16;
  if (tail >= 2) k1 ^= (bytes[at + 1] as number) << 8;
  if (tail >= 1) {
    k1 ^= bytes[at] as number;
    h1 ^= Math.imul(rotl(Math.imul(k1, C1), 15), C2);
  }

  h1 ^= length;
  h2 ^= length;
  h3 ^= length;
  h4 ^= length;

  h1 = (h1 + h2) | 0;
  h1 = (h1 + h3) | 0;
  h1 = (h1 + h4) | 0;
  h2 = (h2 + h1) | 0;
  h3 = (h3 + h1) | 0;
  h4 = (h4 + h1) | 0;

  h1 = fmix32(h1);
  h2 = fmix32(h2);
  h3 = fmix32(h3);
  h4 = fmix32(h4);

  h1 = (h1 + h2) | 0;
  h1 = (h1 + h3) | 0;
  h1 = (h1 + h4) | 0;
  h2 = (h2 + h1) | 0;
  h3 = (h3 + h1) | 0;
  h4 = (h4 + h1) | 0;

  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Beyond this many bytes, encode into a fresh array rather than grow the scratch for good. */
const SCRATCH_LIMIT = 1 << 16;

let scratch = new Uint8Array(256);

/**
 * The UTF-8 bytes of an input.
 *
 * Bytes rather than UTF-16 code units, so that a `Uint8Array` and the string it
 * encodes hash alike and the digest could be reproduced outside JavaScript.
 *
 * `encodeInto` a reused buffer rather than `encode`, because `encode` allocates
 * a right-sized array every call and that alone costs more than ten times the
 * digest it feeds. The returned view is only valid until the next call, which
 * is why nothing outside this module gets to see it.
 */
function inputBytes(input: string | Uint8Array): Uint8Array {
  if (typeof input !== 'string') {
    if (input instanceof Uint8Array) return input;
    throw new TypeError(
      `hash() takes a string or a Uint8Array, got ${input === null ? 'null' : typeof input}`,
    );
  }

  // UTF-8 runs to at most three bytes per UTF-16 code unit: a surrogate pair is
  // two units and four bytes, everything else is one unit and up to three.
  const needed = input.length * 3;
  if (needed > SCRATCH_LIMIT) return encoder.encode(input);

  while (scratch.length < needed) scratch = new Uint8Array(scratch.length * 2);
  const { written } = encoder.encodeInto(input, scratch);
  return scratch.subarray(0, written);
}

/**
 * A deterministic stream of 32-bit words for one input: xoshiro128** seeded
 * with the input's digest.
 */
export function hashStream(input: string | Uint8Array, seed: number): () => number {
  if (!Number.isInteger(seed)) {
    throw new TypeError(`options.seed must be an integer, got ${seed}`);
  }

  let [s0, s1, s2, s3] = digest128(inputBytes(input), seed >>> 0);

  // All-zero is xoshiro's one fixed point, and it is reachable: fmix32(0) is 0,
  // so an empty input with seed 0 digests to four zeroes. Any non-zero state
  // will do; these are the fractional bits of the golden ratio and of sqrt(2).
  if ((s0 | s1 | s2 | s3) === 0) {
    s0 = 0x9e3779b9;
    s1 = 0x243f6a88;
    s2 = 0xb7e15162;
    s3 = 0x6a09e667;
  }

  return () => {
    const result = Math.imul(rotl(Math.imul(s1, 5), 7), 9) >>> 0;
    const t = s1 << 9;

    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = rotl(s3, 11);

    return result;
  };
}
