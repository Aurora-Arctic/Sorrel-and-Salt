import 'server-only';
import type {
  AuditWriter,
  HiddenJar,
  IngredientRow,
  StockRow,
  VariantRow,
} from '../../../db/repository';
import { ValidationError } from '../../../lib/errors';
import { ingredientVariants } from '../schema/ingredient-variants';
import { inventoryItems } from '../schema/inventory-items';
import { MAX_QUANTITY, QUANTITY_SCALE } from '../schema/quantities';
import { type Unit, dimensionOf } from '../schema/units';
import type { JarConflict, JarMergeChoice } from '../types';
import { unitConvert } from '../units/convert';
import { foldForm } from './ingredient-rows';
import { JarMergeNeeded } from './jar-merge-needed';
import type { Membership } from '@/modules/coven';

// M12.8: a jar follows a local ingredient that hides its compendium entry. The
// decisions are here and the locked reads are the repository's
// (`stockWrites`); every function runs in the caller's `withAudit`, so the
// moves, the forms they need and the save that caused them commit or roll
// back together (claude-docs/design-decisions/m12.8-jar-follows-local.md).

/** What a jar holds: an amount, a unit, or neither. */
interface Figure {
  quantity: string | null;
  unit: Unit | null;
}

/** The jar a form of the local ends with, and what that takes. */
interface Slot {
  jar: StockRow;
  /** Whom the coven knows the jar by, for the message. */
  label: string;
  figure: Figure;
  /** The jar sits on a compendium form and moves onto the local's. */
  moves: HiddenJar | undefined;
  /** A merge changed the figure the jar holds. */
  changed: boolean;
}

const SCALE = 10n ** BigInt(QUANTITY_SCALE);
const LARGEST = BigInt(Math.round(MAX_QUANTITY * 10 ** QUANTITY_SCALE));

/**
 * Moves every jar the coven holds on a compendium entry `local` hides onto
 * `local`'s form of the same folded name, making the form where the local has
 * none, and merging into the jar the local already holds of that form. Called
 * after the save has written the ingredient and its forms, so a form the save
 * has just written is found. A jar keeps its id and every column but its
 * ingredient and form.
 *
 * @throws {JarMergeNeeded} two jars of one form differ in unit and `choices`
 * names no amount for the one that is moving. Nothing has been written. `fix`
 * says how the save can be settled: `'amount'` by a `jarMerges` entry, `'unit'`
 * where the save takes none (a promote) and the member changes a jar's unit
 * first. It is a parameter rather than a catch and rethrow so the error is
 * built once, with the sentence and the path that fit the caller.
 * @throws {ValidationError} a sum no jar can hold, pathed to `jarMerges`.
 */
export async function carryJarsToLocal(
  write: AuditWriter,
  membership: Membership,
  local: IngredientRow,
  choices: readonly JarMergeChoice[] | undefined,
  fix: 'amount' | 'unit' = 'amount',
): Promise<void> {
  const hidden = await write.lockJarsOnHiddenEntries(membership, local.id);
  if (hidden.length === 0) return;

  const forms = new Map(
    (await write.lockLiveVariants(membership, local.id)).map((form) => [foldForm(form.form), form]),
  );
  const formKeys = new Map([...forms].map(([key, form]) => [form.id, key]));
  const slots = new Map<string, Slot>();
  for (const jar of await write.lockJarsOfIngredient(membership, local.id)) {
    const key = formKeys.get(jar.variantId);
    if (key)
      slots.set(key, {
        jar,
        label: local.name,
        figure: figureOf(jar),
        moves: undefined,
        changed: false,
      });
  }

  const conflicts: JarConflict[] = [];
  const messages: string[] = [];
  const merged: StockRow[] = [];
  for (const hit of hidden) {
    const key = foldForm(hit.variant.form);
    const slot = slots.get(key);
    if (!slot) {
      slots.set(key, {
        jar: hit.jar,
        label: hit.entry.name,
        figure: figureOf(hit.jar),
        moves: hit,
        changed: false,
      });
      continue;
    }
    const chosen = choices?.find((choice) => choice.jarId === hit.jar.id);
    const figure = chosen
      ? {
          quantity: chosen.quantityOnHand == null ? null : String(chosen.quantityOnHand),
          unit: chosen.unit ?? null,
        }
      : combine(slot.figure, figureOf(hit.jar));
    if (!figure) {
      conflicts.push({ reason: 'units', localJar: slot.jar, movingJar: hit.jar });
      messages.push(
        `${hit.variant.form}: ${describeJar(slot.jar, slot.label)} and ${describeJar(hit.jar, hit.entry.name)} are in different units`,
      );
      continue;
    }
    slot.figure = figure;
    slot.changed = true;
    merged.push(hit.jar);
  }
  if (conflicts.length > 0) {
    const cannot = `Two jars cannot be added: ${messages.join('; ')}.`;
    throw fix === 'unit'
      ? new JarMergeNeeded(conflicts, `${cannot} Put them in one unit, then promote again.`, [])
      : new JarMergeNeeded(conflicts, `${cannot} Choose the amount to keep.`);
  }

  for (const [key, slot] of slots) {
    if (!slot.moves && !slot.changed) continue;
    const columns: Partial<typeof inventoryItems.$inferInsert> = {};
    if (slot.moves) {
      const form = forms.get(key) ?? (await createLocalForm(write, local.id, slot.moves.variant));
      forms.set(key, form);
      columns.ingredientId = local.id;
      columns.variantId = form.id;
    }
    if (slot.changed) {
      columns.quantityOnHand = slot.figure.quantity;
      columns.unit = slot.figure.unit;
      columns.unitDimension = slot.figure.unit && dimensionOf(slot.figure.unit);
      if (slot.figure.unit !== slot.jar.unit && slot.jar.lowStockThreshold !== null) {
        columns.lowStockThreshold = thresholdIn(
          slot.jar.lowStockThreshold,
          slot.jar.unit,
          slot.figure.unit,
        );
      }
    }
    await write.updateByIdInWorkspace(membership, inventoryItems, slot.jar.id, columns);
  }
  // A choice naming a jar that is not in `merged` was never read above: a jar
  // that moves alone needs no amount, so the entry is ignored rather than
  // refused, and a caller resending a whole answer after a partial one is safe.
  for (const jar of merged) {
    await write.softDeleteByIdInWorkspace(membership, inventoryItems, jar.id);
  }
}

/**
 * The local's live form of `source`'s folded name, made from `source` if it
 * has none: the form `createStock` stores a jar on when the compendium form it
 * was asked for is hidden.
 */
export async function localFormFor(
  write: AuditWriter,
  membership: Membership,
  local: IngredientRow,
  source: VariantRow,
): Promise<VariantRow> {
  const wanted = foldForm(source.form);
  const forms = await write.lockLiveVariants(membership, local.id);
  return (
    forms.find((form) => foldForm(form.form) === wanted) ??
    (await createLocalForm(write, local.id, source))
  );
}

/**
 * Of the coven's ingredients that hide the entry, the one a jar goes to: the
 * one sharing the entry's identity, else the oldest. Both unique indexes
 * allow at most two (one by identity, one by label), so the age rule only
 * keeps the answer defined should a third way to hide ever be added.
 */
export function chooseHidingLocal(
  locals: readonly IngredientRow[],
  entry: Pick<IngredientRow, 'identityKey'>,
): IngredientRow | undefined {
  return [...locals].sort(
    (a, b) =>
      Number(b.identityKey === entry.identityKey) - Number(a.identityKey === entry.identityKey) ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id),
  )[0];
}

/**
 * A new form of the local carrying the facts the compendium form holds of
 * itself, and nothing a child table keeps: its references, substitutes and
 * categories are the compendium's to cite and the coven's to add.
 */
async function createLocalForm(
  write: AuditWriter,
  ingredientId: string,
  source: VariantRow,
): Promise<VariantRow> {
  const [form] = await write.insert(ingredientVariants, {
    ingredientId,
    form: source.form,
    formId: source.formId,
    description: source.description,
    safetyNotes: source.safetyNotes,
    toxic: source.toxic,
    elements: source.elements,
    celestialBodies: source.celestialBodies,
    zodiacSigns: source.zodiacSigns,
    colors: source.colors,
  });
  return form;
}

/**
 * A threshold carried to the unit its jar now holds: converted within one
 * dimension, else cleared. A number that meant 10 g must not be read as 10 kg,
 * and with no unit on either side, or across dimensions or counts, there is
 * nothing to convert by, so it is dropped rather than guessed.
 */
function thresholdIn(threshold: string, from: Unit | null, to: Unit | null): string | null {
  if (!from || !to) return null;
  const converted = unitConvert(Number(threshold), from, to);
  return converted.ok ? String(converted.value) : null;
}

function figureOf(jar: StockRow): Figure {
  return { quantity: jar.quantityOnHand, unit: jar.unit };
}

/**
 * Two figures added, or `undefined` where they cannot be: the units must be
 * equal (none against none counts), unless one jar holds no amount at all.
 * Never converts: g against kg is a conflict, as everywhere else the
 * module refuses a pair it was not asked to guess.
 */
function combine(held: Figure, moving: Figure): Figure | undefined {
  const bare = (figure: Figure) => figure.quantity === null && figure.unit === null;
  if (held.unit !== moving.unit && !bare(held) && !bare(moving)) return undefined;
  const unit = held.unit ?? moving.unit;
  if (held.quantity === null && moving.quantity === null) return { quantity: null, unit };
  const sum = scaled(held.quantity) + scaled(moving.quantity);
  if (sum > LARGEST) {
    throw new ValidationError([
      { path: ['jarMerges'], message: 'The two jars together hold more than a jar can' },
    ]);
  }
  return { quantity: unscaled(sum), unit };
}

/** `numeric` text in thousandths, exact. The column stores three decimals, so the text has them. */
function scaled(quantity: string | null): bigint {
  if (quantity === null) return 0n;
  const [whole, fraction = ''] = quantity.split('.');
  return (
    BigInt(whole) * SCALE + BigInt(fraction.padEnd(QUANTITY_SCALE, '0').slice(0, QUANTITY_SCALE))
  );
}

function unscaled(thousandths: bigint): string {
  const fraction = String(thousandths % SCALE).padStart(QUANTITY_SCALE, '0');
  return `${thousandths / SCALE}.${fraction}`;
}

/** A jar in words: whose it is, and what it holds. */
function describeJar(jar: StockRow, label: string): string {
  const amount = jar.quantityOnHand === null ? 'an unmeasured amount' : plain(jar.quantityOnHand);
  return `the jar of ${label} holding ${[amount, jar.unit].filter(Boolean).join(' ')}`;
}

function plain(quantity: string): string {
  return quantity.includes('.') ? quantity.replace(/\.?0+$/, '') : quantity;
}
