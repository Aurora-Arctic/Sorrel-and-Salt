import { fold } from '../../../lib/text';
import type {
  CorrespondenceLists,
  CorrespondenceStep,
  Sourced,
  SpellCorrespondences,
} from '../types';

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

const LIST_KEYS: readonly (keyof CorrespondenceLists)[] = [
  'elements',
  'celestialBodies',
  'zodiacSigns',
  'colors',
];

/** Each value once, in the first spelling met and the order met, beside the labels of the steps that gave it. */
export function combineCorrespondences(steps: readonly CorrespondenceStep[]): SpellCorrespondences {
  const listCollectors = {
    elements: collector<string>(),
    celestialBodies: collector<string>(),
    zodiacSigns: collector<string>(),
    colors: collector<string>(),
  };
  const deities = collector<SpellCorrespondences['deities'][number]['value']>();

  for (const { label, lists, deities: named } of steps) {
    for (const key of LIST_KEYS) {
      for (const list of lists) {
        for (const value of list[key] ?? []) {
          if (fold(value) !== '') listCollectors[key].add(fold(value), value, label);
        }
      }
    }
    for (const { deityId, detail } of named) {
      // A linked deity is one deity however it is named; a typed one is matched by its name.
      deities.add(deityId ? `id:${deityId}` : `name:${fold(detail.name)}`, detail, label);
    }
  }

  return {
    elements: listCollectors.elements.rows(),
    celestialBodies: listCollectors.celestialBodies.rows(),
    zodiacSigns: listCollectors.zodiacSigns.rows(),
    colors: listCollectors.colors.rows(),
    deities: deities.rows(),
  };
}
