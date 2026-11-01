import type { Unit } from '../../modules/ingredients/schema/units';
import type {
  CitedEntryField,
  CitedVariantField,
  NameBasis,
} from '../../modules/ingredients/schema/ingredient-enums';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { users } from '../../modules/identity/schema/users';
import type { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
import type { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import type { spells } from '../../modules/grimoire/schema/spells';
import type {
  referenceLinks,
  SOURCED,
  SourcedKey,
} from '../../modules/ingredients/schema/reference-links';
import type { spellSteps } from '../../modules/grimoire/schema/spell-steps';
import type { categories, categoryGroups } from '../../modules/vocabulary/schema/categories';
import type { deities, deityTraditions } from '../../modules/vocabulary/schema/deities';
import type { CitationFields } from '../../lib/types';
import type { StampField } from '../types';
import type { FlatTable, ItemTable, TwoTierPair } from '../vocabularies';
import type {
  ingredientFormGroups,
  ingredientForms,
} from '../../modules/vocabulary/schema/ingredient-forms';

/**
 * What `drizzle(client)` returns: bare `PostgresJsDatabase` defaults its schema
 * to `Record<string, never>`, which a real handle is not assignable to.
 */
export type SeedDatabase = PostgresJsDatabase<Record<string, unknown>>;

/** The handle inside `db.transaction()`, so a seed module can run inside the caller's transaction. */
export type SeedTransaction = Parameters<Parameters<SeedDatabase['transaction']>[0]>[0];

/**
 * How a reference-data seed runs. `dryRun` does every read and
 * write, then rolls the seed's transaction back, so the database is left as
 * it was.
 */
export interface SeedRunOptions {
  dryRun?: boolean;
}

/** The stamps `applyAudit('insert', …)` supplies, so a caller's row is typed without them. */
export type InsertStamps = StampField;

/** Typed against the insert model, so a column renamed in users.ts fails here. */
export type SeedUser = Pick<
  typeof users.$inferInsert,
  'id' | 'name' | 'email' | 'role' | 'emailVerified'
>;

// `standard`: the fixture cast, W and X, and the compendium.

/**
 * `id` is required rather than picked: the table defaults it, and a test
 * asserting against A has to name one id.
 */
export type FixtureUser = Pick<
  typeof users.$inferInsert,
  'name' | 'email' | 'role' | 'canCreateWorkspace' | 'emailVerified'
> & { id: string };

export type SeedWorkspace = Pick<typeof workspaces.$inferInsert, 'name'> & { id: string };

export type SeedMembership = Pick<
  typeof workspaceMembers.$inferInsert,
  'workspaceId' | 'userId' | 'role'
>;

/**
 * One form of a seeded entry and what that form adds: its own
 * description and safety note. A compendium form is picked by name from the
 * curated rows, so it must name exactly one; a coven's is typed.
 */
export type SeedVariant = Pick<typeof ingredientVariants.$inferInsert, 'form'> &
  Partial<Pick<typeof ingredientVariants.$inferInsert, 'description' | 'safetyNotes'>>;

/**
 * One compendium entry plus its forms, folk names, deities and categories,
 * named rather than keyed. Each deity is picked by that name from the curated
 * rows, so each must name exactly one.
 */
export type SeedIngredient = Pick<
  typeof ingredients.$inferInsert,
  | 'name'
  | 'canonicalName'
  | 'nomenclature'
  | 'description'
  | 'elements'
  | 'celestialBodies'
  | 'zodiacSigns'
  | 'safetyNotes'
> & {
  variants: SeedVariant[];
  folkNames?: string[];
  deities?: string[];
  categories: string[];
};

// `demo`: W's own ingredients and the spells layered from both tiers.

/** W's own ingredients — the workspace tier, `workspace_id` set rather than null — and their forms. */
export type SeedWorkspaceIngredient = Pick<
  typeof ingredients.$inferInsert,
  'name' | 'canonicalName' | 'nomenclature' | 'description' | 'elements'
> & { variants: SeedVariant[] };

/** What a layer points at: an ingredient in either tier, or a custom row carrying its own name and form. */
export type SeedLayerIngredient =
  | {
      tier: 'compendium' | 'workspace';
      entry: { name: string; canonicalName?: string | null };
    }
  | { tier: 'custom'; name: string; form: string };

/**
 * One step: an instruction (`body`), a layer (`ingredient`), or both. Its `position` is its place in `SeedSpell['steps']`. An
 * amount belongs to a layer, so an instruction-only step carries none, as the table's CHECK requires.
 */
export type SeedStep =
  | (Pick<typeof spellSteps.$inferInsert, 'quantity' | 'unit'> & {
      ingredient: SeedLayerIngredient;
      body?: string;
    })
  | { body: string; ingredient?: undefined };

export type SeedSpell = Pick<
  typeof spells.$inferInsert,
  | 'title'
  | 'intent'
  | 'jarDescription'
  | 'sealWaxColor'
  | 'moonPhase'
  | 'dayOfWeek'
  | 'note'
  | 'status'
  | 'visibility'
> & {
  id: string;
  // The table lets a draft go untitled, so one demo draft is; a fault
  // names an untitled spell by its id.
  title: string | null;
  /**
   * Written by the coven's `authorId`, which a private spell needs, since only its author reads it. Absent, the bootstrap
   * user wrote it, as it writes every other seeded row.
   */
  byAuthor?: true;
  /** §6 categories by name — what the spell *intends*, never what its contents imply (§9). */
  categories: string[];
  steps: SeedStep[];
};

// The reference vocabularies: the shape the two-tier ones share, then the
// rows filed in each. Their tables are listed once, in src/db/vocabularies.ts.

/** What every item row carries before its foreign key to its group. */
export type TwoTierItemRow = Pick<
  ItemTable['$inferInsert'],
  'name' | 'slug' | 'seedKey' | 'description'
>;

export interface TwoTierVocabulary<
  G extends { name: string; description: string },
  I extends { name: string; description: string },
> {
  /** The item and group tables, and the item's key to its group: an entry of `TWO_TIER`. */
  vocabulary: TwoTierPair;
  groups: readonly G[];
  items: readonly I[];
  /** The `name` of the group an item is filed under: `category.group`, `deity.tradition`. */
  groupOf: (item: I) => string;
  /** Capitalised, for the error naming an item whose group is missing: `Category`, `Form`, `Deity`. */
  itemNoun: string;
  /**
   * An item's slug, given its name and its group's: `slugify(name)` when absent. A form's carries its group and a deity's its
   * tradition, so one name under two groups holds two addresses. Given, every live item's slug is brought to it on each run.
   */
  slugOf?: (name: string, groupName: string) => string;
}

// Each literal's row typed against its table's insert model, so a column
// renamed in the schema fails here rather than at the seed's insert.

export type SeedCategoryGroup = Pick<
  typeof categoryGroups.$inferInsert,
  'name' | 'colorDark' | 'colorLight' | 'description'
>;

export type SeedCategory = Pick<typeof categories.$inferInsert, 'name' | 'description'> & {
  /** The `name` of the group in CATEGORY_GROUPS this belongs to. */
  group: string;
};

export type SeedIngredientFormGroup = Pick<
  typeof ingredientFormGroups.$inferInsert,
  'name' | 'description' | 'icon'
>;

export type SeedIngredientForm = Pick<
  typeof ingredientForms.$inferInsert,
  'name' | 'description'
> & {
  /** The `name` of the group in FORM_GROUPS this belongs to. */
  group: string;
};

export type SeedDeityTradition = Pick<typeof deityTraditions.$inferInsert, 'name' | 'description'>;

export type SeedDeity = Pick<typeof deities.$inferInsert, 'name' | 'description'> & {
  /** The `name` of the tradition in DEITY_TRADITIONS this is filed under. */
  tradition: string;
  /**
   * The other names the deity answers to: a spelling or a by-name
   * the vocabulary calls the same deity, never a related figure of its own.
   */
  otherNames?: string[];
};

export type SeedAstrologyValue = Pick<
  FlatTable['$inferInsert'],
  'name' | 'description' | 'position'
>;

/** A link from a seeded source to a deity, with where in the work it points. */
export interface SeedSourceDeity {
  name: string;
  locator?: string;
}

/**
 * One source the vocabulary seed docs record, and the curated rows it
 * supports, each named as its seed literal names it. A tradition's source
 * reaches every deity filed under it as well.
 */
export interface SeedSource {
  reference: CitationFields;
  traditions?: string[];
  deities?: SeedSourceDeity[];
  celestialBodies?: string[];
  zodiacSigns?: string[];
}

/** A `reference_links` row the sources seed wants, before its stamps: a curated row's link. */
export type SeedSourceLink = Pick<
  typeof referenceLinks.$inferInsert,
  'referenceId' | 'deityId' | 'deityTraditionId' | 'celestialBodyId' | 'zodiacSignId' | 'locator'
>;

/** A table a seeded source links, found by the `seed_key` its own seed gave each row: a vocabulary, never an ingredient or its form. */
export type SourceTargetTable = (typeof SOURCED)[Exclude<
  SourcedKey,
  'ingredientId' | 'ingredientVariantId'
>]['table'];

// The compendium seed: the production compendium's entries, read
// from the files under `compendium/`, each field traced to a source
// its citations name.

/**
 * A source as the seed writes it: its citation's fields and, for a peer-reviewed journal's article or a university or academic press's book,
 * `scholarly`, which lands on its `references` row when the row is first written.
 */
export type SeedWork = CitationFields & { scholarly?: true };

/** A compendium entry's fields a citation may support, by the column's own names. */
export type CompendiumEntryField = CitedEntryField;

/** A form's fields a citation may support. Deities and folk names are the entry's alone. */
export type CompendiumVariantField = CitedVariantField;

/**
 * One citation: a source by its handle — a shared work in `WORKS` or
 * a source file under `compendium/sources/` — where in it, and which fields
 * it backs.
 */
export interface SeedCitation<Field extends string> {
  source: string;
  /** `p. 112`, `under "Mugwort"`: required of a book or a chapter. */
  locator?: string;
  supports: readonly Field[];
  /**
   * How the source's name was matched to the entry's formal name (claude-docs/
   * compendium-seed/README.md, "nameBasis"). A file writes it on every citation of an entry with a
   * formal name. Stored on the link, never hashed.
   */
  nameBasis?: NameBasis;
  /** The common name the source heads, when `nameBasis` is `resolved`. */
  headedAs?: string;
  /** The registered source that maps `headedAs` to this formal name, when `resolved`. */
  resolvedBy?: string;
}

/**
 * What may stand in: an entry the seed writes, by its identity — the formal
 * name lower-cased, or the label without one — and optionally one of its
 * forms; or a name typed for an entry no file writes yet.
 */
export type SeedSubstitute = { identity: string; form?: string } | { name: string };

/** One form of a compendium entry, and what that form adds to it. */
export type SeedCompendiumVariant = Pick<typeof ingredientVariants.$inferInsert, 'form'> &
  Partial<
    Pick<
      typeof ingredientVariants.$inferInsert,
      'description' | 'safetyNotes' | 'elements' | 'celestialBodies' | 'zodiacSigns' | 'colors'
    >
  > & {
    /**
     * On when a source says this form is poisonous. `true` alone: a
     * written `false` would claim the form is safe, which needs a source of
     * its own; left out means not flagged, the column's default.
     */
    toxic?: true;
    categories?: string[];
    substitutes?: SeedSubstitute[];
    references: SeedCitation<CompendiumVariantField>[];
  };

/**
 * One compendium entry, every curated value named as its seed literal names
 * it: forms, categories and deities picked by the key their seed gave them,
 * celestial bodies and signs stored in their row's current spelling.
 */
export type SeedCompendiumEntry = Pick<
  typeof ingredients.$inferInsert,
  | 'name'
  | 'canonicalName'
  | 'nomenclature'
  | 'description'
  | 'elements'
  | 'celestialBodies'
  | 'zodiacSigns'
  | 'colors'
  | 'safetyNotes'
> & {
  /**
   * On when a source says any part of the plant is poisonous; its
   * own flag, never read into a form or out of one (DESIGN.md §5, "The toxic
   * flag is the one exception"). `true` alone, as on a form.
   */
  toxic?: true;
  folkNames?: string[];
  deities?: string[];
  categories?: string[];
  substitutes?: SeedSubstitute[];
  references: SeedCitation<CompendiumEntryField>[];
  variants: SeedCompendiumVariant[];
};

/**
 * Where an entry file stands: `approved` is what the seed writes,
 * `needs-review` the curator's queue, `draft` unfinished and refused on the
 * release branches. Never stored or hashed.
 */
export type CompendiumFileStatus = 'draft' | 'needs-review' | 'approved';

/** The two trailing sections an entry file may end with, neither hashed nor seeded. */
export interface CompendiumFileSections {
  /** `#### Questions for the Curator`: the doubt a `needs-review` file asks the curator to settle. */
  questions?: string;
  /** `#### Edit Notes for Claude`: the curator's instructions for the next edit. */
  editNotes?: string;
}

/**
 * One entry file as the loader read it: the entry the seed writes,
 * and what the file says about it that the seed does not store.
 */
export interface SeedCompendiumFile {
  /** Relative to the compendium root: `ingredients/botanical/aspen-populus-tremuloides.md`. */
  path: string;
  status: CompendiumFileStatus;
  /** The hash the curator marked for update, when the file carries one. */
  seedUpdate?: string;
  /** Only beside `seedUpdate`: the update may overwrite an editor's or curator's work. */
  overwriteEditor?: true;
  entry: SeedCompendiumEntry;
  /** `contentHash(entry)`, as the file stands. */
  hash: string;
  sections: CompendiumFileSections;
}

/**
 * A named list of entries and the per-entry pages they cite, by handle: the
 * shape the guard's content rules take. The loader builds one, `compendium`,
 * from the files; the TypeScript shards it was named for are gone.
 */
export interface SeedCompendiumShard {
  name: string;
  sources: Record<string, CitationFields>;
  entries: SeedCompendiumEntry[];
}

/** One of the audit's three ways a citation becomes a candidate. */
export type AuditHeuristic = 'collision' | 'hatnote' | 'no-binomial';

/**
 * A citation the attribution audit doubts: one source cited under
 * one heading on one file, wherever on the entry it is cited (the entry, a
 * variant, or both), since one answer settles them all.
 */
export interface AuditCandidate {
  /** The file, relative to the compendium root. */
  path: string;
  /** The entry's formal name, which the source must print or resolve to. */
  canonicalName: string;
  source: string;
  /** The heading the source is cited under, from the locator or the source's title; absent only when neither gives one. */
  headedAs?: string;
  /** Where on the entry it is cited: `entry`, or a variant's form. */
  citedOn: string[];
  /** Which heuristics marked it, in a fixed order. */
  heuristics: AuditHeuristic[];
  /** The other formal names the heading may mean, from the corpus and the hatnotes. */
  candidates: string[];
  /** One plain line per heuristic, saying what it found. */
  evidence: string[];
  /** The rank: higher is likelier another taxon's citation. */
  score: number;
}

/** A citation of a Wikipedia article whose taxobox names the entry's formal name: `stated`, for a lane to write. */
export interface AuditStated {
  path: string;
  source: string;
  citedOn: string[];
  /** The taxon the article's `{{Speciesbox}}` or `{{Automatic taxobox}}` names. */
  taxon: string;
}

/** The audit's findings over a corpus. */
export interface AuditReport {
  /** How many files with a formal name were read. */
  files: number;
  /** How many citations were checked: those not yet `stated` or `resolved`. */
  citations: number;
  /** Ranked, highest score first. */
  candidates: AuditCandidate[];
  stated: AuditStated[];
}

/**
 * One seeded working, a time a spell was made. A complete working carries what completing it took from the coven's
 * jars, one entry per step it took from, written as the working service would write it.
 */
export interface SeedWorking {
  id: string;
  spellId: string;
  /** The member who recorded it, and so the one stamped on every row. */
  recorder: string;
  status: 'draft' | 'complete';
  /** The day it was made, `YYYY-MM-DD`. */
  workedOn: string;
  note: string | null;
  /** Never wider than its spell's. */
  visibility: 'private' | 'workspace';
  /** In order, from position 0: a coven member, or a name typed for someone without an account. */
  participants: ({ userId: string } | { name: string })[];
  deductions: {
    /** The place of the spell step it took from. */
    stepPosition: number;
    /** The id of the jar it took from, in `DEMO_STOCK`. */
    jarId: string;
    quantity: string;
    unit: 'g';
    shortfall: string;
  }[];
}

/**
 * A compendium entry W's cupboard holds, by formal name, with the coven's own say over it: each override is
 * null (the compendium's value shows) unless set. An entry with none is in the cupboard, not annotated.
 */
export interface SeedCupboardEntry {
  /** The held entry, by its formal name, or by its name alone where it has none (`identityOf`). */
  entry: { name: string; canonicalName?: string | null };
  label?: string;
  description?: string;
  safetyNotes?: string;
  elements?: Array<'earth' | 'air' | 'fire' | 'water' | 'spirit'>;
  celestialBodies?: string[];
  zodiacSigns?: string[];
  colors?: string[];
}

/** A layer's or jar's ingredient that names an entry, in either tier: all but the custom one-off. */
export type NamedIngredient = Extract<SeedLayerIngredient, { entry: unknown }>;

/**
 * One jar of stock W holds: the entry, the form (matched without case) and what the row says of it. A `unit`
 * carries its dimension; an omitted threshold is the dimension's default, as `createStock` fills it. (claude-docs/db/standard-scenario.md, "W's stock")
 */
export interface SeedStock {
  id: string;
  ingredient: NamedIngredient;
  form: string;
  quantity?: string;
  unit?: Unit;
  lowStockThreshold?: string;
  source?: string;
  acquiredDate?: string;
}

/**
 * The coven a content helper fills, and who wrote what it writes: `authorId` stamps the coven's private spells and need not
 * be a member of it.
 */
export interface CovenTarget {
  workspaceId: string;
  authorId: string;
}
