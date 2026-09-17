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

`npm test` checks all three. Adding a word changes nothing else: `combinations()`
and the README's entropy table are both derived from the list lengths, so update
the README table if you add enough to move the numbers.

A good suffix is one that reads as an insult tail after almost any noun —
`-head`, `-muncher`, `-trumpet`, `-goblin`. If it only works after one specific
word, it probably belongs in the nouns list instead.

## Before you open a pull request

```sh
npm run typecheck
npm test
npm run build
```

CI runs the same three on Node 20, 22 and 24.
