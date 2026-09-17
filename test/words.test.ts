import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { ADJECTIVES, NOUNS, SUFFIXES, words } from '../src/index.ts';

const LISTS: Array<[string, readonly string[], number]> = [
  ['adjectives', ADJECTIVES, 256],
  ['nouns', NOUNS, 256],
  ['suffixes', SUFFIXES, 128],
];

describe('dictionary', () => {
  for (const [name, list, minimum] of LISTS) {
    describe(name, () => {
      test('is big enough to be worth shipping', () => {
        assert.ok(
          list.length >= minimum,
          `${name} has ${list.length} words, expected at least ${minimum}`,
        );
      });

      test('is lowercase a-z only', () => {
        // Anything else breaks separators, casing, or url-safety.
        const offenders = list.filter((word) => !/^[a-z]+$/.test(word));
        assert.deepEqual(offenders, [], `${name} contains non a-z words`);
      });

      test('has no duplicates', () => {
        const seen = new Set<string>();
        const duplicates = list.filter((word) => !seen.add(word) || false);
        assert.deepEqual(duplicates, [], `${name} contains duplicates`);
      });

      test('is sorted', () => {
        // Keeps diffs readable when words are added.
        const sorted = [...list].sort();
        assert.deepEqual([...list], sorted, `${name} is not in sorted order`);
      });

      test('is frozen', () => {
        assert.ok(Object.isFrozen(list), `${name} must be frozen`);
      });
    });
  }

  test('holds no slurs from the blocklist', () => {
    // Not exhaustive — CONTRIBUTING.md carries the actual rule, and review is
    // what enforces it. This just catches the ones most likely to creep back in.
    const blocked = [
      'moron', 'cretin', 'imbecile', 'spastic', 'gimp', 'retard', 'retarded',
      'mongoloid', 'lunatic', 'psycho', 'slut', 'whore', 'slag', 'tranny',
      'faggot', 'fag', 'dyke', 'queer', 'nonce', 'paki', 'chink', 'gyppo',
    ];
    for (const [name, list] of LISTS) {
      const found = blocked.filter((word) => list.includes(word));
      assert.deepEqual(found, [], `${name} contains blocked words`);
    }
  });

  test('exposes the lists as a frozen group', () => {
    assert.ok(Object.isFrozen(words));
    assert.equal(words.adjectives, ADJECTIVES);
    assert.equal(words.nouns, NOUNS);
    assert.equal(words.suffixes, SUFFIXES);
  });
});
