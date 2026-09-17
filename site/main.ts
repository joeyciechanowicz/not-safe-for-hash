/**
 * The nsfh demo site.
 *
 * Plain DOM, no framework. The library is resolved through the import map in
 * index.html, so this page consumes the published build rather than a copy of it.
 */

import {
  combinations,
  entropyBits,
  generate,
  generateMany,
  idsUntilCollision,
  type Casing,
  type GenerateOptions,
} from 'nsfh';

const BATCH_SIZE = 10;

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

const idDisplay = element<HTMLButtonElement>('id-display');
const idText = element('id-text');
const rerollButton = element<HTMLButtonElement>('reroll');
const wordsInput = element<HTMLInputElement>('words');
const wordsValue = element<HTMLOutputElement>('words-value');
const separatorSelect = element<HTMLSelectElement>('separator');
const casingSelect = element<HTMLSelectElement>('casing');
const allowRepeatsInput = element<HTMLInputElement>('allow-repeats');
const batchList = element<HTMLUListElement>('batch-list');
const batchRefresh = element<HTMLButtonElement>('batch-refresh');
const toast = element('toast');
const codeSample = element('code-sample');

const statCombinations = element('stat-combinations');
const statEntropy = element('stat-entropy');
const statCollision = element('stat-collision');
const statsNote = element('stats-note');

function currentOptions(): GenerateOptions {
  return {
    words: Number(wordsInput.value),
    separator: separatorSelect.value,
    casing: casingSelect.value as Casing,
    allowRepeats: allowRepeatsInput.checked,
  };
}

const compact = new Intl.NumberFormat('en-GB', {
  notation: 'compact',
  compactDisplay: 'long',
  maximumSignificantDigits: 3,
});

const SUPERSCRIPT = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

/**
 * 52,359,930 is a satisfying number to read in full; 6,190,000,000,000,000 is
 * not. Billions and trillions get names, and past that — where CLDR runs out of
 * words and starts saying "6190 trillion" — it switches to scientific notation.
 */
function formatCount(value: number): string {
  if (value < 1e9) return Math.round(value).toLocaleString('en-GB');
  if (value < 1e15) return compact.format(value);

  const [mantissa, exponent] = value.toExponential(2).split('e+') as [string, string];
  const raised = [...exponent].map((digit) => SUPERSCRIPT[Number(digit)]).join('');
  return `${mantissa} × 10${raised}`;
}

let toastTimer: number | undefined;

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1600);
}

async function copy(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    showToast(`Copied ${value}`);
  } catch {
    // Clipboard access needs a secure context and permission; neither is
    // guaranteed, and failing to copy should not break the page.
    showToast('Could not copy — select it by hand');
  }
}

function roll(): void {
  const id = generate(currentOptions());
  idText.textContent = id;
  idDisplay.dataset['id'] = id;

  // Restarting the animation needs the class gone for a frame.
  idDisplay.classList.remove('is-rolling');
  void idDisplay.offsetWidth;
  idDisplay.classList.add('is-rolling');
}

function refreshBatch(): void {
  const options = currentOptions();
  const ids = generateMany(BATCH_SIZE, options);

  batchList.replaceChildren(
    ...ids.map((id) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = id;
      button.title = 'Click to copy';
      button.addEventListener('click', () => void copy(id));

      const item = document.createElement('li');
      item.append(button);
      return item;
    }),
  );
}

function refreshStats(): void {
  const options = currentOptions();
  const total = combinations(options);
  const untilCollision = idsUntilCollision(0.5, options);

  statCombinations.textContent = formatCount(total);
  statEntropy.textContent = `${entropyBits(options).toFixed(1)} bits`;
  statCollision.textContent = `~${formatCount(untilCollision)} ids`;
  statsNote.textContent =
    `Draw about ${formatCount(untilCollision)} ids at these settings and it is an even ` +
    `bet that two of them match. Want better odds? Add a word.`;
}

function refreshAll(): void {
  wordsValue.textContent = wordsInput.value;
  roll();
  refreshStats();
  refreshBatch();
}

idDisplay.addEventListener('click', () => {
  const id = idDisplay.dataset['id'];
  if (id) void copy(id);
});

rerollButton.addEventListener('click', roll);
batchRefresh.addEventListener('click', refreshBatch);

casingSelect.addEventListener('input', () => {
  // A hyphenated PascalCase id is nobody's idea of PascalCase. Move the
  // separator out of the way, but leave it editable afterwards.
  const casing = casingSelect.value;
  if (casing === 'camel' || casing === 'pascal') {
    separatorSelect.value = '';
  } else if (separatorSelect.value === '') {
    separatorSelect.value = '-';
  }
});

for (const control of [wordsInput, separatorSelect, casingSelect, allowRepeatsInput]) {
  control.addEventListener('input', refreshAll);
}

document.addEventListener('keydown', (event) => {
  if (event.key !== ' ' && event.key !== 'Spacebar') return;

  // Space belongs to whatever is focused if that thing is interactive.
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body && active.tagName !== 'MAIN') {
    const interactive = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'];
    if (interactive.includes(active.tagName)) return;
  }

  event.preventDefault();
  roll();
});

// The sample in the usage block should look like something this page produced.
codeSample.textContent = generate();

refreshAll();
