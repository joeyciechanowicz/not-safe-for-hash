import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  combinations,
  entropyBits,
  generateMany,
  idsUntilCollision,
  words,
} from '../src/index.ts';

const { adjectives, nouns, suffixes } = words;

describe('combinations', () => {
  test('is the product of the lists in the default pattern', () => {
    assert.equal(combinations(), adjectives.length * nouns.length * suffixes.length);
  });

  test('discounts a repeated role when repeats are disallowed', () => {
    // Two adjectives, no repeats: the second draw has one fewer word to pick.
    assert.equal(
      combinations({ pattern: ['adjective', 'adjective'] }),
      adjectives.length * (adjectives.length - 1),
    );
    assert.equal(
      combinations({ pattern: ['adjective', 'adjective'], allowRepeats: true }),
      adjectives.length * adjectives.length,
    );
  });

  test('grows with the word count', () => {
    let previous = 0;
    for (let count = 2; count <= 6; count++) {
      const total = combinations({ words: count });
      assert.ok(total > previous, `${count} words should beat ${count - 1}`);
      previous = total;
    }
  });
});

describe('entropyBits', () => {
  test('is log2 of the combination count', () => {
    assert.equal(entropyBits(), Math.log2(combinations()));
  });

  test('clears 25 bits on the default pattern', () => {
    assert.ok(entropyBits() > 25, `only ${entropyBits()} bits`);
  });
});

describe('idsUntilCollision', () => {
  test('follows the birthday bound', () => {
    const half = idsUntilCollision(0.5);
    assert.equal(half, Math.round(Math.sqrt(2 * combinations() * Math.log(2))));
    assert.ok(half > 1000 && half < 100_000, `implausible: ${half}`);
  });

  test('a lower probability tolerates fewer ids', () => {
    assert.ok(idsUntilCollision(0.01) < idsUntilCollision(0.5));
  });

  test('rejects probabilities outside (0, 1)', () => {
    assert.throws(() => idsUntilCollision(0), RangeError);
    assert.throws(() => idsUntilCollision(1), RangeError);
    assert.throws(() => idsUntilCollision(-0.5), RangeError);
  });
});

describe('generateMany', () => {
  test('returns the requested count, all distinct', () => {
    const batch = generateMany(500);
    assert.equal(batch.length, 500);
    assert.equal(new Set(batch).size, 500);
  });

  test('returns an empty array for zero', () => {
    assert.deepEqual(generateMany(0), []);
  });

  test('respects the options it is given', () => {
    const batch = generateMany(10, { words: 2, separator: '_' });
    assert.equal(batch.length, 10);
    for (const id of batch) assert.match(id, /^[a-z]+_[a-z]+$/);
  });

  test('refuses a count larger than the combination space', () => {
    assert.throws(
      () => generateMany(10, { pattern: ['suffix'] , random: () => 0 }),
      /only \d+ combinations/,
    );
  });

  test('gives up instead of spinning when the space is nearly exhausted', () => {
    // One slot, one possible word: the second distinct id cannot exist.
    assert.throws(() => generateMany(2, { pattern: ['noun'], random: () => 0 }), /Gave up/);
  });

  test('rejects a negative or fractional count', () => {
    assert.throws(() => generateMany(-1), RangeError);
    assert.throws(() => generateMany(1.5), RangeError);
  });
});

describe('option validation', () => {
  test('rejects an unknown role', () => {
    assert.throws(
      () => combinations({ pattern: ['verb' as never] }),
      /Unknown role "verb"/,
    );
  });

  test('rejects an empty pattern', () => {
    assert.throws(() => combinations({ pattern: [] }), TypeError);
  });

  test('rejects a word count outside 2-6', () => {
    assert.throws(() => combinations({ words: 1 }), RangeError);
    assert.throws(() => combinations({ words: 7 }), RangeError);
    assert.throws(() => combinations({ words: 3.5 }), RangeError);
  });
});
