import type {
  CompendiumValues,
  CupboardChanges,
  CupboardField,
  CupboardOverrides,
  CupboardValues,
  ListFieldName,
  TextField,
} from './types';

// What the form sends: only the fields that changed, each as the new value
// or null for the compendium's. Apart from the component so the rule is read
// in one place (claude-docs/components/cupboard-entry-form.md, "What a save sends").

export const TEXT_FIELDS: readonly TextField[] = ['label', 'description', 'safetyNotes'];
export const LIST_FIELDS: readonly ListFieldName[] = [
  'elements',
  'celestialBodies',
  'zodiacSigns',
  'colors',
];
export const FIELDS: readonly CupboardField[] = [...TEXT_FIELDS, ...LIST_FIELDS];

const isText = (field: CupboardField): field is TextField =>
  (TEXT_FIELDS as readonly string[]).includes(field);

const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((entry, index) => entry === b[index]);

/**
 * What a field shows while the coven says nothing of it: the compendium's
 * value. The label is the exception, blank, since the compendium's name is
 * shown as its placeholder and a typed label is the coven's own word.
 */
export function baselineOf(compendium: CompendiumValues): CupboardValues {
  return {
    label: '',
    description: compendium.description ?? '',
    safetyNotes: compendium.safetyNotes ?? '',
    elements: compendium.elements,
    celestialBodies: compendium.celestialBodies,
    zodiacSigns: compendium.zodiacSigns,
    colors: compendium.colors,
  };
}

/** What the form opens with: the coven's override where it has one, else the baseline. */
export function openingValues(
  baseline: CupboardValues,
  overrides: CupboardOverrides,
): CupboardValues {
  return {
    label: overrides.label ?? baseline.label,
    description: overrides.description ?? baseline.description,
    safetyNotes: overrides.safetyNotes ?? baseline.safetyNotes,
    elements: overrides.elements ?? baseline.elements,
    celestialBodies: overrides.celestialBodies ?? baseline.celestialBodies,
    zodiacSigns: overrides.zodiacSigns ?? baseline.zodiacSigns,
    colors: overrides.colors ?? baseline.colors,
  };
}

/** True when `values` for `field` differ from `other`: text trimmed, lists in order. */
export function differs(field: CupboardField, a: CupboardValues, b: CupboardValues): boolean {
  if (isText(field)) return a[field].trim() !== b[field].trim();
  return !sameList(a[field], b[field]);
}

/**
 * True when the coven is saying something of `field` right now: it holds an
 * override that has not been handed back, or the person has typed one that
 * is not the compendium's own. "Restore Original" is offered for these.
 */
export function isOwn(
  field: CupboardField,
  values: CupboardValues,
  baseline: CupboardValues,
  overrides: CupboardOverrides,
  handedBack: ReadonlySet<CupboardField>,
): boolean {
  if (handedBack.has(field)) return false;
  if (overrides[field] !== null) return true;
  if (isText(field) && values[field].trim() === '') return false;
  return differs(field, values, baseline);
}

/**
 * The fields that changed: null for a field handed back or a text field cleared; a value once it differs from the compendium's (or, if overridden, its own).
 * An emptied list is sent as `[]`: the coven cleared it on purpose.
 * (claude-docs/components/cupboard-entry-form.md, "What a save sends").
 */
export function changesOf(
  values: CupboardValues,
  baseline: CupboardValues,
  overrides: CupboardOverrides,
  handedBack: ReadonlySet<CupboardField>,
): CupboardChanges {
  const changes: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const held = overrides[field];
    if (handedBack.has(field)) {
      if (held !== null) changes[field] = null;
      continue;
    }
    if (isText(field)) {
      const text = values[field].trim();
      const heldText = held as string | null;
      if (held === null) {
        if (text !== '' && text !== baseline[field].trim()) changes[field] = text;
      } else if (text === '') changes[field] = null;
      else if (text !== heldText?.trim()) changes[field] = text;
      continue;
    }
    const list = values[field] as readonly string[];
    if (
      held === null ? !sameList(list, baseline[field]) : !sameList(list, held as readonly string[])
    ) {
      changes[field] = list;
    }
  }
  return changes as CupboardChanges;
}
