import { WORKS } from './works';
import { COLOURS } from './colours';
import { CATEGORIES } from '../categories';
import { deitiesNamed } from '../deities';
import { FORMS } from '../forms';
import { CELESTIAL_BODIES, ZODIAC_SIGNS } from '../astrology';
import { identityOf } from '../standard';
import { citationText } from '../../../lib/citation';
import { ingredientSlug, slugify } from '../../../lib/slugify';
import { entryFilePath } from './parse-entry';
import { UNAUDITED_LIST, type LoadedCompendium } from './load';
import type { CitationFields } from '../../../lib/types';
import type {
  CompendiumEntryField,
  CompendiumVariantField,
  SeedCitation,
  SeedCompendiumFile,
  SeedCompendiumEntry,
  SeedCompendiumShard,
  SeedCompendiumVariant,
  SeedSubstitute,
} from '../types';

// The compendium seed's guard: every rule the entry files are written to that a function can check, run by a database-free
// test and by `seedCompendium` before its transaction opens. `checkCompendium` takes a list of shards (the loader hands it
// the files as one) and returns every issue, not the first (claude-docs/db/compendium-seed/README.md).

/**
 * The curated vocabularies an entry may name, each by the slug of a name its
 * seed literal holds. A deity may be named by one of its other names too,
 * so `deities` answers the curated deities a name can mean.
 */
export interface CuratedNames {
  forms: ReadonlySet<string>;
  categories: ReadonlySet<string>;
  deities: (name: string) => readonly string[];
  celestialBodies: ReadonlySet<string>;
  zodiacSigns: ReadonlySet<string>;
}

const slugsOf = (rows: readonly { name: string }[]) =>
  new Set(rows.map((row) => slugify(row.name)));

/** The seed literals' own names: what `migrate.yml` has seeded before the compendium runs. */
export const CURATED: CuratedNames = {
  forms: slugsOf(FORMS),
  categories: slugsOf(CATEGORIES),
  deities: deitiesNamed,
  celestialBodies: slugsOf(CELESTIAL_BODIES),
  zodiacSigns: slugsOf(ZODIAC_SIGNS),
};

/** An entry's word count bounds, and a form's ceiling: the curator's defaults (README, rule 5). */
export const ENTRY_WORDS = { min: 100, max: 250 } as const;
export const VARIANT_WORDS_MAX = 120;

// A binomial, a trinomial with or without its rank (`subsp.`, `var.`, `f.`), a hybrid's `×`, a quoted cultivar, a genus or
// higher taxon alone (`Usnea`), or a group within a genus named by rank (`Rubus subg. Rubus`).
const EPITHET = String.raw`(?:× )?[a-z][a-z-]*`;
const TAXON = new RegExp(
  String.raw`^[A-Z][a-z]+(?: (?:subg\.|sect\.) [A-Z][a-z]+|(?: ${EPITHET}(?: (?:(?:subsp\.|var\.|f\.) )?[a-z][a-z-]*)?)?(?: '[^']+')?)$`,
);
const TAXONOMIC = new Set(['botanical', 'fungal', 'zoological']);

/** The fields an entry populates, each a field some citation must support. */
function populatedEntryFields(entry: SeedCompendiumEntry): CompendiumEntryField[] {
  const fields: CompendiumEntryField[] = [];
  if (entry.canonicalName) fields.push('canonicalName');
  if (entry.description) fields.push('description');
  if (entry.safetyNotes) fields.push('safetyNotes');
  // A flag on is a claim the plant is poisonous, so a citation must back it.
  if (entry.toxic) fields.push('toxic');
  for (const field of [
    'elements',
    'celestialBodies',
    'zodiacSigns',
    'colors',
    'folkNames',
    'deities',
    'categories',
    'substitutes',
  ] as const) {
    if ((entry[field]?.length ?? 0) > 0) fields.push(field);
  }
  return fields;
}

function populatedVariantFields(variant: SeedCompendiumVariant): CompendiumVariantField[] {
  const fields: CompendiumVariantField[] = ['form'];
  if (variant.description) fields.push('description');
  if (variant.safetyNotes) fields.push('safetyNotes');
  if (variant.toxic) fields.push('toxic');
  for (const field of [
    'elements',
    'celestialBodies',
    'zodiacSigns',
    'colors',
    'categories',
    'substitutes',
  ] as const) {
    if ((variant[field]?.length ?? 0) > 0) fields.push(field);
  }
  return fields;
}

const wordsIn = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** Every value a list repeats, case folded, as the child tables' unique indexes fold it. */
function repeats(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    const fold = value.trim().toLowerCase();
    if (seen.has(fold)) repeated.add(value);
    seen.add(fold);
  }
  return [...repeated];
}

/**
 * Every issue in `shards`, in shard and entry order; empty when the list is
 * fit to seed. `works` and `curated` are the shared works and the curated
 * vocabularies, given so a test can hold them still.
 */
export interface GuardOptions {
  works?: Record<string, CitationFields>;
  curated?: CuratedNames;
  /**
   * How an issue names an entry: `<shard>: <label>` by default, the file's
   * path for a file, since two files may share a label (the two Aspens).
   */
  whereOf?: (shard: SeedCompendiumShard, entry: SeedCompendiumEntry) => string;
  /**
   * Which entries the content rules are reported for: every one by default; the files' guard passes the `approved` ones, as a
   * `needs-review` file may be unfinished but its identity, slug and path rules still run on every entry.
   */
  reportContent?: (entry: SeedCompendiumEntry) => boolean;
}

export function checkCompendium(
  shards: readonly SeedCompendiumShard[],
  {
    works = WORKS,
    curated = CURATED,
    whereOf = (shard, entry) => `${shard.name}: ${entry.name}`,
    reportContent = () => true,
  }: GuardOptions = {},
): string[] {
  const issues: string[] = [];

  // Citation texts pairwise distinct: two handles rendering one citation
  // would be one `references` row the seed links twice under two names.
  const handlesByCitation = new Map<string, string>();
  const noteCitation = (handle: string, fields: CitationFields) => {
    const text = citationText(fields);
    const other = handlesByCitation.get(text);
    if (other !== undefined && other !== handle) {
      issues.push(`Sources "${other}" and "${handle}" render the same citation: ${text}`);
    }
    handlesByCitation.set(text, handle);
  };
  for (const [handle, fields] of Object.entries(works)) noteCitation(handle, fields);

  // Identity, slug and the forms each identity carries, for the uniqueness
  // rule and the substitutes' rule.
  const identities = new Map<string, string>();
  const slugs = new Map<string, string>();
  const formsOf = new Map<string, Set<string>>();
  for (const shard of shards) {
    for (const [handle, fields] of Object.entries(shard.sources)) {
      if (handle in works) issues.push(`${shard.name}: source "${handle}" shadows a shared work.`);
      noteCitation(handle, fields);
    }
    for (const entry of shard.entries) {
      const identity = identityOf(entry);
      const slug = ingredientSlug(entry.name, entry.canonicalName);
      const where = whereOf(shard, entry);
      const twin = identities.get(identity);
      if (twin !== undefined)
        issues.push(`${where} shares its identity "${identity}" with ${twin}.`);
      const slugTwin = slugs.get(slug);
      if (slugTwin !== undefined)
        issues.push(`${where} shares its slug "${slug}" with ${slugTwin}.`);
      identities.set(identity, where);
      slugs.set(slug, where);
      formsOf.set(identity, new Set(entry.variants.map((variant) => slugify(variant.form))));
    }
  }

  // A substitute links an identity some entry carries, whatever the order:
  // the seed inserts every entry before it resolves a link (a folder of files has no
  // earlier-shard rule to lean on).
  const seeded = new Set(identities.keys());
  for (const shard of shards) {
    const sources = { ...works, ...shard.sources };
    for (const entry of shard.entries) {
      if (!reportContent(entry)) continue;
      checkEntry(entry, whereOf(shard, entry), sources, curated, seeded, formsOf, issues);
    }
  }

  return issues;
}

function checkEntry(
  entry: SeedCompendiumEntry,
  where: string,
  sources: Record<string, CitationFields>,
  curated: CuratedNames,
  seeded: ReadonlySet<string>,
  formsOf: ReadonlyMap<string, ReadonlySet<string>>,
  issues: string[],
): void {
  const identity = identityOf(entry);

  // The formal name against the naming system: the database CHECK's three
  // cases, made stricter for `unknown`, which the seed writes without a name
  // (README, "Formal names").
  const named = entry.canonicalName !== undefined && entry.canonicalName !== null;
  if (entry.nomenclature === 'none' || entry.nomenclature === 'unknown') {
    if (named) issues.push(`${where} is "${entry.nomenclature}" but carries a formal name.`);
  } else if (!named || entry.canonicalName?.trim() === '') {
    issues.push(`${where} is "${entry.nomenclature}" but carries no formal name.`);
  } else if (TAXONOMIC.has(entry.nomenclature) && !TAXON.test(entry.canonicalName as string)) {
    issues.push(`${where}'s formal name "${entry.canonicalName}" is not a taxon's shape.`);
  }

  const words = wordsIn(entry.description ?? '');
  if (words < ENTRY_WORDS.min || words > ENTRY_WORDS.max) {
    issues.push(
      `${where}'s description is ${words} words, outside ${ENTRY_WORDS.min} to ${ENTRY_WORDS.max}.`,
    );
  }

  checkValues(entry, where, curated, issues);
  checkDeities(entry, where, curated, issues);
  for (const field of ['folkNames', 'deities'] as const) {
    for (const value of repeats(entry[field] ?? []))
      issues.push(`${where} repeats ${field} "${value}".`);
  }
  checkSubstitutes(entry.substitutes ?? [], where, identity, null, seeded, formsOf, issues);
  checkCitations(entry.references, populatedEntryFields(entry), where, sources, issues);

  if (entry.variants.length === 0)
    issues.push(`${where} has no form: its primary form is a variant.`);
  for (const value of repeats(entry.variants.map((variant) => variant.form))) {
    issues.push(`${where} lists the form "${value}" twice.`);
  }
  for (const variant of entry.variants) {
    const at = `${where} (${variant.form})`;
    if (!curated.forms.has(slugify(variant.form))) {
      issues.push(`${at}: "${variant.form}" is not a curated form.`);
    }
    if (variant.description && wordsIn(variant.description) > VARIANT_WORDS_MAX) {
      issues.push(
        `${at}'s description is ${wordsIn(variant.description)} words, over ${VARIANT_WORDS_MAX}.`,
      );
    }
    checkValues(variant, at, curated, issues);
    checkSubstitutes(
      variant.substitutes ?? [],
      at,
      identity,
      slugify(variant.form),
      seeded,
      formsOf,
      issues,
    );
    checkCitations(variant.references, populatedVariantFields(variant), at, sources, issues);
  }
}

/** The four lists and the categories, each value on its closed list and none repeated. */
function checkValues(
  row: Pick<
    SeedCompendiumVariant,
    'elements' | 'celestialBodies' | 'zodiacSigns' | 'colors' | 'categories'
  >,
  where: string,
  curated: CuratedNames,
  issues: string[],
): void {
  const lists: [string, readonly string[] | null | undefined, (value: string) => boolean][] = [
    ['celestialBody', row.celestialBodies, (value) => curated.celestialBodies.has(slugify(value))],
    ['zodiac sign', row.zodiacSigns, (value) => curated.zodiacSigns.has(slugify(value))],
    ['colour', row.colors, (value) => (COLOURS as readonly string[]).includes(value)],
    ['category', row.categories, (value) => curated.categories.has(slugify(value))],
    // The type holds an element to the enum; only a repeat is the guard's.
    ['element', row.elements, () => true],
  ];
  for (const [noun, values, onList] of lists) {
    for (const value of values ?? []) {
      if (!onList(value)) issues.push(`${where}: "${value}" is not a curated ${noun}.`);
    }
    for (const value of repeats(values ?? []))
      issues.push(`${where} repeats the ${noun} "${value}".`);
  }
}

function checkDeities(
  entry: SeedCompendiumEntry,
  where: string,
  curated: CuratedNames,
  issues: string[],
): void {
  // By the deity each name means, so Woden beside Odin is one link twice.
  // A plain repeat, Odin twice, is the caller's repeat check instead.
  const linked = new Map<string, string>();
  for (const deity of entry.deities ?? []) {
    const meant = curated.deities(deity);
    if (meant.length === 0) {
      issues.push(`${where}: "${deity}" is not a curated deity.`);
    } else if (meant.length > 1) {
      issues.push(
        `${where}: "${deity}" is an other name of ${meant.join(' and ')}; name the deity meant.`,
      );
    } else {
      const earlier = linked.get(meant[0]);
      if (earlier !== undefined && slugify(earlier) !== slugify(deity))
        issues.push(`${where}: "${deity}" is ${meant[0]}, already linked as "${earlier}".`);
      if (earlier === undefined) linked.set(meant[0], deity);
    }
  }
}

function checkSubstitutes(
  substitutes: readonly SeedSubstitute[],
  where: string,
  identity: string,
  ownForm: string | null,
  seeded: ReadonlySet<string>,
  formsOf: ReadonlyMap<string, ReadonlySet<string>>,
  issues: string[],
): void {
  for (const substitute of substitutes) {
    if (!('identity' in substitute)) {
      if (substitute.name.trim() === '') issues.push(`${where} names a blank substitute.`);
      // A typed name stands in only for what the seed does not write: an
      // entry's identity is linked, so a reader reaches it.
      else if (seeded.has(substitute.name.toLowerCase())) {
        issues.push(
          `${where}: substitute "${substitute.name}" is typed as a name, but an entry has that identity: link it.`,
        );
      }
      continue;
    }
    const form = substitute.form === undefined ? null : slugify(substitute.form);
    // A form's linked substitute names a form, as the service holds it;
    // the ingredient's own list may link an ingredient whole.
    if (ownForm !== null && form === null) {
      issues.push(
        `${where}: substitute "${substitute.identity}" links no form; a form's link names one.`,
      );
    }
    if (!seeded.has(substitute.identity)) {
      issues.push(`${where}: substitute "${substitute.identity}" is no identity an entry carries.`);
    } else if (form !== null && !formsOf.get(substitute.identity)?.has(form)) {
      issues.push(
        `${where}: substitute "${substitute.identity}" has no form "${substitute.form}".`,
      );
    }
    if (substitute.identity === identity && form === ownForm) {
      issues.push(`${where} names itself as its own substitute.`);
    }
  }
}

/**
 * The owner's rule as code: at least one citation, each naming a source that
 * resolves, a book or chapter with its locator, no source cited twice on one
 * row, and every populated field supported by some citation.
 */
function checkCitations<Field extends string>(
  citations: readonly SeedCitation<Field>[],
  populated: readonly Field[],
  where: string,
  sources: Record<string, CitationFields>,
  issues: string[],
): void {
  if (citations.length === 0) {
    issues.push(`${where} cites no source.`);
    return;
  }
  const cited = new Set<string>();
  for (const citation of citations) {
    const source = sources[citation.source];
    if (cited.has(citation.source)) issues.push(`${where} cites "${citation.source}" twice.`);
    cited.add(citation.source);
    if (source === undefined) {
      issues.push(`${where} cites "${citation.source}", which no work or shard source declares.`);
      continue;
    }
    const locator = citation.locator?.trim() ?? '';
    if ((source.kind === 'book' || source.kind === 'chapter') && locator === '') {
      issues.push(`${where} cites the ${source.kind} "${citation.source}" with no locator.`);
    }
    if (citation.locator !== undefined && locator === '') {
      issues.push(`${where} cites "${citation.source}" with a blank locator.`);
    }
  }
  const supported = new Set(citations.flatMap((citation) => citation.supports));
  for (const field of populated) {
    if (!supported.has(field)) issues.push(`${where}: no citation supports ${field}.`);
  }
}

// The files' rules: what a folder of entry files must satisfy over and
// above what the entries themselves must, which `checkCompendium` keeps
// checking (claude-docs/db/compendium-seed/README.md, "An entry, field by field" and
// "Write-once, and how a correction lands"). Each is a rule a shard literal had no room to break.

/** The branches the seed deploys from (DESIGN.md §12): a `draft` file is refused on each. */
export const RELEASE_BRANCHES: readonly string[] = ['staging', 'main'];

/**
 * The branch a CI run is for: a pull request's base (`GITHUB_BASE_REF`) or a push's ref (`GITHUB_REF`). Nothing outside
 * Actions, so a local run is on no release branch and a `draft` passes.
 */
export function releaseBranch(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const base = env.GITHUB_BASE_REF?.trim();
  if (base) return base;
  const ref = env.GITHUB_REF?.trim();
  if (ref?.startsWith('refs/heads/')) return ref.slice('refs/heads/'.length);
  return null;
}

export interface FilesGuardOptions extends Pick<GuardOptions, 'works' | 'curated'> {
  /** The branch the run is for; `releaseBranch()` by default. `null` is no release branch. */
  branch?: string | null;
}

/**
 * Every issue the files raise: the loader's, then each file's own rules (path, sections, `seedUpdate`, `nameBasis`, legacy
 * list, status gate), then `checkCompendium` over the one shard for `approved` files only. Empty means sound on `branch`.
 */
export function checkCompendiumFiles(
  loaded: LoadedCompendium,
  { works = WORKS, curated = CURATED, branch = releaseBranch() }: FilesGuardOptions = {},
): string[] {
  const issues = [...loaded.issues];
  const registered = new Set([...Object.keys(works), ...Object.keys(loaded.sources)]);
  const unaudited = new Set(loaded.unaudited);
  const onRelease = branch !== null && RELEASE_BRANCHES.includes(branch);
  const pathOf = new Map(loaded.files.map((file) => [file.entry, file.path]));

  for (const file of loaded.files) {
    const { entry, path } = file;
    const expected = entryFilePath(entry);
    if (path !== expected) {
      issues.push(
        `${path} disagrees with its frontmatter and name: the file belongs at ${expected}.`,
      );
    }
    if (file.seedUpdate !== undefined && file.seedUpdate !== file.hash) {
      issues.push(
        `${path} carries a stale seedUpdate: the file changed since it was marked. Run seed:mark again or remove the line.`,
      );
    }
    if (file.overwriteEditor !== undefined && file.seedUpdate === undefined) {
      issues.push(`${path} sets overwriteEditor with no seedUpdate beside it.`);
    }
    if (file.status === 'needs-review' && !file.sections.questions) {
      issues.push(
        `${path} is needs-review with no "Questions for the Curator" section: say what the owner is to settle.`,
      );
    }
    if (file.status === 'draft' && onRelease) {
      issues.push(
        `${path} is a draft, which ${branch} does not take: finish it or mark it needs-review.`,
      );
    }
    checkNameBases(file, registered, unaudited, issues);
  }

  // The legacy list names only files that still carry the flag: a listed file
  // that has been audited, or that no longer exists, is a stale line.
  const carrying = new Set(
    loaded.files
      .filter((file) => citationsOf(file).some((c) => c.nameBasis === 'unaudited'))
      .map((file) => file.path),
  );
  for (const path of loaded.unaudited) {
    if (!carrying.has(path)) {
      issues.push(
        `${UNAUDITED_LIST} lists ${path}, which carries no unaudited citation: remove the line.`,
      );
    }
  }

  issues.push(
    ...checkCompendium(loaded.shards, {
      works,
      curated,
      whereOf: (_shard, entry) => pathOf.get(entry) ?? entry.name,
      reportContent: (entry) =>
        loaded.files.find((file) => file.entry === entry)?.status === 'approved',
    }),
  );
  return issues;
}

/** Every citation a file holds, the entry's and each form's. */
function citationsOf(file: SeedCompendiumFile): SeedCitation<string>[] {
  return [
    ...file.entry.references,
    ...file.entry.variants.flatMap((variant) => variant.references),
  ];
}

/**
 * The formal-name rule, per citation (CLAUDE.md, "What the compendium says, it sources"): each says how the source's name was
 * matched; `resolved` names its heading and an authority other than itself, doubt keeps the file out of `approved`, and
 * `unaudited` is accepted only on the legacy list.
 */
function checkNameBases(
  file: SeedCompendiumFile,
  registered: ReadonlySet<string>,
  unaudited: ReadonlySet<string>,
  issues: string[],
): void {
  const { entry, path } = file;
  if (!entry.canonicalName) return;
  for (const citation of citationsOf(file)) {
    const at = `${path} cites "${citation.source}"`;
    switch (citation.nameBasis) {
      case undefined:
        issues.push(
          `${at} with no nameBasis: an entry with a formal name says how each source names it.`,
        );
        break;
      case 'resolved':
        if (!citation.headedAs)
          issues.push(`${at} as resolved with no headedAs: name the heading the source uses.`);
        if (!citation.resolvedBy) {
          issues.push(
            `${at} as resolved with no resolvedBy: name the source that maps the heading to the formal name.`,
          );
        } else if (citation.resolvedBy === citation.source) {
          issues.push(`${at} as resolved by itself: resolvedBy is another source.`);
        } else if (!registered.has(citation.resolvedBy)) {
          issues.push(
            `${at} as resolved by "${citation.resolvedBy}", which no work or source file declares.`,
          );
        }
        break;
      case 'unresolved':
        if (file.status === 'approved') {
          issues.push(
            `${at} as unresolved, which an approved file may not: settle the name or mark the file needs-review.`,
          );
        }
        break;
      case 'unaudited':
        if (!unaudited.has(path)) {
          issues.push(
            `${at} as unaudited, and ${UNAUDITED_LIST} does not list the file: the legacy list only shrinks.`,
          );
        }
        break;
      case 'stated':
        break;
    }
    if (citation.nameBasis !== 'resolved' && (citation.headedAs || citation.resolvedBy)) {
      issues.push(`${at} with headedAs or resolvedBy, which only a resolved citation carries.`);
    }
  }
}

/**
 * The ratchet on the legacy list: `unaudited.txt` may only shrink. `baseline` is the list as last committed, so a path the
 * list gains is refused, and a dropped path asks for the baseline to drop it, or it could come back unnoticed.
 */
export function unauditedGrowth(listed: readonly string[], baseline: readonly string[]): string[] {
  const was = new Set(baseline);
  const is = new Set(listed);
  return [
    ...[...is]
      .filter((path) => !was.has(path))
      .map(
        (path) =>
          `${UNAUDITED_LIST} gained ${path}: the legacy list only shrinks. Audit the file's citations instead.`,
      ),
    ...[...was]
      .filter((path) => !is.has(path))
      .map(
        (path) =>
          `${UNAUDITED_LIST} no longer lists ${path}: remove it from the ratchet's baseline too.`,
      ),
  ];
}
