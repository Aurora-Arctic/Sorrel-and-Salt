import 'server-only';
import { findOneById, findOneBySlug, withAudit } from '../../../db/repository';
import type { AuditWriter, IngredientFilter } from '../../../db/repository';
import { expireCompendium } from '../../../lib/compendium-cache';
import { NotFound, fieldRefusal } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { slugify } from '../../../lib/slugify';
import { addressTaken, plural } from '../../../lib/text';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { isRowId, parseInput } from '../../../lib/validation';
import { refuseWhileHeld } from './held-entries';
import { refusal, refuseCollidingMoves } from './group-moves';
import type { ZodType, z } from 'zod';
import type {
  CuratedGroup,
  CuratedTable,
  CuratedVocabulary,
  GroupMove,
  GroupTable,
  HeldWording,
  MovedRows,
} from '../types';

// The steps every curated vocabulary's admin write is made of, shared so that how a slug collision, a missing row or a group's move
// is refused is one edit (claude-docs/modules.md, "Shared steps inside a module"). Internal to the module.

/** A write that broke the vocabulary's slug index, as a `ValidationError` on `name` naming the row holding the address; any other error unchanged. */
export async function refuseSlugCollision(
  vocabulary: CuratedVocabulary,
  error: unknown,
  slug: string,
): Promise<never> {
  if (violatedUniqueIndex(error) !== vocabulary.slugIndex) throw error;
  const holder = await findOneBySlug(vocabulary.table, slug);
  throw fieldRefusal(
    'name',
    addressTaken(
      holder ? `"${holder.name}"` : `Another ${vocabulary.noun}`,
      slug,
      `choose another name${vocabulary.addressHint ?? ''}`,
    ),
  );
}

/**
 * @throws {NotFound} none does, an id that is not a uuid included.
 */
export async function liveRow<TTable extends CuratedTable>(
  vocabulary: CuratedVocabulary<TTable>,
  id: string,
): Promise<TTable['$inferSelect']> {
  const row = isRowId(id) ? await findOneById(vocabulary.table, id) : undefined;
  if (!row) throw new NotFound(`No such ${vocabulary.noun}`);
  return row;
}

/**
 * @throws {NotFound} no live row holds the slug.
 */
export async function bySlug<TTable extends CuratedTable>(
  vocabulary: CuratedVocabulary<TTable>,
  slug: string,
): Promise<TTable['$inferSelect']> {
  const row = await findOneBySlug(vocabulary.table, slug);
  if (!row) throw new NotFound(`No such ${vocabulary.noun}`);
  return row;
}

/**
 * Inserts a row under the slug its name gave and expires the compendium cache; `alsoWrite` adds to the same transaction. The caller has
 * checked the curator and parsed the input.
 *
 * @throws {ValidationError} the slug is a live row's, on `name`.
 */
export async function createCurated<TTable extends CuratedTable>(
  session: Session,
  vocabulary: CuratedVocabulary<TTable>,
  fields: object,
  slug: string,
  alsoWrite?: (write: AuditWriter, row: TTable['$inferSelect']) => Promise<void>,
): Promise<TTable['$inferSelect']> {
  const written = await withAudit(session, async (write) => {
    // Widened to the curated tables, as the writer cannot type a write to a generic table; narrowed back on return.
    const [row] = (await write.insert(
      vocabulary.table as CuratedTable,
      {
        ...fields,
        slug,
      } as CuratedTable['$inferInsert'],
    )) as TTable['$inferSelect'][];
    await alsoWrite?.(write, row);
    return row;
  }).catch((error: unknown) => refuseSlugCollision(vocabulary, error, slug));
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a row that no live compendium entry holds, as `held` reads the entries holding it, and expires the compendium cache.
 * The caller has checked the curator.
 *
 * @throws {Forbidden} a live entry holds the row.
 * @throws {NotFound} no live row has this id.
 */
export async function deleteCurated<TTable extends CuratedTable>(
  session: Session,
  vocabulary: CuratedVocabulary<TTable>,
  id: string,
  held: (row: TTable['$inferSelect']) => { filter: IngredientFilter; wording: HeldWording },
): Promise<void> {
  const row = await liveRow(vocabulary, id);
  const { filter, wording } = held(row);
  await refuseWhileHeld(filter, wording);

  await withAudit(session, async (write) => {
    const [deleted] = await write.softDeleteByIds(vocabulary.table as CuratedTable, [id]);
    if (!deleted) throw new NotFound(`No such ${vocabulary.noun}`);
  });
  expireCompendium();
}

export async function parseUnderLiveParent<
  Schema extends ZodType<Record<Column, string>>,
  Column extends string,
>(
  schema: Schema,
  input: unknown,
  parent: { table: GroupTable; column: Column; refusal: string },
): Promise<{ fields: z.output<Schema>; parent: GroupTable['$inferSelect'] }> {
  const fields = parseInput(schema, input);
  const row = await findOneById(parent.table, fields[parent.column]);
  if (!row) {
    throw fieldRefusal(parent.column, parent.refusal);
  }
  return { fields, parent: row };
}

export async function moveTarget<TTable extends GroupTable>(
  group: CuratedGroup<TTable>,
  id: string,
  moveTo: string | undefined,
  count: number,
): Promise<TTable['$inferSelect']> {
  const them = `${count} ${plural(count, group.members.noun, group.members.nouns)}`;
  if (moveTo === undefined) {
    throw fieldRefusal('moveTo', `Choose a ${group.noun} to move its ${them} to`);
  }
  const target =
    moveTo !== id && isRowId(moveTo) ? await findOneById(group.table, moveTo) : undefined;
  if (!target) {
    throw fieldRefusal('moveTo', `Choose another live ${group.noun} to move its ${them} to`);
  }
  return target;
}

/**
 * Rewrites a group whole, its slug following the name, and on a rename the slug of every live row under it whose slug carries the
 * group's name (claude-docs/modules.md, "Shared steps inside a module").
 *
 * @throws {ValidationError} a move onto another row's address, or the group's own slug is a live group's.
 * @throws {NotFound} no live group has this id.
 */
export async function updateGroup<TTable extends GroupTable>(
  session: Session,
  group: CuratedGroup<TTable>,
  id: string,
  fields: { name: string } & Partial<TTable['$inferInsert']>,
): Promise<TTable['$inferSelect']> {
  const { members } = group;
  const current = await liveRow(group, id);
  const slug = slugify(fields.name);
  const moves =
    current.name === fields.name || !members.slugOf
      ? []
      : movedUnder(members, await members.under(id), fields.name);
  const refuse = refusal(
    members,
    ['name'],
    (row) => `Renaming the ${group.noun} would move "${row.name}" to`,
  );
  await refuseCollidingMoves(members, moves, refuse);

  return withAudit(session, async (write) => {
    // Widened to the three group tables, as the writer cannot type a write to a generic table; narrowed back on return.
    const [row] = await write.updateById(group.table as GroupTable, id, { ...fields, slug });
    if (!row) throw new NotFound(`No such ${group.noun}`);
    for (const { row: member, slug: moved } of moves) {
      await write.updateById(members.table, member.id, { slug: moved });
    }
    return row as TTable['$inferSelect'];
  }).catch(async (error: unknown) => {
    await refuseCollidingMoves(members, moves, refuse, error);
    return refuseSlugCollision(group, error, slug);
  });
}

/**
 * Soft-deletes a group, first moving its live rows to the group `moveTo` names (claude-docs/modules.md, "Shared steps inside a module").
 *
 * @throws {ValidationError} on `moveTo`, a missing target, or a row that would move onto another row's address.
 * @throws {NotFound} no live group has this id.
 */
export async function deleteGroup(
  session: Session,
  group: CuratedGroup,
  id: string,
  moveTo: string | undefined,
): Promise<void> {
  const { members } = group;
  await liveRow(group, id);
  const under = await members.under(id);
  const target = under.length > 0 ? await moveTarget(group, id, moveTo, under.length) : undefined;
  const moves = target ? movedUnder(members, under, target.name) : [];
  const refuse = refusal(members, ['moveTo'], (row) => `Moving "${row.name}" would give it`);
  await refuseCollidingMoves(members, moves, refuse);

  await withAudit(session, async (write) => {
    for (const { row, slug } of moves) {
      const values = { [members.parentColumn]: target?.id, ...(members.slugOf && { slug }) };
      await write.updateById(members.table, row.id, values);
    }
    const [row] = await write.softDeleteByIds(group.table, [id]);
    if (!row) throw new NotFound(`No such ${group.noun}`);
  }).catch(async (error: unknown) => {
    await refuseCollidingMoves(members, moves, refuse, error);
    throw error;
  });
}

function movedUnder(
  members: MovedRows,
  rows: readonly GroupMove['row'][],
  groupName: string,
): GroupMove[] {
  return rows.map((row) => ({
    row,
    slug: members.slugOf ? members.slugOf(row.name, groupName) : row.slug,
  }));
}
