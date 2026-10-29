import 'server-only';
import { cache } from 'react';
import type {
  CompendiumCategoryChoice,
  CompendiumListForm,
} from '../components/CompendiumList/types';
import type { CardCategory } from '../components/IngredientCard/types';
import type { SafetyVariant } from '../components/SafetyNote/types';
import { NotFound } from '../lib/errors';
import { readNumberedPage } from '../lib/numbered-page';
import { DEFAULT_PAGE_SIZE, allPages } from '../lib/pagination';
import type { Session } from '../lib/session';

import {
  compendiumFacets,
  compendiumFacetsHeldIn,
  categoriesOf,
  countCompendium,
  countCompendiumHeldIn,
  getIngredient,
  listCompendium,
  listCompendiumHeldIn,
  readCompendiumEntry,
  variantsOf,
} from '@/modules/ingredients';
import type { CovenPick } from '@/modules/ingredients';
import {
  categoryGroupsOf,
  formChoicesOf,
  formGroupsOf,
  listCategories,
  listDeities,
  listDeityTraditions,
  listIngredientFormValues,
} from '@/modules/vocabulary';
import type { IngredientDetail, IngredientKey } from '@/modules/ingredients';
import type { CovenMembership } from '@/modules/coven';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

// The reads the compendium's two list pages share: the admin's table and the public cards. Each is a
// service read with no session, held in the data cache under the `compendium` tag by the service and
// wrapped in React's `cache` so a second call in one request reads once. The list and its counts take
// the viewer only for the review filter, which the service lets a curator alone ask for: the admin
// page passes its session, the public page none.

// The page and GraphQL's `compendium` end at the same service, paged by the same helper (rules 1 and
// 8). Keyed by primitives rather than a filter object: the filter as the parameter table's variables
// written as JSON, so a new filter changes no line here (src/components/CompendiumList/params.ts).
export const readCompendium = cache(
  async (
    variables: string,
    after: string | undefined,
    before: string | undefined,
    // The admin table pages by the default; the public cards by `CARD_PAGE_SIZE`.
    size: number = DEFAULT_PAGE_SIZE,
    viewer: Session | null = null,
  ) => {
    // Written by this page from the table a few lines below, and checked again by the service.
    const filter: Parameters<typeof listCompendium>[0] = JSON.parse(variables);
    // "Page X of Y", counted from the page's first row (src/lib/pagination.ts).
    const page = await readNumberedPage(
      { after, before },
      (request) => listCompendium(filter, request, viewer),
      (start) => countCompendium(filter, start, viewer),
      size,
    );
    return withForms(page);
  },
);

/**
 * `readCompendium` narrowed to the entries the viewer's picked covens hold: the `covenIds` in
 * `variables` (In My Covens), read with the session, which proves each coven or drops it, and
 * `covensNot` (Not In). Per viewer, so never in the data cache (rule 6); the page reads it only
 * with a coven picked or Not In, and a session, and `readCompendium` otherwise.
 */
export const readCompendiumHeldIn = cache(
  async (
    session: Session,
    variables: string,
    after: string | undefined,
    before: string | undefined,
    size: number = DEFAULT_PAGE_SIZE,
  ) => {
    const { covens, filter } = heldInOf(variables);
    const page = await readNumberedPage(
      { after, before },
      (request) => listCompendiumHeldIn(session, covens, filter, request),
      (start) => countCompendiumHeldIn(session, covens, filter, start),
      size,
    );
    return withForms(page);
  },
);

/** The page's variables as the held-in reads take them: the picked covens and Not In apart from the rest. */
function heldInOf(variables: string): {
  covens: CovenPick;
  filter: Parameters<typeof listCompendium>[0];
} {
  const {
    covenIds = [],
    covensNot,
    ...filter
  } = JSON.parse(variables) as Parameters<typeof listCompendium>[0] & {
    covenIds?: readonly string[];
    covensNot?: boolean;
  };
  return { covens: covensNot ? { covenIds, covensNot } : { covenIds }, filter };
}

/** A page of entries with each one's live forms and their icons, for the table and the cards. */
async function withForms<Page extends { edges: readonly { node: { id: string } }[] }>(page: Page) {
  // Each entry's live forms, for the Form column: one batch for the page, through the read
  // `Ingredient.variants` resolves through.
  const forms = await variantsOf(
    null,
    page.edges.map(({ node }) => ({ id: node.id, workspaceId: null })),
  );
  const variants = forms.map((answer) => {
    // A compendium ref is never refused.
    if (answer instanceof Error) throw answer;
    return answer;
  });
  // Each form's icon is its curated form's group's: two batches for the
  // page, as `IngredientVariant.formChoice` reads them. A form that is
  // only text, or whose form or group is retired, has none.
  const choices = await formChoicesOf(variants.flat().flatMap(({ formId }) => formId ?? []));
  const live = choices.flatMap((choice) => choice ?? []);
  const groups = await formGroupsOf(live.map((choice) => choice.groupId));
  const iconOfForm = new Map(
    live.map((choice, i) => {
      const group = groups[i];
      return [choice.id, group === undefined || group instanceof Error ? null : group.icon];
    }),
  );
  return {
    ...page,
    // The same forms for the public card, which wears the icon, the flag and the notes of each.
    variants: variants.map((own) =>
      own.map(({ form, formId, toxic, safetyNotes }): SafetyVariant => {
        const icon = (formId && iconOfForm.get(formId)) || null;
        return { form, toxic, safetyNotes, formChoice: icon ? { group: { icon } } : null };
      }),
    ),
    forms: variants.map((own) =>
      own.map(({ form, formId }): CompendiumListForm => ({
        name: form,
        icon: (formId && iconOfForm.get(formId)) || null,
      })),
    ),
  };
}

/**
 * The group icon each curated form wears, by the form's name folded to lower case, for the Form
 * filter's choices. Read page by page: the curated lists read their few groups as one page of the
 * maximum (`allGroups`, `value-kinds.ts`), but 84 forms are seeded against `MAX_PAGE_SIZE`'s 100
 * and an admin adds more. Two live forms may share a name in different groups; the filter matches
 * the folded text, so the first one's icon stands for that name. A form whose group is retired or
 * has no icon is left out and draws the generic. Cached, so the request reads them once.
 */
export const readFormIcons = cache(async (): Promise<Map<string, FormGroupIcon>> => {
  const forms = await allPages((page) => listIngredientFormValues({}, page));
  const groups = await formGroupsOf([...new Set(forms.map(({ groupId }) => groupId))]);
  const iconOfGroup = new Map(
    groups.flatMap((group) =>
      group instanceof Error || !group.icon ? [] : [[group.id, group.icon]],
    ),
  );
  const icons = new Map<string, FormGroupIcon>();
  for (const { name, groupId } of forms) {
    const icon = iconOfGroup.get(groupId);
    const folded = name.toLocaleLowerCase();
    if (icon && !icons.has(folded)) icons.set(folded, icon);
  }
  return icons;
});

/**
 * Every live deity with its tradition's name, by id and the slug the address names it by, for the
 * Deities filter. The tradition tells two gods of one name apart (`hecate-greek`, `hecate-roman`).
 * Read page by page, as the forms are; public reference data, so no session.
 */
export const readDeities = cache(async () => {
  const [rows, traditions] = await Promise.all([
    allPages((page) => listDeities({}, page)),
    allPages((page) => listDeityTraditions(page)),
  ]);
  const traditionName = new Map(traditions.map(({ id, name }) => [id, name]));
  return rows.flatMap(({ id, slug, name, traditionId }) => {
    const tradition = traditionName.get(traditionId);
    // A deity lists only under a live tradition, so this is a race with a delete.
    return tradition === undefined ? [] : [{ id, slug, name, tradition }];
  });
});

/**
 * Every live category with its group's name and colours, for the Categories box, and the slugs the
 * address names them by. Read page by page, as the forms are, since one page of the maximum is not
 * guaranteed to hold them all. Public reference data, held in the data cache by the services;
 * `cache` here only keeps the request to one read.
 */
export const readCategories = cache(async (): Promise<CompendiumCategoryChoice[]> => {
  const rows = await allPages((page) => listCategories({}, page));
  const groups = await categoryGroupsOf([...new Set(rows.map(({ groupId }) => groupId))]);
  const byId = new Map(
    groups.flatMap((group) => (group instanceof Error ? [] : [[group.id, group]])),
  );
  return rows.flatMap(({ id, slug, name, description, groupId }) => {
    const group = byId.get(groupId);
    // A category lists only under a live group, so this is a race with a delete.
    if (!group) return [];
    const { colorDark, colorLight } = group;
    return [
      {
        id,
        slug,
        name,
        description,
        group: { id: group.id, name: group.name, colorDark, colorLight },
      },
    ];
  });
});

// How many entries each filter's choices would list, for the filter as the address holds it:
// public, like the list, and keyed by the same JSON of variables so a second render in the request
// reads once. The service holds it in the data cache under the `compendium` tag.
export const readFacets = cache(async (variables: string, viewer: Session | null = null) => {
  const filter: Parameters<typeof compendiumFacets>[0] = JSON.parse(variables);
  return compendiumFacets(filter, viewer);
});

/**
 * `readFacets` beside `readCompendiumHeldIn`: each count only over the entries the picked covens
 * hold. Per viewer, so never in the data cache; `readFacets` with no coven picked.
 */
export const readFacetsHeldIn = cache(async (session: Session, variables: string) => {
  const { covens, filter } = heldInOf(variables);
  return compendiumFacetsHeldIn(session, covens, filter);
});

/**
 * The categories each of a page's entries is filed under, as a card's chips: one batch for the
 * page, each with its group's colours from `readCategories`. A category whose group has gone, a
 * race with a delete, is left out. Read for `session`, or with none for the public compendium; a
 * ref naming a coven the session is not in throws its `Forbidden`. `heldBy` is the coven's proof,
 * which admits a retired entry its cupboard still names.
 */
export async function readCardCategoriesOf(
  session: Session | null,
  refs: readonly IngredientKey[],
  heldBy?: CovenMembership['membership'],
): Promise<CardCategory[][]> {
  const [answers, known] = await Promise.all([
    categoriesOf(session, refs, heldBy),
    readCategories(),
  ]);
  const byId = new Map(known.map((category) => [category.id, category]));
  return answers.map((answer) => {
    if (answer instanceof Error) throw answer;
    return answer.flatMap(({ id }) => {
      const category = byId.get(id);
      return category ? [{ category: { id, name: category.name }, group: category.group }] : [];
    });
  });
}

/** `readCardCategoriesOf` for compendium entries by id, signed out: public reference data. */
export function readCardCategories(ids: readonly string[]): Promise<CardCategory[][]> {
  return readCardCategoriesOf(
    null,
    ids.map((id) => ({ id, workspaceId: null })),
  );
}

/**
 * The details a card's Quick Look opens over the public cards, `?entry=<id>`: the entry as its
 * public page reads it, through that page's cached read, so every viewer sees the compendium alike
 * and no session is asked for (rule 6). The id is read first, with no session, which names a live
 * compendium entry alone. Undefined for an id that names none, a coven's own entry included, since
 * its existence is private: the page then opens nothing.
 */
export const readCompendiumDetails = cache(
  async (id: string): Promise<IngredientDetail | undefined> => {
    try {
      const { slug } = await getIngredient(null, id);
      const page = await readCompendiumEntry(slug);
      return page.kind === 'entry' ? page.detail : undefined;
    } catch (error) {
      if (error instanceof NotFound) return undefined;
      throw error;
    }
  },
);
