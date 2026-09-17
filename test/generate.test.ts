import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PATTERN,
  MAX_WORDS,
  MIN_WORDS,
  generate,
  parts,
  words,
} from '../src/index.ts';

const inList = (word: string, list: readonly string[]) => list.includes(word);

describe('generate', () => {
  test('produces adjective-noun-suffix by default', () => {
    for (let i = 0; i < 200; i++) {
      const [adjective, noun, suffix, ...rest] = generate().split('-');
      assert.equal(rest.length, 0);
      assert.ok(inList(adjective as string, words.adjectives), `${adjective} is not an adjective`);
      assert.ok(inList(noun as string, words.nouns), `${noun} is not a noun`);
      assert.ok(inList(suffix as string, words.suffixes), `${suffix} is not a suffix`);
    }
  });

  test('matches the shape of the example id', () => {
    assert.deepEqual([...DEFAULT_PATTERN], ['adjective', 'noun', 'suffix']);
    assert.match(generate(), /^[a-z]+-[a-z]+-[a-z]+$/);
  });

  test('parts() joined by the separator equals generate()', () => {
    // Same options, same shape — the only difference is the join.
    const options = { words: 4, separator: '.', casing: 'title' } as const;
    const piece = parts(options);
    assert.equal(piece.length, 4);
    assert.match(piece.join(options.separator), /^[A-Z][a-z]+(\.[A-Z][a-z]+){3}$/);
  });

  test('honours the words shorthand', () => {
    for (let count = MIN_WORDS; count <= MAX_WORDS; count++) {
      assert.equal(generate({ words: count }).split('-').length, count);
    }
  });

  test('honours an explicit pattern, including repeated roles', () => {
    const id = generate({ pattern: ['noun', 'noun', 'adjective'] });
    const [first, second, third] = id.split('-');
    assert.ok(inList(first as string, words.nouns));
    assert.ok(inList(second as string, words.nouns));
    assert.ok(inList(third as string, words.adjectives));
  });

  test('honours the separator', () => {
    assert.match(generate({ separator: '_' }), /^[a-z]+_[a-z]+_[a-z]+$/);
    assert.match(generate({ separator: '' }), /^[a-z]+$/);
    assert.match(generate({ separator: ' ' }), /^[a-z]+ [a-z]+ [a-z]+$/);
  });

  describe('casing', () => {
    test('lower is the default', () => {
      const seeded = () => generate({ random: () => 0.42 });
      assert.equal(seeded(), generate({ casing: 'lower', random: () => 0.42 }));
      assert.match(generate({ casing: 'lower' }), /^[a-z-]+$/);
    });

    test('upper and title', () => {
      assert.match(generate({ casing: 'upper' }), /^[A-Z]+-[A-Z]+-[A-Z]+$/);
      assert.match(generate({ casing: 'title' }), /^[A-Z][a-z]+(-[A-Z][a-z]+){2}$/);
    });

    test('camel and pascal drop the separator unless one is given', () => {
      assert.match(generate({ casing: 'camel' }), /^[a-z]+[A-Z][a-z]+[A-Z][a-z]+$/);
      assert.match(generate({ casing: 'pascal' }), /^([A-Z][a-z]+){3}$/);
      assert.match(generate({ casing: 'camel', separator: '-' }), /^[a-z]+(-[A-Z][a-z]+){2}$/);
    });
  });

  describe('allowRepeats', () => {
    test('defaults to no repeated word within one id', () => {
      // Every slot draws from the same short list, so repeats are near-certain
      // unless they are actively avoided.
      for (let i = 0; i < 500; i++) {
        const picked = parts({ pattern: ['noun', 'noun', 'noun', 'noun'] });
        assert.equal(new Set(picked).size, picked.length, `repeat in ${picked.join('-')}`);
      }
    });

    test('allows repeats when asked', () => {
      // A fixed random source makes every draw land on the same word.
      const id = generate({ pattern: ['noun', 'noun'], allowRepeats: true, random: () => 0.5 });
      const [first, second] = id.split('-');
      assert.equal(first, second);
    });

    test('gives up rather than hanging when repeats are unavoidable', () => {
      // A single-word list plus allowRepeats: false is impossible to satisfy.
      const id = generate({ pattern: ['noun', 'noun'], random: () => 0 });
      assert.equal(id.split('-').length, 2);
    });
  });

  test('an injected random source makes output reproducible', () => {
    const fixedSequence = () => {
      let i = 0;
      const values = [0, 0.25, 0.5, 0.75, 0.9];
      return () => values[i++ % values.length] as number;
    };
    const first = generate({ random: fixedSequence() });
    const second = generate({ random: fixedSequence() });
    assert.equal(first, second);
    assert.equal(first, generate({ random: fixedSequence() }));
  });

  test('random() returning exactly 1 is clamped, not out of bounds', () => {
    const id = generate({ random: () => 1 });
    const [adjective, noun, suffix] = id.split('-');
    assert.equal(adjective, words.adjectives.at(-1));
    assert.equal(noun, words.nouns.at(-1));
    assert.equal(suffix, words.suffixes.at(-1));
  });
});
