import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { combinations, hash, hashParts, words, type HashOptions } from '../src/index.ts';
import { digest128 } from '../src/hash.ts';

// Pinned output. Regenerate with `node scripts/hash-vectors.mjs`, and only ever
// on purpose: every id any caller has stored moves with it.
// vectors:start
const VECTORS: ReadonlyArray<readonly [string, HashOptions, string]> = [
  ['', {}, 'earwaxed-rogue-crusader'],
  ['hello', {}, 'plastered-slacker-howitzer'],
  ['joey', {}, 'feeble-punk-clobberer'],
  ['café 🤬', {}, 'soggy-guff-fucker'],
  ['0123456789abcdef', {}, 'scowling-layabout-badger'],
  ['the quick brown fox jumps over the lazy dog', {}, 'leprous-swine-whistle'],
  ['hello', { seed: 1 }, 'swampy-dickrot-grumbler'],
  ['hello', { words: 2 }, 'plastered-slacker'],
  ['hello', { words: 6 }, 'plastered-glutinous-germy-douche-dickbag-nozzle'],
  ['hello', { casing: 'pascal' }, 'PlasteredSlackerHowitzer'],
  ['hello', { separator: '_', casing: 'upper' }, 'PLASTERED_SLACKER_HOWITZER'],
  ['hello', { pattern: ['noun', 'noun', 'noun'], allowRepeats: true }, 'gunge-slacker-sleaze'],
];
// vectors:end

describe('hash', () => {
  test('is the same phrase every time', () => {
    for (const input of ['', 'joey', 'a much longer input than that one']) {
      const first = hash(input);
      assert.equal(hash(input), first);
      assert.equal(hash(input), first);
    }
  });

  test('matches its pinned vectors', () => {
    assert.ok(VECTORS.length > 0, 'run `node scripts/hash-vectors.mjs`');
    for (const [input, options, expected] of VECTORS) {
      assert.equal(
        hash(input, options),
        expected,
        `hash(${JSON.stringify(input)}) has moved — see scripts/hash-vectors.mjs`,
      );
    }
  });

  test('draws every word from the list its role names', () => {
    for (let i = 0; i < 500; i++) {
      const [adjective, noun, suffix, ...rest] = hash(`input ${i}`).split('-');
      assert.equal(rest.length, 0);
      assert.ok(words.adjectives.includes(adjective as string), `${adjective} is not an adjective`);
      assert.ok(words.nouns.includes(noun as string), `${noun} is not a noun`);
      assert.ok(words.suffixes.includes(suffix as string), `${suffix} is not a suffix`);
    }
  });

  test('hashParts() joined by the separator equals hash()', () => {
    const options = { words: 4, separator: '.', casing: 'title' } as const;
    const piece = hashParts('joey', options);
    assert.equal(piece.length, 4);
    assert.equal(piece.join(options.separator), hash('joey', options));
  });

  test('honours the same options generate() does', () => {
    assert.match(hash('joey', { separator: '_' }), /^[a-z]+_[a-z]+_[a-z]+$/);
    assert.match(hash('joey', { casing: 'pascal' }), /^([A-Z][a-z]+){3}$/);
    assert.equal(hash('joey', { words: 6 }).split('-').length, 6);
    assert.equal(hash('joey', { pattern: ['noun', 'adjective'] }).split('-').length, 2);
  });

  test('a Uint8Array hashes as the string it encodes', () => {
    for (const input of ['', 'joey', 'café 🤬']) {
      assert.equal(hash(new TextEncoder().encode(input)), hash(input));
    }

    // A view into a larger buffer must be read from its own offset. Node hands
    // these out routinely: Buffer.from() usually returns one.
    const padded = new TextEncoder().encode('XXXXjoey');
    assert.equal(hash(padded.subarray(4)), hash('joey'));
  });

  test('survives the encoder switching strategies', () => {
    // Short inputs are encoded into a scratch buffer that grows as needed;
    // past a threshold each one gets a fresh array instead. Both paths have to
    // agree, and neither may leave the next hash reading stale bytes.
    const long = 'a'.repeat(100_000);
    assert.equal(hash(long), hash(new TextEncoder().encode(long)));

    const before = hash('joey');
    hash('b'.repeat(5_000));
    hash(long);
    assert.equal(hash('joey'), before, 'a long input disturbed a later short one');
  });

  test('the empty string survives the all-zero digest', () => {
    // '' with seed 0 digests to four zeroes, which is xoshiro128**'s one fixed
    // point: without the guard in hashStream every slot draws index 0.
    assert.deepEqual(digest128(new TextEncoder().encode(''), 0), [0, 0, 0, 0]);
    assert.notDeepEqual(hashParts(''), [words.adjectives[0], words.nouns[0], words.suffixes[0]]);
    assert.match(hash(''), /^[a-z]+-[a-z]+-[a-z]+$/);
  });

  test('rejects anything that is not a string or Uint8Array', () => {
    for (const bad of [42, null, undefined, {}, ['a'], new Date()]) {
      assert.throws(() => hash(bad as unknown as string), TypeError);
    }
  });

  test('rejects a non-integer seed', () => {
    assert.throws(() => hash('joey', { seed: 1.5 }), TypeError);
    assert.throws(() => hash('joey', { seed: NaN }), TypeError);
  });

  describe('mixing', () => {
    test('a one-character change moves the phrase', () => {
      // Not a guarantee — two inputs may legitimately collide — but at this
      // sample size a mixer worth the name is nowhere near the 1-in-80-million
      // rate that would let more than a couple through.
      const alphabet = 'abcdefghijklmnopqrstuvwxyz';
      let unchanged = 0;
      for (let i = 0; i < alphabet.length; i++) {
        const base = `user-${alphabet[i]}-account`;
        for (const swap of alphabet) {
          const mutated = `user-${swap}-account`;
          if (mutated !== base && hash(mutated) === hash(base)) unchanged++;
        }
      }
      assert.equal(unchanged, 0, `${unchanged} one-character changes left the phrase alone`);
    });

    test('a different seed gives a different phrase', () => {
      let same = 0;
      for (let i = 0; i < 1000; i++) {
        if (hash(`input ${i}`) === hash(`input ${i}`, { seed: 1 })) same++;
      }
      assert.ok(same <= 2, `${same} of 1000 inputs hashed alike under two seeds`);
    });

    test('collides no more often than chance says it should', () => {
      // The birthday bound: n distinct inputs over N phrases collide about
      // n^2 / 2N times. A mixer that clumps blows straight through this, while
      // the honest variance at these numbers is nowhere near a factor of two.
      const SAMPLE = 200_000;
      const seen = new Set<string>();
      for (let i = 0; i < SAMPLE; i++) seen.add(hash(`id-${i}`));

      const collisions = SAMPLE - seen.size;
      const expected = (SAMPLE * SAMPLE) / (2 * combinations());
      assert.ok(
        collisions < expected * 2,
        `${collisions} collisions in ${SAMPLE} hashes, expected about ${Math.round(expected)}`,
      );
    });

    test('spreads across the whole of each list', () => {
      const SAMPLE = 100_000;
      const counts = [new Map<string, number>(), new Map<string, number>(), new Map<string, number>()];
      for (let i = 0; i < SAMPLE; i++) {
        const piece = hashParts(`id-${i}`);
        for (let slot = 0; slot < 3; slot++) {
          const word = piece[slot] as string;
          const tally = counts[slot] as Map<string, number>;
          tally.set(word, (tally.get(word) ?? 0) + 1);
        }
      }

      const lists = [words.adjectives, words.nouns, words.suffixes];
      for (let slot = 0; slot < 3; slot++) {
        const list = lists[slot] as readonly string[];
        const tally = counts[slot] as Map<string, number>;
        const mean = SAMPLE / list.length;

        assert.equal(tally.size, list.length, `slot ${slot} never drew some words`);
        const busiest = Math.max(...tally.values());
        assert.ok(
          busiest < mean * 2,
          `slot ${slot}: one word drawn ${busiest} times against a mean of ${Math.round(mean)}`,
        );
      }
    });
  });

  test('the digest is MurmurHash3 x86 128, bit for bit', () => {
    // SMHasher's verification test: hash keys of length 0-255 where key[i] = i,
    // each with seed 256-length, concatenate the little-endian digests, hash
    // that, and take the first word. The reference implementation's answer is
    // 0xb3ece62a — so any drift in the mixing constants shows up here rather
    // than as a wall of changed phrases.
    const key = new Uint8Array(256);
    const digests = new Uint8Array(16 * 256);

    for (let length = 0; length < 256; length++) {
      key[length] = length;
      const digest = digest128(key.subarray(0, length), 256 - length);
      for (let word = 0; word < 4; word++) {
        const value = digest[word] as number;
        const at = length * 16 + word * 4;
        digests[at] = value & 0xff;
        digests[at + 1] = (value >>> 8) & 0xff;
        digests[at + 2] = (value >>> 16) & 0xff;
        digests[at + 3] = (value >>> 24) & 0xff;
      }
    }

    assert.equal(digest128(digests, 0)[0], 0xb3ece62a);
  });
});
