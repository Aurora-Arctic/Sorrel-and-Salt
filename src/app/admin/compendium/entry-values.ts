import 'server-only';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { citationText } from '@/lib/citation';
import {
  type IngredientRow,
  categoriesOf,
  deitiesOf,
  folkNamesOf,
  referencesOf,
  substitutesOf,
} from '@/modules/ingredients';
import { deityTraditionsOf, formChoicesOf, formGroupsOf } from '@/modules/vocabulary';

// A compendium entry as the form edits it: every value and link the form
// shows, read on the navigation through the services the GraphQL `Ingredient`
// resolves through, so the page needs no browser read to open the modal
// (CLAUDE.md rule 1). Each read is a loader's batch of one, with no session:
// a compendium entry answers anyone (MB.80).

/** A batch answer for one ref, which a compendium ref is never refused. */
function only<T>([answer]: readonly (T | Error)[]): T {
  if (answer === undefined || answer instanceof Error) throw answer ?? new Error('No answer');
  return answer;
}

/** The name of a group or tradition, or null once it is gone. */
const nameOf = (group: { name: string } | Error | undefined): string | null =>
  group === undefined || group instanceof Error ? null : group.name;

export async function entryValues(entry: IngredientRow): Promise<IngredientFormValues> {
  const refs = [{ id: entry.id, workspaceId: null }];
  const [folkNames, categories, substitutes, deities, references, [form]] = await Promise.all([
    folkNamesOf(null, refs).then(only),
    categoriesOf(null, refs).then(only),
    substitutesOf(null, refs).then(only),
    deitiesOf(null, refs).then(only),
    referencesOf(null, refs).then(only),
    formChoicesOf(entry.formId ? [entry.formId] : []),
  ]);
  const picked = deities.flatMap(({ deity }) => deity ?? []);
  const [traditions, [formGroup]] = await Promise.all([
    deityTraditionsOf(picked.map((deity) => deity.traditionId)),
    form ? formGroupsOf([form.groupId]) : Promise.resolve([]),
  ]);
  const traditionOf = new Map(picked.map((deity, i) => [deity.id, nameOf(traditions[i])]));

  return {
    ...EMPTY_VALUES,
    name: entry.name,
    nomenclature: entry.nomenclature,
    canonicalName: entry.canonicalName ?? '',
    form: entry.form ?? '',
    // A pick whose form or group has since been retired reads as its text,
    // as `Ingredient.formChoice` does.
    formLink: form
      ? { id: form.id, name: form.name, group: nameOf(formGroup), description: form.description }
      : null,
    folkNames: folkNames.map((value) => ({ value })),
    description: entry.description ?? '',
    elements: entry.elements ?? [],
    planets: (entry.planets ?? []).map((value) => ({ value })),
    zodiacSigns: (entry.zodiacSigns ?? []).map((value) => ({ value })),
    colors: (entry.colors ?? []).map((value) => ({ value })),
    deities: deities.map(({ name, deity }) =>
      deity
        ? {
            value: name,
            link: {
              id: deity.id,
              tradition: traditionOf.get(deity.id) ?? null,
              description: deity.description,
            },
          }
        : { value: name },
    ),
    substitutes: substitutes.map(({ name, ingredient }) =>
      ingredient
        ? {
            value: name,
            link: {
              id: ingredient.id,
              canonicalName: ingredient.canonicalName,
              form: ingredient.form,
              description: ingredient.description,
              isGlobal: ingredient.workspaceId === null,
            },
          }
        : { value: name },
    ),
    safetyNotes: entry.safetyNotes ?? '',
    references: references.map(({ reference, locator }) => ({
      value: citationText(reference),
      link: { id: reference.id, isGlobal: reference.workspaceId === null },
      locator: locator ?? '',
    })),
    categoryIds: categories.map((category) => category.id),
  };
}
