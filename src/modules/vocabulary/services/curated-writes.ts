import 'server-only';
import { findOneById, findOneBySlug, withAudit } from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { slugify } from '../../../lib/slugify';
import { addressTaken, plural } from '../../../lib/text';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { refusal, refuseCollidingMoves } from './group-moves';
import type { ZodType, z } from 'zod';
import type {
  CuratedGroup,
  CuratedTable,
  CuratedVocabulary,
  GroupMove,
  GroupTable,
  MovedRows,
} from '../types';

// The steps every curated vocabulary's admin write is made of, written once so
// that how a slug collision, a missing row or a group's move is refused is one
// edit across the seven services (MB.210). Shared steps rather than a
// descriptor factory, on the owner's call: each service keeps its own exported
// functions and JSDoc, and its own `assertSiteAdmin(` and `expireCompendium()`,
// which tests/guards/compendium-expiry.test.ts reads it for. Internal to the
// module; the index exports no part of it.

/**
 * A write that broke the vocabulary's slug index, as a `ValidationError` on
 * `name` — the slug is derived and has no field of its own (MB.43) — naming
 * the row holding the address; any other error unchanged.
 */
export async function refuseSlugCollision(
  vocabulary: CuratedVocabulary,
  error: unknown,
  slug: string,
): Promise<never> {
  if (violatedUniqueIndex(error) !== vocabulary.slugIndex) throw error;
  const holder = await findOneBySlug(vocabulary.table, slug);
  throw new ValidationError([
    {
      path: ['name'],
      message: addressTaken(
        holder ? `"${holder.name}"` : `Another ${vocabulary.noun}`,
        slug,
        `choose another name${vocabulary.addressHint ?? ''}`,
      ),
    },
  ]);
}

/**
 * The live row `id` names in the vocabulary.
 *
 * @throws {NotFound} none does — an id that is not a uuid included, which
 * names nothing and would be a driver error at the comparison.
 */
export async function liveRow<TTable extends CuratedTable>(
  vocabulary: CuratedVocabulary<TTable>,
  id: string,
): Promise<TTable['$inferSelect']> {
  const row = RowId.safeParse(id).success ? await findOneById(vocabulary.table, id) : undefined;
  if (!row) throw new NotFound(`No such ${vocabulary.noun}`);
  return row;
}

/**
 * The input parsed, its group checked live — a foreign key admits a retired
 * one — and the group, whose name a form's or a deity's slug carries. The
 * refusal is the input schema's own words for a missing group, on its field.
 */
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
    throw new ValidationError([{ path: [parent.column], message: parent.refusal }]);
  }
  return { fields, parent: row };
}

/**
 * The live group a delete's `count` rows move to, or the refusal on `moveTo`
 * when none is named, or it names the group itself or no other live group.
 * On `moveTo`, beside the picker that names it.
 */
export async function moveTarget<TTable extends GroupTable>(
  group: CuratedGroup<TTable>,
  id: string,
  moveTo: string | undefined,
  count: number,
): Promise<TTable['$inferSelect']> {
  const them = `${count} ${plural(count, group.members.noun, group.members.nouns)}`;
  if (moveTo === undefined) {
    throw new ValidationError([
      { path: ['moveTo'], message: `Choose a ${group.noun} to move its ${them} to` },
    ]);
  }
  const target =
    moveTo !== id && RowId.safeParse(moveTo).success
      ? await findOneById(group.table, moveTo)
      : undefined;
  if (!target) {
    throw new ValidationError([
      { path: ['moveTo'], message: `Choose another live ${group.noun} to move its ${them} to` },
    ]);
  }
  return target;
}

/**
 * Rewrites a group whole, its slug following the name, and on a rename the
 * slug of every live row under it whose slug carries the group's name, in the
 * same transaction; a category's carries none, so a category group's rename
 * moves nothing. A move onto another row's address is refused on `name`,
 * naming both, before the write and again after one the index refused.
 *
 * @throws {ValidationError} as above, or the group's own slug is a live
 * group's.
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
    // Widened to the three group tables: the writer cannot type a write to a
    // table still generic, so the row is narrowed back to `group`'s on return.
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
 * Soft-deletes a group, first moving its live rows to the group `moveTo`
 * names, each re-slugged under it where its slug carries the group's name, in
 * the same transaction. A group with no live row needs no `moveTo`.
 *
 * The rows are read before the transaction, so one filed under the group in
 * the instant between is left under a deleted one, which every read drops.
 *
 * @throws {ValidationError} on `moveTo`, the group has live rows and `moveTo`
 * names no other live group, or a row would move onto another row's address,
 * naming both.
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
      // The column is the descriptor's own, so the values are built by name.
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

/** The rows, each beside the slug `groupName` gives it: its own where the group is no part of it. */
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
