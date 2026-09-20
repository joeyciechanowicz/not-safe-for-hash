import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { indexFrom, randomIndex, randomIndexFrom } from '../src/random.ts';

describe('randomIndex', () => {
  test('stays within bounds', () => {
    for (const bound of [1, 2, 3, 7, 255, 256, 257, 558]) {
      for (let i = 0; i < 2000; i++) {
        const index = randomIndex(bound);
        assert.ok(Number.isInteger(index), `${index} is not an integer`);
        assert.ok(index >= 0 && index < bound, `${index} out of range for ${bound}`);
      }
    }
  });

  test('a bound of 1 or less always yields 0', () => {
    assert.equal(randomIndex(1), 0);
    assert.equal(randomIndex(0), 0);
  });

  test('is uniform enough to pass a chi-square test', () => {
    // A bound that does not divide 2^32, so a naive `% bound` would skew low.
    // 99.9% critical value for 6 degrees of freedom is 24.32; a fair generator
    // trips this roughly once in a thousand runs.
    const bound = 7;
    const samples = 700_000;
    const counts = new Array<number>(bound).fill(0);
    for (let i = 0; i < samples; i++) counts[randomIndex(bound)]!++;

    const expected = samples / bound;
    const chiSquare = counts.reduce((sum, n) => sum + (n - expected) ** 2 / expected, 0);
    assert.ok(
      chiSquare < 24.32,
      `chi-square ${chiSquare.toFixed(2)} suggests a biased distribution: ${counts.join(', ')}`,
    );
  });

  test('covers the whole range, including the last index', () => {
    const bound = 50;
    const seen = new Set<number>();
    for (let i = 0; i < 20_000; i++) seen.add(randomIndex(bound));
    assert.equal(seen.size, bound, 'some indices were never produced');
  });
});

describe('indexFrom', () => {
  // indexFrom carries its own copy of the rejection rule so that randomIndex
  // does not have to call through a function pointer. That is only safe while
  // the copy behaves identically, which is what these check.
  const counter = () => {
    let value = 0;
    return () => value++ >>> 0;
  };

  test('stays within bounds', () => {
    const next = counter();
    for (const bound of [1, 2, 3, 7, 255, 256, 257, 558]) {
      for (let i = 0; i < 2000; i++) {
        const index = indexFrom(next, bound);
        assert.ok(Number.isInteger(index), `${index} is not an integer`);
        assert.ok(index >= 0 && index < bound, `${index} out of range for ${bound}`);
      }
    }
  });

  test('a bound of 1 or less always yields 0, without touching the stream', () => {
    let calls = 0;
    const next = () => {
      calls++;
      return 0;
    };
    assert.equal(indexFrom(next, 1), 0);
    assert.equal(indexFrom(next, 0), 0);
    assert.equal(calls, 0);
  });

  test('rejects and redraws the values that would skew the result', () => {
    // With bound 7 the acceptable range stops at floor(2^32 / 7) * 7, so the
    // last three values of the 32-bit range have to be thrown away rather than
    // folded back onto indices 0, 1 and 2.
    const limit = Math.floor(0x1_0000_0000 / 7) * 7;
    const values = [limit, limit + 1, limit + 2, 6];
    let at = 0;
    const next = () => values[at++] as number;

    assert.equal(indexFrom(next, 7), 6);
    assert.equal(at, values.length, 'the out-of-range values were not all redrawn');
  });

  test('is uniform enough to pass a chi-square test', () => {
    const bound = 7;
    const samples = 700_000;
    const counts = new Array<number>(bound).fill(0);
    const next = () => (Math.random() * 0x1_0000_0000) >>> 0;
    for (let i = 0; i < samples; i++) counts[indexFrom(next, bound)]!++;

    const expected = samples / bound;
    const chiSquare = counts.reduce((sum, n) => sum + (n - expected) ** 2 / expected, 0);
    assert.ok(
      chiSquare < 24.32,
      `chi-square ${chiSquare.toFixed(2)} suggests a biased distribution: ${counts.join(', ')}`,
    );
  });
});

describe('randomIndexFrom', () => {
  test('maps [0, 1) across the range', () => {
    assert.equal(randomIndexFrom(() => 0, 10), 0);
    assert.equal(randomIndexFrom(() => 0.5, 10), 5);
    assert.equal(randomIndexFrom(() => 0.99, 10), 9);
  });

  test('clamps out-of-contract values instead of going out of bounds', () => {
    assert.equal(randomIndexFrom(() => 1, 10), 9);
    assert.equal(randomIndexFrom(() => 1.5, 10), 9);
    assert.equal(randomIndexFrom(() => -1, 10), 0);
  });

  test('rejects a source that does not return a number', () => {
    assert.throws(() => randomIndexFrom(() => NaN, 10), TypeError);
    assert.throws(() => randomIndexFrom(() => 'nope' as never, 10), TypeError);
  });
});
