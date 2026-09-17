# nsfh

**Human-readable unique ids, but rude.**

```
stupid-cunt-head
```

The usual `silly-goose-tea` id generators are charming. This one is not. It is the
same idea — a memorable phrase instead of `f47ac10b-58cc-4372` — drawn from a
dictionary of nothing but profanity and insults. It is a joke, and it works.

> [!WARNING]
> Every id this package produces is deliberately obscene. That is the whole point.
> Do not put it in front of customers, and think twice about your logs.

**[Try it in the browser →](https://joeyciechanowicz.github.io/nsfh/)**

## Install

```sh
npm install nsfh
```

Zero runtime dependencies. The dictionary ships inside the package, so there is
nothing to fetch and nothing to configure. ESM and CommonJS builds, TypeScript
types included.

## Usage

```ts
import { generate } from 'nsfh';

generate();
// 'stupid-cunt-head'

generate({ words: 4 });
// 'moist-angry-splodge-crumpet'

generate({ casing: 'pascal' });
// 'ClumsyCadBellows'

generate({ separator: '_', casing: 'upper' });
// 'RANCID_KNACKER_TRUMPET'
```

CommonJS works the same way:

```js
const { generate } = require('nsfh');
```

### A batch at a time

`generateMany` never repeats itself within a batch:

```ts
import { generateMany } from 'nsfh';

generateMany(3);
// ['inept-scab-mushroom', 'bloated-scrag-mongoose', 'stale-squib-bottler']
```

### On the command line

```sh
npx nsfh              # one id
npx nsfh 10           # ten of them
npx nsfh 5 -w 4 -c pascal
npx nsfh --stats      # combinations, entropy, collision odds
```

## API

| Export | What it does |
| --- | --- |
| `generate(options?)` | One id as a string. |
| `generateMany(count, options?)` | `count` ids, all distinct within the batch. |
| `parts(options?)` | The words of one id, unjoined and already cased. |
| `combinations(options?)` | How many distinct ids the options can produce. |
| `entropyBits(options?)` | `log2(combinations())`. |
| `idsUntilCollision(probability?, options?)` | Birthday bound — ids drawn before a collision hits that probability. |
| `words` | The packaged dictionary: `{ adjectives, nouns, suffixes }`. |
| `DEFAULT_PATTERN` | `['adjective', 'noun', 'suffix']`. |

### Options

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `pattern` | `Role[]` | `['adjective', 'noun', 'suffix']` | The roles to fill, in order. Wins over `words`. |
| `words` | `2`–`6` | `3` | Shorthand for a stock pattern of that length. |
| `separator` | `string` | `'-'` | `''` when casing is `camel` or `pascal`. |
| `casing` | `'lower' \| 'upper' \| 'title' \| 'camel' \| 'pascal'` | `'lower'` | |
| `allowRepeats` | `boolean` | `false` | Whether one word may appear twice in an id. |
| `random` | `() => number` | `crypto.getRandomValues` | Supply your own to make output reproducible. |

A `Role` is `'adjective'`, `'noun'` or `'suffix'`. The default pattern is one of
each, which is where `stupid-cunt-head` comes from. Custom patterns can repeat a
role as much as you like:

```ts
generate({ pattern: ['adjective', 'adjective', 'noun'] });
// 'soggy-festering-bellend'
```

## How unique is it?

Random, not sequential — so the question is a birthday-problem one. The packaged
dictionary holds 558 adjectives, 383 nouns and 245 suffixes.

| Words | Combinations | Entropy | 50% chance of a collision after |
| --- | --- | --- | --- |
| 2 | 213,714 | 17.7 bits | ~544 ids |
| 3 *(default)* | 52,359,930 | 25.6 bits | ~8,520 ids |
| 4 | 29,164,481,010 | 34.8 bits | ~201,074 ids |
| 5 | 11,140,831,745,820 | 43.3 bits | ~3,929,946 ids |
| 6 | 6,194,302,450,675,920 | 52.5 bits | ~92,666,750 ids |

Three words is fine for naming a few thousand things — build runs, test fixtures,
staging environments, pull request branches. If you need a primary key, use more
words or check for collisions, same as any other random id. `idsUntilCollision()`
will do the arithmetic for you:

```ts
import { idsUntilCollision } from 'nsfh';

idsUntilCollision(0.01);              // ~1,026 ids before a 1% chance
idsUntilCollision(0.5, { words: 5 }); // ~3,929,946
```

Ids are drawn from `crypto.getRandomValues` with rejection sampling, so every
word is equally likely — a plain `% length` would quietly favour the start of the
alphabet. On a runtime with no Web Crypto it falls back to `Math.random`, which
is fine for ids and not fine for secrets.

## Speed

About 3.5 million ids a second on a laptop-class machine, because entropy is
drawn 256 words at a time rather than one syscall per word:

```
generate()                            3,506,465 ops/sec  (285 ns each)
generate({ words: 6 })                2,332,299 ops/sec  (429 ns each)
parts()                               5,767,332 ops/sec  (173 ns each)
```

Run `npm run bench` to check it yourself.

## The word list

Profanity, crudeness and insults are the entire point. Slurs are not: nothing in
the dictionary targets race, ethnicity, nationality, sexuality, gender identity,
religion or disability. That line is enforced by a test and explained in
[CONTRIBUTING.md](CONTRIBUTING.md) — it is what keeps this a joke rather than an
excuse.

The lists are plain exported arrays, so you can look before you install:

```ts
import { words } from 'nsfh';

words.adjectives.length; // 558
words.nouns.includes('bellend'); // true
```

## Development

```sh
npm install
npm test           # node --test, no test framework
npm run typecheck
npm run build      # ESM + CJS + types into dist/
npm run bench
npm run build:site # static site into dist-site/
```

There are no runtime dependencies and the only devDependencies are TypeScript and
its Node types. Tests run straight off the TypeScript sources using Node's native
type stripping.

### The site

`site/` is a single page with no framework and no bundler. It loads the built
package through an import map, so it consumes exactly what npm publishes. Serve
it locally with any static server:

```sh
npm run build:site
npx http-server dist-site
```

It deploys to GitHub Pages from `.github/workflows/pages.yml` on every push to
`main`. That workflow needs Pages switched on once, under
**Settings → Pages → Build and deployment → Source → GitHub Actions**.

Pick "GitHub Actions", not "Deploy from a branch". The latter is the option the
settings page offers first, and it makes GitHub run Jekyll over the repo root
instead of serving this workflow's artifact. Since `dist-site/` is gitignored and
there is no `index.html` at the root, that build publishes the README as the site
— and because it runs on the same push, it can land *after* this workflow and
quietly overwrite it.

## Licence

MIT
