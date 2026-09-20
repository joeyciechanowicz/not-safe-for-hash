# Contributing

Mostly this means adding words.

## The one rule

**Profanity yes. Slurs no.**

The joke is being crude. Swearing, scatology, body parts, bodily functions and
old-fashioned insults are all fair game — the ruder the better.

What does not go in, ever:

- Slurs or attacks aimed at race, ethnicity or nationality
- Slurs or attacks aimed at sexuality or gender identity
- Slurs or attacks aimed at disability, including the medicalised ones that have
  drifted into casual use (`moron`, `cretin`, `imbecile`, `spastic` and friends)
- Slurs or attacks aimed at religion
- Sexualised insults that only ever get aimed at women
- Anything about a real, identifiable person

The distinction is who gets hurt. `bellend` insults whoever you point it at.
A slur insults a whole group of people who never opted in. An id generator that
can spit a slur at a user is not funny, it is a bug report waiting to happen.

`test/words.test.ts` carries a blocklist that catches the most likely offenders,
but it is a backstop, not the rule. The rule is above, and review enforces it.

## Adding words

The dictionary lives in three files:

| File | Role | Example |
| --- | --- | --- |
| `src/words/adjectives.ts` | The modifier | `stupid`-cunt-head |
| `src/words/nouns.ts` | The rude core | stupid-`cunt`-head |
| `src/words/suffixes.ts` | The insult tail | stupid-cunt-`head` |

Each list must stay:

- **lowercase a–z only** — no spaces, hyphens, digits or accents, because they
  break separators, casing and url-safety
- **unique** within its own list
- **sorted**, so diffs stay readable

`npm test` checks all three. `combinations()` and the README's entropy table are
both derived from the list lengths, so update the README table if you add enough
to move the numbers.

A good suffix is one that reads as an insult tail after almost any noun —
`-head`, `-muncher`, `-trumpet`, `-goblin`. If it only works after one specific
word, it probably belongs in the nouns list instead.

### Adding a word is a breaking change

It did not used to be. `hash()` turns an input into indices into these three
lists, so inserting a single word shifts everything after it and rewrites every
phrase `hash()` has ever returned — including ones people have already written
down.

Two tests hold that line, and both will fail the moment you touch a list:

- `test/words.test.ts` fingerprints the dictionary as shipped
- `test/hash.test.ts` pins the exact phrase for a table of known inputs

Neither is a wall to climb over. They are there so the change is a decision
rather than a surprise. When you mean it:

```sh
node scripts/hash-vectors.mjs   # repins both
```

Then say so in the release: a minor version while the package is pre-1.0, a
major one after. `generate()` is unaffected either way — it never promised you
the same id twice.

## Before you open a pull request

```sh
npm run typecheck
npm test
npm run build
```

CI runs the same three on Node 20, 22 and 24.
