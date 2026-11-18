import type { CorrespondenceStep, Sourced, SpellCorrespondences } from '../types';

const fold = (value: string): string => value.trim().toLowerCase();

function collector<T>() {
  const found = new Map<string, Sourced<T>>();
  return {
    add(key: string, value: T, label: string): void {
      const held = found.get(key);
      if (!held) found.set(key, { value, sources: [label] });
      else if (!held.sources.includes(label)) held.sources.push(label);
    },
    rows: (): Sourced<T>[] => [...found.values()],
  };
}

/** Each value once, in the first spelling met and the order met, beside the labels of the steps that gave it. */
export function combineCorrespondences(steps: readonly CorrespondenceStep[]): SpellCorrespondences {
  const elements = collector<string>();
  const celestialBodies = collector<string>();
  const zodiacSigns = collector<string>();
  const colors = collector<string>();
  const deities = collector<SpellCorrespondences['deities'][number]['value']>();
  const lists = { elements, celestialBodies, zodiacSigns, colors };

  for (const { label, lists: held, deities: named } of steps) {
    for (const own of held) {
      for (const [key, target] of Object.entries(lists) as [
        keyof typeof lists,
        typeof elements,
      ][]) {
        for (const value of own[key] ?? []) {
          if (fold(value) !== '') target.add(fold(value), value, label);
        }
      }
    }
    for (const { deityId, detail } of named) {
      // A linked deity is one deity however it is named; a typed one is matched by its name.
      deities.add(deityId ? `id:${deityId}` : `name:${fold(detail.name)}`, detail, label);
    }
  }

  return {
    elements: elements.rows(),
    celestialBodies: celestialBodies.rows(),
    zodiacSigns: zodiacSigns.rows(),
    colors: colors.rows(),
    deities: deities.rows(),
  };
}
