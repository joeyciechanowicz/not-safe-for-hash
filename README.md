# nsfh

**Human-readable unique ids, but rude.**

```
stupid-cunt-head
```

The usual `silly-goose-tea` id generators are charming. This one is not. It is the
same idea — a memorable phrase instead of `f47ac10b-58cc-4372` — drawn from a
dictionary of nothing but profanity and insults. It is a joke, and it works.

It goes both ways: `generate()` invents a new id, and `hash()` turns a string
you already have into the same rude phrase every time.

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
// 'niffy-guttural-spunk-pilot'

generate({ casing: 'pascal' });
// 'UnsightlyGalootKettle'

generate({ separator: '_', casing: 'upper' });
// 'BOLLOCKSED_BAMPOT_JUGGLER'
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
// ['fetid-fraud-yapper', 'squirting-shitweasel-mushroom', 'gurgling-arse-ape']
```

### As a hash function

`generate` invents a new id every time. `hash` does the opposite: it maps an
input to a phrase and keeps it there, on every machine and every run.

```ts
import { hash } from 'nsfh';

hash('joey');
// 'feeble-punk-clobberer'

hash('joey');
// 'feeble-punk-clobberer', still

hash('9f2c1ab');
// 'sludgy-dross-brain'

hash('https://example.com/orders/8f14e45f');
// 'inflamed-ballbag-wrestler'
```

Useful when the thing you are naming already has a boring identifier — a commit
sha, a url, a branch, a customer number. Everyone who hashes it arrives at the
same rude name for it, with nothing to store and nothing to look up.

It takes every option `generate` does, plus a `seed` to namespace it:

```ts
hash('joey', { words: 4 }); // 'feeble-naff-donkey-sifter'
hash('joey', { seed: 1 });  // 'unbearable-lurgy-pancake', just as stable
```

Input is hashed as UTF-8, so a `Uint8Array` and the string it encodes come out
alike. `hashParts` gives you the words unjoined, exactly as `parts` does.

> [!IMPORTANT]
> This is not a cryptographic hash, and it cannot be collision-free: there are
> only as many phrases as the table below says, so two inputs landing on one id
> is a matter of when, not if. Unlike a clash between two random ids, this kind
> is permanent — those two inputs map to that phrase for good. Name things with
> it; do not key things by it.

Output is tied to the packaged dictionary. Adding or removing a single word
moves every phrase, so a dictionary change is a breaking change — pinned by the
test suite so it cannot happen by accident.

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
| `hash(input, options?)` | The same input always gives the same id. |
| `hashParts(input, options?)` | The words of `hash`, unjoined and already cased. |
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
| `random` | `() => number` | `crypto.getRandomValues` | `generate` only. Supply your own to make output reproducible. |
| `seed` | `number` | `0` | `hash` only. Namespaces the hash: same input, different seed, different phrase. |

A `Role` is `'adjective'`, `'noun'` or `'suffix'`. The default pattern is one of
each, which is where `stupid-cunt-head` comes from. Custom patterns can repeat a
role as much as you like:

```ts
generate({ pattern: ['adjective', 'adjective', 'noun'] });
// 'clotted-raucous-gasbag'
```

## How unique is it?

Random, not sequential — so the question is a birthday-problem one. The packaged
dictionary holds 600 adjectives, 421 nouns and 317 suffixes.

| Words | Combinations | Entropy | 50% chance of a collision after |
| --- | --- | --- | --- |
| 2 | 252,600 | 17.9 bits | ~592 ids |
| 3 *(default)* | 80,074,200 | 26.3 bits | ~10,536 ids |
| 4 | 47,964,445,800 | 35.5 bits | ~257,862 ids |
| 5 | 20,145,067,236,000 | 44.2 bits | ~5,284,600 ids |
| 6 | 12,046,750,207,128,000 | 53.4 bits | ~129,229,803 ids |

Three words is fine for naming a few thousand things — build runs, test fixtures,
staging environments, pull request branches. If you need a primary key, use more
words or check for collisions, same as any other random id. `idsUntilCollision()`
will do the arithmetic for you:

```ts
import { idsUntilCollision } from 'nsfh';

idsUntilCollision(0.01);              // ~1,269 ids before a 1% chance
idsUntilCollision(0.5, { words: 5 }); // ~5,284,600
```

Ids are drawn from `crypto.getRandomValues` with rejection sampling, so every
word is equally likely — a plain `% length` would quietly favour the start of the
alphabet. On a runtime with no Web Crypto it falls back to `Math.random`, which
is fine for ids and not fine for secrets.

The same table governs `hash`, since it draws from the same dictionary — but
read it differently. A collision between two random ids is bad luck you can
retry; a collision between two hashed inputs is a fact about those two inputs,
and it will still be there tomorrow.

## Speed

About three million ids a second on a laptop-class machine, because entropy is
drawn 256 words at a time rather than one syscall per word:

```
generate()                            3,056,737 ops/sec  (327 ns each)
generate({ words: 6 })                1,547,588 ops/sec  (646 ns each)
parts()                               5,137,618 ops/sec  (195 ns each)
hash('joey')                          2,228,767 ops/sec  (449 ns each)
hash(a 62-byte url)                   1,696,370 ops/sec  (589 ns each)
```

Hashing costs a MurmurHash3 pass over the input on top of the word selection,
so unlike `generate` it gets slower as the input gets longer — gently, at
around 750 MB a second.

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

words.adjectives.length; // 600
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
