import 'server-only';
import type { z } from 'zod';
import {
  type CompendiumScore,
  findCompendiumCount,
  findCompendiumEntryByIdentity,
  findCompendiumPage,
  findOneIngredient,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { ingredientSlug } from '../../../lib/slugify';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { ingredients } from '../schema/ingredients';
import { CompendiumFilter, type CompendiumFilterInput } from '../validation/compendium-filter';
import { CompendiumIngredientInput } from '../validation/ingredient';
import {
  type IngredientFields,
  addFolkNames,
  columnsOf,
  replaceFolkNames,
} from './ingredient-rows';
import { type Membership, assertMembership } from '@/modules/coven';
import { assertSiteAdmin } from '@/modules/identity';

// The compendium: the public surface (MB.80), so the list takes no session at
// all and an entry answers anyone (claude-docs/db.md, "The compendium read");
// and its writes, which are the site admin's alone and reach no coven's rows
// (claude-docs/db.md, "Compendium writes").

export type IngredientRow = typeof ingredients.$inferSelect;

/** What a write parses: the admin form's values, or a mutation's input. */
type CompendiumValues = z.input<typeof CompendiumIngredientInput>;

/**
 * One page of the compendium under `filter`, best match first on a search,
 * each entry carrying its score. Parsed here because the browser is not the
 * only caller, and because a category id reaches a `uuid` comparison inside
 * the keyset query, whose one client text was the cursor: unchecked, a
 * malformed id would come back as "Invalid cursor". A query shorter than
 * `MIN_QUERY_LENGTH` is no search.
 *
 * @throws {ValidationError} a category id is not a uuid.
 */
export async function listCompendium(
  filter: CompendiumFilterInput,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, CompendiumScore>[]> {
  return findCompendiumPage(parseInput(CompendiumFilter, filter), page);
}

/**
 * How many entries the compendium holds under `filter`, and how many come
 * before `start` — a page's first row, none on an empty page. Parsed as
 * `listCompendium` parses, so it counts the rows that list's pages hold.
 *
 * @throws {ValidationError} a category id is not a uuid.
 */
export async function countCompendium(
  filter: CompendiumFilterInput,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findCompendiumCount(parseInput(CompendiumFilter, filter), start);
}

/**
 * One ingredient by id: a compendium entry for anyone, signed out included,
 * and — with `workspaceId` — that coven's own entry for its members, viewers
 * included. Without a coven the read is the compendium alone, so a coven's
 * row answers `NotFound` to whoever asks: its existence is private.
 *
 * @throws {Forbidden} a coven is named and the caller is not in it, a site
 * admin and a signed-out caller included.
 * @throws {NotFound} no such entry where the caller may look.
 */
export async function getIngredient(
  session: Session | null,
  id: string,
  workspaceId?: string | null,
): Promise<IngredientRow> {
  const memberships: Membership[] = [];
  if (workspaceId != null) {
    if (!session) throw new Forbidden();
    memberships.push(await assertMembership(session, workspaceId, { ingredient: ['read'] }));
  }

  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  const row = RowId.safeParse(id).success ? await findOneIngredient(memberships, id) : undefined;
  if (!row) throw new NotFound('No such ingredient');
  return row;
}

/**
 * Creates a compendium entry, with its folk names, in one transaction. The
 * slug is set here from the label, the form and the formal name.
 *
 * @throws {Forbidden} the caller is not a site admin — checked before the
 * input is read.
 * @throws {ValidationError} the input breaks `CompendiumIngredientInput` — a
 * missing `nomenclature` included — or collides with another entry.
 */
export async function createCompendiumEntry(
  session: Session,
  input: CompendiumValues,
): Promise<IngredientRow> {
  const admin = assertSiteAdmin(session);
  const { folkNames, ...fields } = parseInput(CompendiumIngredientInput, input);

  const slug = ingredientSlug(fields.name, fields.form, fields.canonicalName);

  return withAudit(session, async (write) => {
    const [row] = await write.insertInCompendium(admin, ingredients, {
      ...columnsOf(fields),
      slug,
    });
    await addFolkNames(write, row.id, folkNames ?? []);
    return row;
  }).catch((error: unknown) => refuseCollision(error, fields, slug));
}

/**
 * Replaces a compendium entry with `input` — the whole entry as the form
 * submits it, so a field left out is cleared — and its folk names with
 * `input.folkNames`, in one transaction. The slug is left as it was.
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} the input breaks `CompendiumIngredientInput`, or
 * collides with another entry.
 * @throws {NotFound} no live compendium entry has this id — a coven's
 * ingredient included, and an id that is not one.
 */
export async function updateCompendiumEntry(
  session: Session,
  id: string,
  input: CompendiumValues,
): Promise<IngredientRow> {
  const admin = assertSiteAdmin(session);
  const { folkNames, ...fields } = parseInput(CompendiumIngredientInput, input);
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(id).success) throw new NotFound('No such compendium entry');

  return withAudit(session, async (write) => {
    const [row] = await write.updateByIdInCompendium(admin, ingredients, id, columnsOf(fields));
    if (!row) throw new NotFound('No such compendium entry');
    await replaceFolkNames(write, [], id, folkNames ?? []);
    return row;
  }).catch((error: unknown) => refuseCollision(error, fields));
}

/**
 * Soft-deletes a compendium entry, stamping who deleted it. Its folk names
 * and category links stay: nothing reads them past a deleted parent.
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {NotFound} no live compendium entry has this id — one already
 * deleted, a coven's ingredient, and an id that is not one included.
 */
export async function deleteCompendiumEntry(session: Session, id: string): Promise<void> {
  const admin = assertSiteAdmin(session);
  if (!RowId.safeParse(id).success) throw new NotFound('No such compendium entry');

  await withAudit(session, async (write) => {
    const [row] = await write.softDeleteByIdInCompendium(admin, ingredients, id);
    if (!row) throw new NotFound('No such compendium entry');
  });
}

/**
 * A write that broke one of the compendium's unique indexes, as a
 * `ValidationError` on the field that caused it; any other error unchanged.
 * An identity collision names the entry holding the identity, read after the
 * write rolled back: a label with no formal name keys as another entry's
 * formal name (DESIGN.md §5), so the input alone would not say which entry
 * that is. That collision is reported on `name`, the field the admin filled
 * in. `slug` is the one this write set — an update sets none.
 */
async function refuseCollision(
  error: unknown,
  fields: IngredientFields,
  slug?: string,
): Promise<never> {
  const refuse = (path: string, message: string) => {
    throw new ValidationError([{ path: [path], message }]);
  };

  switch (violatedUniqueIndex(error)) {
    case 'ingredients_compendium_identity_unique': {
      const holder = await findCompendiumEntryByIdentity(fields);
      refuse(
        fields.canonicalName == null ? 'name' : 'canonicalName',
        holder
          ? `Already in the compendium as ${describeEntry(holder)}`
          : 'Already in the compendium',
      );
      break;
    }
    case 'ingredients_compendium_slug_unique':
      refuse(
        'name',
        `Another compendium entry already has the address "${slug}" — change the name, form or formal name`,
      );
  }
  throw error;
}

/** An entry as a person tells it apart: its label, then its formal name and form. */
function describeEntry(entry: IngredientRow): string {
  const identity = [entry.canonicalName, entry.form].filter(Boolean).join(', ');
  return identity ? `"${entry.name}" (${identity})` : `"${entry.name}"`;
}
