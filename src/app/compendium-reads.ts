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
import { formLabel } from '@/modules/ingredients/validation/form-label';

import {
  compendiumFacets,
  compendiumFacetsHeldIn,
  cardCategoriesOf,
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

// The reads the admin's compendium table and the public cards share: sessionless service reads held in
// the data cache under the `compendium` tag, wrapped in React's `cache` for one read per request. Only
// the review filter takes the viewer, which the service lets a curator alone ask for.

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
 * `readCompendium` narrowed to the entries the picked covens hold (In My Covens) or none of (Not
 * In), read with the session, which proves each coven. Per viewer, so never data-cached (rule 6).
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
 * The group icon each curated form wears, by lower-cased name, for the Form filter. Read page by
 * page, as 84 seeded forms exceed `MAX_PAGE_SIZE`; where two forms share a name, the first's icon
 * stands. A form with no icon or a retired group draws the generic.
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
 * Every live deity with its tradition's name, by id and slug, for the Deities filter; the tradition
 * tells `hecate-greek` from `hecate-roman`. Read page by page; public, so no session.
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
 * Every live category with its group's name and colours, and its slug, for the Categories box. Read
 * page by page; public, data-cached by the services, and `cache` keeps the request to one read.
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

/** `readFacets` over the entries the picked covens hold. Per viewer, so never data-cached. */
export const readFacetsHeldIn = cache(async (session: Session, variables: string) => {
  const { covens, filter } = heldInOf(variables);
  return compendiumFacetsHeldIn(session, covens, filter);
});

/**
 * The categories each of a page's entries shows as a card's chips, with group colours: its own, then those only its live
 * forms carry, each beside those forms as the screen names them. One batch for the page. A category whose group is gone is left out. A ref naming a coven the session
 * is not in throws `Forbidden`; `heldBy` admits a retired entry its cupboard still names.
 */
export async function readCardCategoriesOf(
  session: Session | null,
  refs: readonly IngredientKey[],
  heldBy?: CovenMembership['membership'],
): Promise<CardCategory[][]> {
  const [answers, known] = await Promise.all([
    cardCategoriesOf(session, refs, heldBy),
    readCategories(),
  ]);
  const byId = new Map(known.map((category) => [category.id, category]));
  return answers.map((answer) => {
    if (answer instanceof Error) throw answer;
    return answer.flatMap(({ category: { id }, forms }): CardCategory[] => {
      const category = byId.get(id);
      if (!category) return [];
      const chip = { category: { id, name: category.name }, group: category.group };
      return [forms.length > 0 ? { ...chip, forms: forms.map(formLabel) } : chip];
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
 * The details a card's Quick Look opens over the public cards, `?entry=<id>`, through the public
 * page's cached read and no session (rule 6). Undefined for an id naming no compendium entry,
 * a coven's own included, as its existence is private.
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
