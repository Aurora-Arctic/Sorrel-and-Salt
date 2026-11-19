import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { insertSpell, seedCoven, withSql } from './stories/coven-ingredients';
import { DESKTOP_WIDTH } from './breakpoints';

// The full-screen spell preview's burn (claude-docs/components/spell-preview.md, "The background"). Each test pauses
// every animation in the scene and sets its time, so a frame is read exactly rather than caught by the clock. A layer's
// opacity is its effective one: its own times every ancestor's up to the scene, so a layer inside a hidden one counts as
// hidden. Flecks and travelling heat are found by `data-burn-part`; the edge embers by the class story 86 already uses.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

// The base config asks for reduced motion, which turns the burn's animations off.
test.use({ reducedMotion: 'no-preference' });

const EDGE = {
  'edge ember': '.spell-preview__ember--edge',
  fleck: '[data-burn-part="fleck"]',
  heat: '[data-burn-part="heat"]',
} as const;

interface Series {
  label: string;
  values: number[];
}

interface Probe {
  freeze(): number;
  series(selector: string | null, times: number[]): Series[];
  widths(selector: string, times: number[]): number[];
  filteredAfter(after: number): { offenders: string[]; filtered: number; later: number };
}

function installProbe() {
  let animations: Animation[] = [];
  const scene = (): Element => {
    const found = document.querySelector('.spell-preview[open] .spell-preview__scene');
    if (!found) throw new Error('the pane has no scene');
    return found;
  };
  const own = (el: Element, pseudo: string | null): number =>
    parseFloat(getComputedStyle(el, pseudo).opacity);
  const effective = (el: Element, pseudo: string | null): number => {
    const top = scene();
    let value = pseudo ? own(el, pseudo) : 1;
    for (let node: Element | null = el; node; node = node.parentElement) {
      value *= own(node, null);
      if (node === top) break;
    }
    return value;
  };
  const seek = (t: number) => {
    for (const animation of animations) animation.currentTime = t;
  };
  const labelOf = (el: Element, i: number, pseudo: string | null): string =>
    `${el.className || el.tagName.toLowerCase()}#${i}${pseudo ?? ''}`;
  const nodes = (selector: string | null) => {
    const top = scene();
    const elements = selector
      ? [...top.querySelectorAll(selector)]
      : [...top.querySelectorAll('*')];
    const found: { el: Element; pseudo: string | null; label: string }[] = [];
    elements.forEach((el, i) => {
      found.push({ el, pseudo: null, label: labelOf(el, i, null) });
      if (selector) return;
      for (const pseudo of ['::before', '::after']) {
        const content = getComputedStyle(el, pseudo).content;
        if (content && content !== 'none' && content !== 'normal')
          found.push({ el, pseudo, label: labelOf(el, i, pseudo) });
      }
    });
    return found;
  };
  const filtered = (el: Element, pseudo: string | null): boolean => {
    if (pseudo && getComputedStyle(el, pseudo).filter.includes('url(')) return true;
    for (let node: Element | null = el; node; node = node.parentElement) {
      if (getComputedStyle(node).filter.includes('url(')) return true;
    }
    return false;
  };
  const probe: Probe = {
    freeze() {
      animations = scene().getAnimations({ subtree: true });
      for (const animation of animations) animation.pause();
      return animations.length;
    },
    series(selector, times) {
      const list = nodes(selector);
      const out = list.map(({ label }) => ({ label, values: [] as number[] }));
      for (const t of times) {
        seek(t);
        list.forEach(({ el, pseudo }, i) => out[i]!.values.push(effective(el, pseudo)));
      }
      return out;
    },
    widths(selector, times) {
      const el = scene().querySelector(selector);
      if (!el) throw new Error(`the scene has no ${selector}`);
      return times.map((t) => {
        seek(t);
        return el.getBoundingClientRect().width;
      });
    },
    filteredAfter(after) {
      const top = scene();
      const offenders: string[] = [];
      let later = 0;
      for (const animation of top.getAnimations({ subtree: true })) {
        const effect = animation.effect as KeyframeEffect | null;
        if (!effect?.target) continue;
        const end = Number(effect.getComputedTiming().endTime);
        if (end <= after) continue;
        later += 1;
        if (filtered(effect.target, effect.pseudoElement))
          offenders.push(
            `${(animation as CSSAnimation).animationName} on ${effect.target.className}${effect.pseudoElement ?? ''}`,
          );
      }
      const filteredCount = [...top.querySelectorAll('*')].filter((el) =>
        getComputedStyle(el).filter.includes('url('),
      ).length;
      return { offenders, filtered: filteredCount, later };
    },
  };
  Reflect.set(window, 'burnProbe', probe);
}

/** The probe in the page, one call per question. */
const burn = (page: Page) => ({
  freeze: () => page.evaluate(() => (Reflect.get(window, 'burnProbe') as Probe).freeze()),
  series: (selector: string | null, times: number[]) =>
    page.evaluate(([s, t]) => (Reflect.get(window, 'burnProbe') as Probe).series(s, t), [
      selector,
      times,
    ] as const),
  widths: (selector: string, times: number[]) =>
    page.evaluate(([s, t]) => (Reflect.get(window, 'burnProbe') as Probe).widths(s, t), [
      selector,
      times,
    ] as const),
  filteredAfter: (after: number) =>
    page.evaluate((a) => (Reflect.get(window, 'burnProbe') as Probe).filteredAfter(a), after),
});

const range = (from: number, to: number, step: number): number[] => {
  const out: number[] = [];
  for (let t = from; t <= to; t += step) out.push(t);
  return out;
};

async function openPreview(page: Page, slug: string): Promise<Locator> {
  const coven = await seedCoven(page, `Fixture Coven ${slug}`, `${slug}.test`, { A: 'owner' });
  const spellId = await withSql((sql) =>
    insertSpell(sql, coven.id, 'Fixture Working', 'workspace', coven.users.A, 'complete'),
  );
  await page.addInitScript(() => Reflect.deleteProperty(Navigator.prototype, 'wakeLock'));
  await page.addInitScript(installProbe);
  await page.setViewportSize({ width: DESKTOP_WIDTH, height: 900 });
  await signInAgainAs(page, coven.users.A);
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
  await page.getByRole('button', { name: /^Preview Spell/ }).click();
  const pane = page.getByRole('dialog', { name: 'Fixture Working' });
  await expect(pane).toBeVisible();
  // The precondition for every reading below: the scene is animated, and its clock is now held.
  expect(await burn(page).freeze()).toBeGreaterThan(0);
  return pane;
}

test('the burn grows in over about 3.5s, starting and finishing slowly', async ({ page }) => {
  await openPreview(page, 'burn-growth');
  const [start, late, nearEnd, done, full] = await burn(page).widths(
    '.spell-preview__face-hole',
    [350, 3000, 3150, 4000, 10000],
  );
  expect(full).toBeGreaterThan(0);
  const progress = (width: number | undefined) => (width ?? NaN) / full!;
  // A tenth of the way in, it has burnt less than a tenth; nine tenths in, more than nine tenths.
  expect(progress(start)).toBeLessThan(0.1);
  expect(progress(nearEnd)).toBeGreaterThan(0.9);
  // Still growing at 3s and grown by 4s: about 3.5s.
  expect(progress(late)).toBeLessThan(0.995);
  expect(progress(done)).toBeGreaterThan(0.999);
});

test('nothing that sits on the edge shows before the burn has reached it', async ({ page }) => {
  await openPreview(page, 'burn-edge-waits');
  for (const [kind, selector] of Object.entries(EDGE)) {
    const early = await burn(page).series(selector, range(0, 3000, 50));
    // The positive check: the kind is drawn at all, so an empty list cannot pass for hidden.
    expect.soft(early.length, `${kind}: drawn`).toBeGreaterThan(0);
    const shown = early.filter((s) => Math.max(...s.values) > 0.01).map((s) => s.label);
    expect.soft(shown, `${kind}: showing in the first 3s`).toEqual([]);
    const later = await burn(page).series(selector, range(3500, 20000, 100));
    expect
      .soft(Math.max(0, ...later.flatMap((s) => s.values)), `${kind}: shows once the burn is in`)
      .toBeGreaterThan(0.05);
  }
});

test('once the burn has grown in, heat keeps travelling along the rim', async ({ page }) => {
  await openPreview(page, 'burn-heat-travels');
  const soon = range(6000, 16000, 50);
  const heat = await burn(page).series(EDGE.heat, soon);
  // Travelling means more than one stretch of the rim, lit in turn.
  expect(heat.length).toBeGreaterThan(1);
  const swing = (s: Series) => Math.max(...s.values) - Math.min(...s.values);
  for (const stretch of heat) expect(swing(stretch), stretch.label).toBeGreaterThan(0.2);
  const peaks = heat.map((s) => soon[s.values.indexOf(Math.max(...s.values))]!);
  expect(Math.max(...peaks) - Math.min(...peaks)).toBeGreaterThan(500);
  // And it is still moving a minute later: for as long as the pane is open.
  for (const stretch of await burn(page).series(EDGE.heat, range(60000, 70000, 100)))
    expect(swing(stretch), stretch.label).toBeGreaterThan(0.2);
});

test('no layer jumps when the burn-in hands over to the loops that follow it', async ({ page }) => {
  await openPreview(page, 'burn-no-jump');
  // Every 5ms through the burn-in's end, wherever it falls: a step is a jump only where a smooth change could not
  // cover it in 5ms, and the steepest fade in the scene moves less than 0.03 in that time.
  const times = range(500, 6000, 5);
  const layers = await burn(page).series(null, times);
  expect(layers.length).toBeGreaterThan(0);
  const jumps = layers.flatMap(({ label, values }) => {
    let worst = 0;
    let at = 0;
    for (let i = 1; i < values.length; i++) {
      const step = Math.abs(values[i]! - values[i - 1]!);
      if (step > worst) [worst, at] = [step, times[i]!];
    }
    return worst > 0.05 ? [`${label} by ${worst.toFixed(3)} at ${at}ms`] : [];
  });
  expect(jumps).toEqual([]);
});

test('after the burn-in no animation changes a displacement-filtered layer or its children', async ({
  page,
}) => {
  await openPreview(page, 'burn-filter-still');
  const { offenders, filtered, later } = await burn(page).filteredAfter(4000);
  // The preconditions: the burn tears its edge with the filter, and the scene keeps moving past the burn-in.
  expect(filtered).toBeGreaterThan(0);
  expect(later).toBeGreaterThan(0);
  expect(offenders).toEqual([]);
});
