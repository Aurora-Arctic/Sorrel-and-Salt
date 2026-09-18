import { sql } from 'drizzle-orm';
// `./bootstrap-admin` first, and load-bearing for the reason categories.ts and
// minimal.ts both record: audit.ts and schema/users.ts import each other, and
// whichever is entered first sees the other half-initialised. bootstrap-admin
// imports schema/users, so putting it above schema/ingredient-forms — which
// reaches audit.ts directly — is what makes `users` build its table with
// `auditColumns` already defined. Reverse these two and every insert below
// silently drops its created_by and fails NOT NULL.
import { BOOTSTRAP_SESSION, insertBootstrapAdmin } from './bootstrap-admin';
import { ingredientFormGroups, ingredientForms } from '../schema/ingredient-forms';
import { applyAudit } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import { slugify } from '../../lib/slugify';
import type { SeedDatabase, SeedTransaction } from './index';

// M4.3a — DESIGN.md §5's form vocabulary: six groups and every form §5's table
// lists under them, seeded as a *starting* set an admin may edit afterwards.
//
// It is reference data rather than a scenario, exactly as M4.3's categories
// are, and lands a task ahead of M1.22 for the same reason: M1.22's ingredients
// carry `form` values, and those should come from a vocabulary that already
// exists. It also ships to staging and production on its own — migrate.yml
// seeds after migrating — so it assumes nothing about what else has run and
// inserts the bootstrap admin itself.
//
// **The groups answer "what are you holding", not "how was it made".** Three
// by source — Botanical, Animal, Mineral — for what still has the shape it
// grew or was dug in; three by state for what has lost that shape: Fluid for
// what flows, Curio for a made or found thing with a shape of its own, and
// Substance for what has neither and takes the shape of its jar. A powdered
// mineral is therefore a `powder`, and the ingredient's name says what it was.
// There is no `Other`: a value that fits nothing is typed as free text and
// surfaces on /admin/forms for curation, where a catch-all row would swallow
// it (§5).
//
// **No slug is written down here.** Every one is `slugify(name)` — CLAUDE.md's
// slug rule, the shared `src/lib/slugify.ts` — applied to the name beside it,
// so there is no second list to keep in step and no way to seed a row whose
// slug and name disagree. Every name here is a single ordinary word, so unlike
// §6's ampersanded group names the derived slug is simply the lowercased name.
//
// **The descriptions are the point, not decoration.** §5 requires them
// non-empty at the database level: a curated value that cannot explain itself
// is no better than free text. Each one defines its own form and stops there —
// no "if it is X it is really Y" tail, since that is the dropdown's job and
// reads as an instruction rather than a description.
//
// Where a value could sit in two groups — wax is both a part of the bee and a
// substance rendered from it, which is §5's own example — the seed takes one
// sense, says which in the description, and leaves the second row for an admin
// to add. Uniqueness is on the slug alone, so that second row is permitted.

export interface SeedIngredientFormGroup {
  name: string;
  description: string;
}

export interface SeedIngredientForm {
  name: string;
  /** The `name` of the group in FORM_GROUPS this belongs to. */
  group: string;
  description: string;
}

/**
 * §5's six groups, in §5's table order — which is not the order they render
 * in. Groups list alphabetically by name (§5, M4.2a), so there is no order
 * column and nothing downstream reads the sequence below; it matches §5 so the
 * two can be compared by eye and by test.
 */
export const FORM_GROUPS: SeedIngredientFormGroup[] = [
  { name: 'Botanical', description: 'Parts of a plant or fungus - grown in the dirt.' },
  { name: 'Animal', description: 'Parts of a creature - roaming the land.' },
  { name: 'Mineral', description: 'Stone, salt, earth, metal - dug from the earth.' },
  {
    name: 'Substance',
    description: 'Powders, waxes and ointments - no shape of its own.',
  },
  { name: 'Fluid', description: 'Anything that pours - waters, oils, spirits.' },
  { name: 'Curio', description: 'Made or found objects.' },
];

/**
 * Every form §5's table lists, in the table's order, grouped as the table
 * groups it. Order is documentation here too — nothing reads it — but keeping
 * it means forms.test.ts can compare the list against §5 row by row rather
 * than as a set.
 */
export const FORMS: SeedIngredientForm[] = [
  // Botanical
  {
    name: 'Herb',
    group: 'Botanical',
    description: 'Leaf, stem and flower cut together.',
  },
  {
    name: 'Root',
    group: 'Botanical',
    description: 'The underground structure that brings water to the plant.',
  },
  {
    name: 'Bark',
    group: 'Botanical',
    description: 'The skin of a trunk, branch or root, stripped off in sheets or chips.',
  },
  {
    name: 'Flower',
    group: 'Botanical',
    description: 'The bloom fully open.',
  },
  {
    name: 'Leaf',
    group: 'Botanical',
    description: 'The green part of a plant that gathers the sun.',
  },
  {
    name: 'Seed',
    group: 'Botanical',
    description: 'The pip, kernel or bean, dried.',
  },
  {
    name: 'Fruit',
    group: 'Botanical',
    description: 'The flesh around a seed.',
  },
  { name: 'Peel', group: 'Botanical', description: 'The rind or zest pared off a fruit.' },
  {
    name: 'Stem',
    group: 'Botanical',
    description: 'The stalk, cane or vine.',
  },
  {
    name: 'Wood',
    group: 'Botanical',
    description: 'Chips, twigs or shavings from under the bark.',
  },
  {
    name: 'Sap',
    group: 'Botanical',
    description: 'Fluid from a living plant.',
  },
  {
    name: 'Resin',
    group: 'Botanical',
    description: 'Hardened plant secretion - gum, pitch, tears.',
  },
  {
    name: 'Pollen',
    group: 'Botanical',
    description: 'The fine dust a flower sheds.',
  },
  {
    name: 'Whole',
    group: 'Botanical',
    description: 'The entire plant or fungus.',
  },
  {
    name: 'Berry',
    group: 'Botanical',
    description: 'A small soft fruit.',
  },
  { name: 'Nut', group: 'Botanical', description: 'A seed in a hard shell.' },
  { name: 'Bud', group: 'Botanical', description: 'The flower before it opens.' },
  { name: 'Petal', group: 'Botanical', description: 'Loose petals from the flower.' },
  { name: 'Thorn', group: 'Botanical', description: 'A spine or prickle off a stem.' },
  {
    name: 'Moss',
    group: 'Botanical',
    description: 'Moss or lichen, in the mat it grew as.',
  },
  {
    name: 'Mushroom',
    group: 'Botanical',
    description: 'The fruiting body of a fungus - cap, gills, stem.',
  },
  {
    name: 'Bulb',
    group: 'Botanical',
    description: 'A layered underground bud - garlic, onion, lily.',
  },
  {
    name: 'Pod',
    group: 'Botanical',
    description: 'The case several seeds grew in, whole or split.',
  },

  // Animal
  {
    name: 'Bone',
    group: 'Animal',
    description: 'Bone kept from a carcass.',
  },
  { name: 'Claw', group: 'Animal', description: 'A claw, talon, hoof or nail.' },
  { name: 'Feather', group: 'Animal', description: 'A feather.' },
  { name: 'Shell', group: 'Animal', description: 'A mollusc shell, carapace or eggshell.' },
  { name: 'Tooth', group: 'Animal', description: 'A tooth or tusk.' },
  {
    name: 'Fur',
    group: 'Animal',
    description: 'Fur, hair, wool or whisker, cut loose.',
  },
  {
    name: 'Shed',
    group: 'Animal',
    description: 'What the creature dropped itself - snakeskin, moult, or etc.',
  },
  {
    name: 'Egg',
    group: 'Animal',
    description: 'An egg, whole or its contents.',
  },
  {
    name: 'Horn',
    group: 'Animal',
    description: 'Horn, kept for life and never dropped.',
  },
  {
    name: 'Antler',
    group: 'Animal',
    description: 'Antler cut from the animal, grown and cast yearly.',
  },
  { name: 'Scale', group: 'Animal', description: 'Fish, snake or lizard scales.' },
  { name: 'Skin', group: 'Animal', description: 'Hide or leather, fur on or off.' },
  { name: 'Pearl', group: 'Animal', description: 'A pearl, whole or crushed.' },
  { name: 'Coral', group: 'Animal', description: 'Coral, as a branch or a bead.' },
  {
    name: 'Specimen',
    group: 'Animal',
    description: 'A whole creature - insect, fish, frog.',
  },

  // Mineral
  {
    name: 'Crystal',
    group: 'Mineral',
    description: 'A crystalline mineral - raw, tumbled or cut.',
  },
  { name: 'Salt', group: 'Mineral', description: 'Salt of any kind - sea, rock, black.' },
  { name: 'Stone', group: 'Mineral', description: 'A pebble, rock or hagstone, not crystalline.' },
  {
    name: 'Clay',
    group: 'Mineral',
    description: 'Earth fine enough to shape and fire.',
  },
  { name: 'Sand', group: 'Mineral', description: 'Loose grains of ground stone.' },
  {
    name: 'Earth',
    group: 'Mineral',
    description: 'Soil or dirt from a named place - graveyard, crossroads, doorstep.',
  },
  {
    name: 'Metal',
    group: 'Mineral',
    description: 'Metal as material - iron scrap, lead, filings, gold leaf.',
  },
  { name: 'Chalk', group: 'Mineral', description: 'Chalk as a stick or lump.' },

  // Substance
  {
    name: 'Powder',
    group: 'Substance',
    description: 'Anything milled fine, its source no longer visible.',
  },
  {
    name: 'Ash',
    group: 'Substance',
    description: 'What is left when something burns away.',
  },
  {
    name: 'Wax',
    group: 'Substance',
    description: 'Rendered wax, set.',
  },
  {
    name: 'Charcoal',
    group: 'Substance',
    description: 'Wood or bone burned black.',
  },
  {
    name: 'Pigment',
    group: 'Substance',
    description: 'A powder kept for colour - ochre, lampblack.',
  },
  {
    name: 'Ointment',
    group: 'Substance',
    description: 'A blend in base, spread on the skin - a salve or a balm.',
  },
  { name: 'Soap', group: 'Substance', description: 'A bar or cake for washing.' },
  {
    name: 'Incense',
    group: 'Substance',
    description: 'A blend burned for its smoke - loose, cone or stick.',
  },
  { name: 'Paste', group: 'Substance', description: 'A thick wet blend, too stiff to pour.' },

  // Fluid
  {
    name: 'Liquid',
    group: 'Fluid',
    description: 'A watery fluid.',
  },
  {
    name: 'Oil',
    group: 'Fluid',
    description: 'Pressed or infused, and fatty.',
  },
  {
    name: 'Water',
    group: 'Fluid',
    description: 'Water gathered or charged - moon, storm, holy, spring.',
  },
  {
    name: 'Vinegar',
    group: 'Fluid',
    description: 'Vinegar, plain or steeped.',
  },
  {
    name: 'Spirit',
    group: 'Fluid',
    description: 'Drinking alcohol - rum, whisky, vodka, gin.',
  },
  {
    name: 'Concoction',
    group: 'Fluid',
    description:
      'Something drawn out of plant matter into a liquid - a tincture, an infusion, a tea, a decoction, a hydrosol, a wash.',
  },
  { name: 'Ink', group: 'Fluid', description: 'Pigment bound wet, for writing.' },
  {
    name: 'Syrup',
    group: 'Fluid',
    description: 'Sugar cooked into a liquid - molasses, simple syrup.',
  },
  {
    name: 'Honey',
    group: 'Fluid',
    description: 'Honey and comb from the hive.',
  },
  {
    name: 'Perfume',
    group: 'Fluid',
    description: 'A blend worn for scent - cologne, scent oil, floral water.',
  },

  // Curio
  {
    name: 'Curio',
    group: 'Curio',
    description:
      'A made or found object no other form names - lodestone, rabbit’s foot, lucky hand.',
  },
  {
    name: 'Candle',
    group: 'Curio',
    description: 'Wax shaped and wicked - taper, pillar, tealight, figure.',
  },
  {
    name: 'Cord',
    group: 'Curio',
    description: 'Thread, string, ribbon or cord.',
  },
  { name: 'Coin', group: 'Curio', description: 'A coin or token.' },
  { name: 'Nail', group: 'Curio', description: 'A nail, pin or tack - iron, coffin, horseshoe.' },
  { name: 'Key', group: 'Curio', description: 'A key.' },
  {
    name: 'Charm',
    group: 'Curio',
    description: 'A figured object worn or carried - pendant, medal.',
  },
  {
    name: 'Bead',
    group: 'Curio',
    description: 'A bead, loose or strung - glass, seed, stone, bone.',
  },
  { name: 'Bottle', group: 'Curio', description: 'A bottle, jar, vial or phial.' },
  {
    name: 'Poppet',
    group: 'Curio',
    description: 'A figure made to stand for someone - cloth, wax, clay, corn.',
  },
  {
    name: 'Paper',
    group: 'Curio',
    description: 'Paper, parchment or card - petition, sigil, page.',
  },
  { name: 'Mirror', group: 'Curio', description: 'A mirror, or a piece of one.' },
  { name: 'Bell', group: 'Curio', description: 'A bell or chime.' },
];

/**
 * Seeds §5's form groups and then its forms. Safe to run repeatedly, against a
 * fresh database or a populated one.
 *
 * Idempotency keys on the slug and **ignores `deleted_at`**, exactly as
 * `seedCategories` does and for the same reason: the partial unique index stops
 * only a second *live* row, so a slug an admin had soft-deleted would be
 * re-inserted on the next deploy, and removing a form is a decision. Nothing
 * already present is updated either — a form an admin has renamed, regrouped or
 * rewritten the description of survives untouched.
 *
 * The writes go through the handle the caller gives, not through `withAudit`,
 * for the reason recorded in
 * claude-docs/design-decisions/m1.21-seed-writes-through-its-handle.md — and
 * what `withAudit` guarantees is kept rather than re-argued: one transaction,
 * the acting user published as `app.current_user_id` in the same parameterised
 * form, and every stamp produced by the shared `applyAudit`.
 */
export async function seedForms(db: SeedDatabase): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${BOOTSTRAP_USER_ID}, true)`);
    await insertBootstrapAdmin(tx);

    // Groups first: `ingredient_forms.group_id` is a NOT NULL foreign key, so
    // there is nothing for a form to point at until they exist.
    await insertMissingGroups(tx);
    await insertMissingForms(tx, await groupIdByName(tx));
  });
}

async function insertMissingGroups(tx: SeedTransaction): Promise<void> {
  const present = new Set(
    (await tx.select({ slug: ingredientFormGroups.slug }).from(ingredientFormGroups)).map(
      (row) => row.slug,
    ),
  );
  const missing = FORM_GROUPS.filter((group) => !present.has(slugify(group.name)));

  if (missing.length === 0) return;

  await tx
    .insert(ingredientFormGroups)
    .values(
      missing.map((group) =>
        applyAudit('insert', { ...group, slug: slugify(group.name) }, BOOTSTRAP_SESSION),
      ),
    );
}

/** Group ids keyed by *name*, which is what a form in FORMS names. */
async function groupIdByName(tx: SeedTransaction): Promise<Map<string, string>> {
  const rows = await tx
    .select({ id: ingredientFormGroups.id, name: ingredientFormGroups.name })
    .from(ingredientFormGroups);

  return new Map(rows.map((row) => [row.name, row.id]));
}

async function insertMissingForms(
  tx: SeedTransaction,
  groupIds: Map<string, string>,
): Promise<void> {
  const present = new Set(
    (await tx.select({ slug: ingredientForms.slug }).from(ingredientForms)).map((row) => row.slug),
  );
  const missing = FORMS.filter((form) => !present.has(slugify(form.name)));

  if (missing.length === 0) return;

  await tx.insert(ingredientForms).values(
    missing.map(({ name, description, group }) => {
      const groupId = groupIds.get(group);

      // Unreachable while FORMS and FORM_GROUPS agree, which the tests pin —
      // but a form whose group an admin has since renamed or deleted would
      // otherwise be inserted with `undefined` and fail on NOT NULL several
      // rows later, naming the wrong row.
      if (groupId === undefined) {
        throw new Error(`Form "${name}" names group "${group}", which is not in the database.`);
      }

      return applyAudit(
        'insert',
        { name, slug: slugify(name), description, groupId },
        BOOTSTRAP_SESSION,
      );
    }),
  );
}
