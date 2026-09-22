# not-safe-for-hash

**Human-readable unique ids, but rude.**

```
swampy-hooligan-gargler
```

Like the usual `silly-goose-tea` generators — a memorable phrase instead of
`f47ac10b-58cc-4372` — except the dictionary is nothing but profanity and
insults.

`generate()` makes a new id. `hash()` turns a string you already have into
the same rude phrase every time.

> [!WARNING]
> Every id is deliberately obscene. Keep it away from customers, and think
> twice about your logs.

**[Try it in the browser →](https://joeyciechanowicz.github.io/not-safe-for-hash/)**

## Install

```sh
npm install not-safe-for-hash
```

No runtime dependencies. Dictionary ships inside the package. ESM and
CommonJS builds, TypeScript types included.

## Usage

```ts
import { generate } from 'not-safe-for-hash';

generate();
// 'swampy-hooligan-gargler'

generate({ words: 4 });
// 'niffy-guttural-spunk-pilot'

generate({ casing: 'pascal' });
// 'UnsightlyGalootKettle'

generate({ separator: '_', casing: 'upper' });
// 'BOLLOCKSED_BAMPOT_JUGGLER'
```

CommonJS:

```js
const { generate } = require('not-safe-for-hash');
```

### Batches

`generateMany` won't repeat a word within a batch:

```ts
import { generateMany } from 'not-safe-for-hash';

generateMany(3);
// ['fetid-fraud-yapper', 'squirting-shitweasel-mushroom', 'gurgling-arse-ape']
```

### As a hash function

`generate` is random. `hash` is deterministic — same input, same phrase,
every machine, every run.

```ts
import { hash } from 'not-safe-for-hash';

hash('joey');
// 'feeble-punk-clobberer'

hash('joey');
// 'feeble-punk-clobberer', still

hash('9f2c1ab');
// 'sludgy-dross-brain'

hash('https://example.com/orders/8f14e45f');
// 'inflamed-ballbag-wrestler'
```

Good for naming things that already have a boring identifier — a commit sha,
a url, a branch, a customer number. Everyone hashing it gets the same name,
with nothing to store or look up.

Takes the same options as `generate`, plus `seed` to namespace it:

```ts
hash('joey', { words: 4 }); // 'feeble-naff-donkey-sifter'
hash('joey', { seed: 1 });  // 'unbearable-lurgy-pancake', just as stable
```

Input is hashed as UTF-8, so a `Uint8Array` and the string it encodes hash
the same. `hashParts` gives the words unjoined, like `parts` does.

> [!IMPORTANT]
> Not a cryptographic hash, and not collision-free — there are only as many
> phrases as the table below allows, so two inputs landing on one id is a
> matter of when, not if. And unlike a clash between random ids, it's
> permanent: those two inputs share that phrase for good. Use it to name
> things, not to key them.

Output depends on the packaged dictionary. Adding or removing a word shifts
every phrase, so a dictionary change is a breaking change — the test suite
pins it so that can't happen by accident.

### Command line

```sh
npx not-safe-for-hash              # one id
npx not-safe-for-hash 10           # ten of them
npx not-safe-for-hash 5 -w 4 -c pascal
npx not-safe-for-hash --stats      # combinations, entropy, collision odds
```

Once installed, the command is just `nsfh`.

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
| `random` | `() => number` | `crypto.getRandomValues` | `generate` only. Supply your own for reproducible output. |
| `seed` | `number` | `0` | `hash` only. Namespaces the hash: same input, different seed, different phrase. |

A `Role` is `'adjective'`, `'noun'` or `'suffix'`. The default pattern is one
of each — that's where `swampy-hooligan-gargler` comes from. Custom patterns can
repeat a role:

```ts
generate({ pattern: ['adjective', 'adjective', 'noun'] });
// 'clotted-raucous-gasbag'
```

## How unique is it?

Random, not sequential, so it's a birthday-problem question. The packaged
dictionary holds 600 adjectives, 421 nouns and 317 suffixes.

| Words | Combinations | Entropy | 50% chance of a collision after |
| --- | --- | --- | --- |
| 2 | 252,600 | 17.9 bits | ~592 ids |
| 3 *(default)* | 80,074,200 | 26.3 bits | ~10,536 ids |
| 4 | 47,964,445,800 | 35.5 bits | ~257,862 ids |
| 5 | 20,145,067,236,000 | 44.2 bits | ~5,284,600 ids |
| 6 | 12,046,750,207,128,000 | 53.4 bits | ~129,229,803 ids |

Three words is fine for naming a few thousand things — build runs, test
fixtures, staging environments, pull request branches. For a primary key,
use more words or check for collisions, same as any other random id.
`idsUntilCollision()` does the arithmetic:

```ts
import { idsUntilCollision } from 'not-safe-for-hash';

idsUntilCollision(0.01);              // ~1,269 ids before a 1% chance
idsUntilCollision(0.5, { words: 5 }); // ~5,284,600
```

Ids come from `crypto.getRandomValues` with rejection sampling, so every
word is equally likely — a plain `% length` would quietly favour the start
of the alphabet. Falls back to `Math.random` on runtimes without Web
Crypto, which is fine for ids and not fine for secrets.

The same table governs `hash`, since it draws from the same dictionary —
but read it differently. A collision between random ids is bad luck you can
retry; a collision between two hashed inputs is a fact about those inputs,
and it's still there tomorrow.

## Speed

About three million ids a second on a laptop-class machine — entropy is
drawn 256 words at a time instead of one syscall per word:

```
generate()                            3,056,737 ops/sec  (327 ns each)
generate({ words: 6 })                1,547,588 ops/sec  (646 ns each)
parts()                               5,137,618 ops/sec  (195 ns each)
hash('joey')                          2,228,767 ops/sec  (449 ns each)
hash(a 62-byte url)                   1,696,370 ops/sec  (589 ns each)
```

Hashing adds a MurmurHash3 pass over the input on top of word selection, so
unlike `generate` it slows down as the input grows — slowly, around 750 MB
a second.

Run `npm run bench` to check it yourself.

## The word list

Profanity, crudeness and insults are the point. Slurs aren't: nothing in
the dictionary targets race, ethnicity, nationality, sexuality, gender
identity, religion or disability. A test enforces that line;
[CONTRIBUTING.md](CONTRIBUTING.md) explains it.

The lists are plain exported arrays:

```ts
import { words } from 'not-safe-for-hash';

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

No runtime dependencies; the only devDependencies are TypeScript and its
Node types. Tests run straight off the TypeScript sources using Node's
native type stripping.

### The site

`site/` is a single page, no framework, no bundler. It loads the built
package through an import map, so it consumes exactly what npm publishes.
Serve it locally with any static server:

```sh
npm run build:site
npx http-server dist-site
```

Deploys to GitHub Pages from `.github/workflows/pages.yml` on every push to
`main`. That workflow needs Pages switched on once, under
**Settings → Pages → Build and deployment → Source → GitHub Actions**.

Pick "GitHub Actions", not "Deploy from a branch" — the latter is what the
settings page offers first, and it makes GitHub run Jekyll over the repo
root instead of serving this workflow's artifact. Since `dist-site/` is
gitignored and there's no `index.html` at the root, that build publishes
the README as the site — and because it runs on the same push, it can land
*after* this workflow and overwrite it.

## Licence

MIT
