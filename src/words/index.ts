import { ADJECTIVES } from './adjectives.ts';
import { NOUNS } from './nouns.ts';
import { SUFFIXES } from './suffixes.ts';

export { ADJECTIVES, NOUNS, SUFFIXES };

/**
 * The packaged dictionary, grouped by the role each list plays in a phrase.
 * Frozen: mutating it would change ids other callers have already handed out.
 */
export const words = Object.freeze({
  adjectives: ADJECTIVES,
  nouns: NOUNS,
  suffixes: SUFFIXES,
});
