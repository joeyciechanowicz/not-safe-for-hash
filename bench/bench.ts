/**
 * Throughput check. Run with `npm run bench`.
 *
 * Not a benchmark suite — just enough to catch a change that makes id generation
 * an order of magnitude slower.
 */

import { generate, generateMany, parts } from '../src/index.ts';

function measure(name: string, iterations: number, fn: () => unknown): void {
  // Warm up so the JIT has compiled the hot path before the clock starts.
  for (let i = 0; i < Math.min(iterations, 50_000); i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;

  const perSecond = (iterations / elapsed) * 1000;
  const nsEach = (elapsed * 1e6) / iterations;
  console.log(
    `${name.padEnd(34)} ${Math.round(perSecond).toLocaleString().padStart(12)} ops/sec  ` +
      `(${nsEach.toFixed(0)} ns each)`,
  );
}

console.log(`node ${process.version}\n`);

measure('generate()', 1_000_000, () => generate());
measure('generate({ words: 6 })', 500_000, () => generate({ words: 6 }));
measure('generate({ casing: "pascal" })', 500_000, () => generate({ casing: 'pascal' }));
measure('generate({ allowRepeats: true })', 1_000_000, () => generate({ allowRepeats: true }));
measure('parts()', 1_000_000, () => parts());
measure('generateMany(1000)', 1_000, () => generateMany(1000));
