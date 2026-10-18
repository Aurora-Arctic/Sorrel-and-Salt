import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';
import FormIcon from '../FormIcon';
// From its own client file: the Modal index re-exports modules a server
// component cannot import.
import { RouteModalProvider } from '../Modal/route-modal-provider';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import InfoTip from '../InfoTip';
import { LinkIcon } from '../IconTip';
import LinkHint from '../LinkHint';
import SafetyNote, { ToxicMark } from '../SafetyNote';
import { chipColors } from '../../lib/chip-colors';
import { slugify } from '../../lib/slugify';
import { capitalise } from '../../lib/text';
import {
  BINOMIAL_KINDS,
  NAMELESS_KIND,
  type NomenclatureKind,
} from '@/modules/ingredients/schema/ingredient-enums';
import type {
  IngredientRow,
  CategoryDetail,
  DeityDetail,
  SubstituteDetail,
  VariantDetail,
} from '@/modules/ingredients';
import { applyCupboardEntry, isAnnotated } from '@/modules/ingredients/validation/cupboard-merge';
import CupboardActions from './cupboard-actions';
import EditButton from './edit-button';
import { DETAILS, NoteMarks, ReferencesSection, referenceNotes } from './references';
import EntryDialog from './entry-dialog';
import type { IngredientEntryProps } from './types';
import './index.scss';

// An ingredient's page body, the same on the public compendium route and a
// coven's (M8.19): the entry's own fields, then one section per form. No
// hook and no client directive, so either server page renders it directly;
// the ids are built from the entry's own data rather than `useId`, since a
// page holds one entry. Edit is the exception in kind only: it is two small
// client parts, a link and the modal it opens, which this server component
// renders. claude-docs/components/ingredient-entry.md.

/** Blank counts as nothing said, as `SafetyNote` counts it. */
const said = (text: string | null | undefined): text is string => (text ?? '').trim() !== '';

const listed = (values: readonly string[] | null | undefined): string[] =>
  (values ?? []).filter(said);

/** Each settled nomenclature's formal name, as its label says it. */
const NAME_LABELS: Partial<Record<NomenclatureKind, string>> = {
  botanical: 'Botanical Name',
  fungal: 'Fungal Name',
  zoological: 'Zoological Name',
  mineral: 'Mineral Name',
  chemical: 'Chemical Name',
};

/**
 * What the formal name is, said in the tip beside it, since the page shows
 * the name alone (the owner's call): which naming system governs it, as
 * DESIGN.md §5's nomenclature table states each kind.
 */
const NAME_TIPS: Partial<Record<NomenclatureKind, string>> = {
  botanical: 'Its botanical name, under the ICN.',
  fungal: 'Its fungal name, under the ICN.',
  zoological: 'Its zoological name, under the ICZN.',
  mineral: 'Its mineral name: an IMA species or variety, or a rock, mineraloid or natural glass.',
  chemical: 'Its chemical name, IUPAC\u2019s or the accepted one.',
};
const FORMAL_NAME_TIP = 'Its formal name; which naming system it belongs to is not yet settled.';
const NO_FORMAL_NAME_TIP = 'No naming system names it.';

/** One correspondence row: its label and what it lists, possibly nothing. */
interface Row {
  label: string;
  values: string[];
}

type Correspondences = Pick<
  IngredientRow,
  'elements' | 'celestialBodies' | 'zodiacSigns' | 'colors'
>;

function correspondences(source: Correspondences, deities?: readonly DeityDetail[]): Row[] {
  const rows: Row[] = [
    { label: 'Elements', values: listed(source.elements).map(capitalise) },
    { label: 'Planets', values: listed(source.celestialBodies) },
    { label: 'Zodiac Signs', values: listed(source.zodiacSigns) },
    { label: 'Colours', values: listed(source.colors).map(capitalise) },
  ];
  if (deities) {
    rows.push({
      label: 'Deities',
      values: deities.map(({ name, tradition }) => (tradition ? `${name} (${tradition})` : name)),
    });
  }
  return rows;
}

/**
 * The formal name beside the label, never blank (MB.161): italics only for a
 * binomial; an unsettled kind's name upright and marked unconfirmed; and a
 * sentence where there is none, saying why.
 */
function FormalName({ entry }: { entry: IngredientRow }): ReactElement {
  const formal = (entry.canonicalName ?? '').trim();
  const label = NAME_LABELS[entry.nomenclature] ?? 'Formal Name';
  const tip =
    entry.nomenclature === NAMELESS_KIND
      ? NO_FORMAL_NAME_TIP
      : (NAME_TIPS[entry.nomenclature] ?? FORMAL_NAME_TIP);
  let value: ReactNode;
  if (entry.nomenclature === NAMELESS_KIND) {
    value = <span className="ingredient-entry__empty">None — no naming system names it</span>;
  } else if (formal === '') {
    value = <span className="ingredient-entry__empty">Not yet looked up</span>;
  } else if (BINOMIAL_KINDS.has(entry.nomenclature)) {
    // `i` rather than `em`: a taxonomic name is set apart, not stressed.
    value = <i className="binomial">{formal}</i>;
  } else if (NAME_LABELS[entry.nomenclature]) {
    value = formal;
  } else {
    value = (
      <>
        {formal} <span className="ingredient-entry__empty">(unconfirmed)</span>
      </>
    );
  }
  return (
    // The name alone, as an eyebrow over the heading, with what it is in a
    // tip beside it (the owner's call). Still a term and its definition, the
    // term hidden from sight, so a screen reader hears "Botanical Name" first.
    <dl className="ingredient-entry__formal">
      <div>
        <dt>{label}</dt>
        <dd>
          <span className="eyebrow">{value}</span>{' '}
          <InfoTip id="formal-name-tip" label={label}>
            {tip}
          </InfoTip>
        </dd>
      </div>
    </dl>
  );
}

const substituteLabel = ({ name, form }: SubstituteDetail): string =>
  form ? `${name} (${form})` : name;

/** The ids one block of a section takes: its heading's, and what names its content. */
interface Block {
  /** The block's own heading id. */
  id: string;
  /** What names the list: the heading alone, or the form's name before it. */
  labelledBy: string;
}

function blockOf(prefix: string, key: string, nameId?: string): Block {
  const id = `${prefix}-${key}`;
  return { id, labelledBy: nameId ? `${nameId} ${id}` : id };
}

/** A block's heading level: below Details' h2, or below a form's h3. */
type BlockLevel = 3 | 4;

function ListBlock({
  block,
  title,
  level,
  empty,
  className,
  children,
}: {
  block: Block;
  title: string;
  level: BlockLevel;
  /** Said in place of the list when it holds nothing, so the heading never stands over nothing. */
  empty?: string;
  className?: string;
  children: ReactNode[];
}): ReactElement {
  const Heading = `h${level}` as const;
  return (
    <div className="ingredient-entry__block">
      <Heading id={block.id}>{title}</Heading>
      {children.length > 0 ? (
        <ul
          className={className ? `ingredient-entry__list ${className}` : 'ingredient-entry__list'}
          aria-labelledby={block.labelledBy}
        >
          {children}
        </ul>
      ) : (
        empty && <p className="ingredient-entry__empty">{empty}</p>
      )}
    </div>
  );
}

function CorrespondenceBlock({
  block,
  rows,
  level,
}: {
  block: Block;
  rows: Row[];
  level: BlockLevel;
}): ReactElement {
  const Heading = `h${level}` as const;
  return (
    <div className="ingredient-entry__block">
      <Heading id={block.id}>Correspondences</Heading>
      <dl className="ingredient-entry__correspondences" aria-labelledby={block.labelledBy}>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            {row.values.length > 0 ? (
              <dd>{row.values.join(', ')}</dd>
            ) : (
              <dd className="ingredient-entry__empty">None recorded</dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}

const categoryItems = (categories: readonly CategoryDetail[]): ReactNode[] =>
  categories.map(({ category, group }) => (
    <li key={category.id}>
      <span className="chip" style={chipColors(group)}>
        {category.name}
      </span>
    </li>
  ));

function substituteItems(
  substitutes: readonly SubstituteDetail[],
  hrefOf: IngredientEntryProps['hrefOf'],
): ReactNode[] {
  return substitutes.map((substitute, at) => {
    // A typed name, or a link whose ingredient was deleted, reads as text
    // under its last name (MB.138, MB.140); so does one the caller has no
    // page for.
    const href = substitute.ingredient ? hrefOf(substitute.ingredient) : undefined;
    const label = substituteLabel(substitute);
    return (
      // A typed name may repeat, so its place keys it.
      <li key={`${at}-${label}`}>
        {href ? (
          <Link href={href}>
            {label} <LinkHint />
          </Link>
        ) : (
          label
        )}
      </li>
    );
  });
}

/**
 * Each form's anchor: its name through `slugify`, as DESIGN.md §9 has it
 * (`#form-oil`). Two forms are unique by their trimmed lower-cased names,
 * which can still slug alike ("oil" and "oil."), so a repeat takes a count.
 */
function formAnchors(variants: readonly VariantDetail[]): string[] {
  const seen = new Map<string, number>();
  return variants.map(({ variant }) => {
    const slug = slugify(variant.form);
    const count = (seen.get(slug) ?? 0) + 1;
    seen.set(slug, count);
    return count === 1 ? `form-${slug}` : `form-${slug}-${count}`;
  });
}

function FormSection({
  detail,
  anchor,
  numbers,
  hrefOf,
}: {
  detail: VariantDetail;
  anchor: string;
  /** The note numbers its own sources take, which end its text. */
  numbers: readonly number[];
  hrefOf: IngredientEntryProps['hrefOf'];
}): ReactElement {
  const { variant, icon, categories, substitutes } = detail;
  const nameId = `${anchor}-name`;
  // Only what the form adds: the ingredient's own fields stand above, and a
  // form inherits them by the union rule (DESIGN.md §5).
  const rows = correspondences(variant).filter((row) => row.values.length > 0);
  const hasLists = rows.length > 0 || categories.length > 0 || substitutes.length > 0;
  const addsNothing =
    !said(variant.description) && !said(variant.safetyNotes) && !hasLists && numbers.length === 0;

  return (
    <section id={anchor} className="ingredient-entry__section" aria-labelledby={nameId}>
      <h3 className="ingredient-entry__form-heading">
        <FormIcon name={icon} /> <span id={nameId}>{capitalise(variant.form)}</span>{' '}
        <ToxicMark toxic={variant.toxic} />
      </h3>
      <div className="ingredient-entry__text">
        {said(variant.description) && (
          <p className="ingredient-entry__description">{variant.description}</p>
        )}
        <SafetyNote safetyNotes={variant.safetyNotes} level={4} />
        {addsNothing && (
          <p className="ingredient-entry__empty">
            {variant.toxic
              ? 'This form adds only its Toxic mark to what the ingredient says.'
              : 'This form adds nothing to what the ingredient says.'}
          </p>
        )}
        <NoteMarks section={anchor} numbers={numbers} />
      </div>
      {hasLists && (
        <div className="ingredient-entry__side">
          {rows.length > 0 && (
            <CorrespondenceBlock
              block={blockOf(anchor, 'correspondences', nameId)}
              rows={rows}
              level={4}
            />
          )}
          {categories.length > 0 && (
            <ListBlock
              block={blockOf(anchor, 'categories', nameId)}
              title="Categories"
              level={4}
              className="ingredient-entry__chips"
            >
              {categoryItems(categories)}
            </ListBlock>
          )}
          {substitutes.length > 0 && (
            <ListBlock block={blockOf(anchor, 'substitutes', nameId)} title="Substitutes" level={4}>
              {substituteItems(substitutes, hrefOf)}
            </ListBlock>
          )}
        </div>
      )}
    </section>
  );
}

// The side column's link to the compendium (M12.12), for both cases: a coven's
// own entry lists the compendium entries it replaces, and a compendium entry
// viewed in a coven lists itself, once, at its public page. The page chooses the
// ⓘ sentence for each, so the component does not branch on tier. A block headed
// like its siblings (an h3, and no entry in the jump menu, which lists sections),
// with one ⓘ beside the heading saying why they are shown, and not one per
// link; the list is described by it, as a field is by its hint. Each link is the
// entry's own title, so the titles tell them apart and nothing is hidden.
// Three at most, then "See All" to the compendium search for the label: a
// paragraph after the list, not an item in it, since it is not an entry.
function ReplacesBlock({
  replaces,
}: {
  replaces: NonNullable<IngredientEntryProps['replaces']>;
}): ReactElement {
  const block = blockOf('details', 'compendium');
  const whyId = `${block.id}-why`;
  return (
    <div className="ingredient-entry__block ingredient-entry__replaces">
      <div className="ingredient-entry__heading-row">
        <h3 id={block.id}>In the Compendium</h3>
        <InfoTip id={whyId} label="In the Compendium">
          {replaces.tip}
        </InfoTip>
      </div>
      <ul
        className="ingredient-entry__list ingredient-entry__replaced"
        aria-labelledby={block.id}
        aria-describedby={whyId}
      >
        {replaces.entries.map(({ title, href }) => (
          <li key={href}>
            <Link href={href}>
              {title}
              <LinkIcon />
              <LinkHint />
            </Link>
          </li>
        ))}
      </ul>
      {replaces.allHref && replaces.total > replaces.entries.length && (
        <p className="ingredient-entry__see-all">
          <Link href={replaces.allHref}>
            See All {replaces.total}
            <LinkHint />
          </Link>
        </p>
      )}
    </div>
  );
}

const IngredientEntry = ({
  detail,
  hrefOf,
  edit,
  movedAway,
  replaces,
  cupboard,
}: IngredientEntryProps): ReactElement => {
  const { cupboardEntry, folkNames, categories, deities, substitutes, variants, retired } = detail;
  // `entry` is the row as the compendium has it, which edit and identity use;
  // `shown` lays the coven's cupboard entry over it for what the page says.
  // Three kinds: ours (a coven's row, Local), the compendium's held in this
  // cupboard (the marks), and the compendium's not held (neither).
  const { entry } = detail;
  const shown = applyCupboardEntry(entry, cupboardEntry);
  const local = entry.workspaceId !== null;
  const held = !local && cupboardEntry != null;
  const relabelled = held && shown.name !== entry.name;
  const toxic = entry.toxic || variants.some(({ variant }) => variant.toxic);
  const anchors = formAnchors(variants);
  const notes = referenceNotes(
    detail,
    anchors,
    variants.map(({ variant }) => capitalise(variant.form)),
  );

  // Only the fields the client parts use cross to them, not the whole row.
  const editable = {
    id: entry.id,
    name: entry.name,
    canonicalName: entry.canonicalName,
    nomenclature: entry.nomenclature,
  };

  const page = (
    <article
      className={
        variants.length > 0 ? 'ingredient-entry ingredient-entry--with-nav' : 'ingredient-entry'
      }
    >
      <header className="ingredient-entry__head">
        <FormalName entry={entry} />
        <PageHeader
          title={shown.name}
          action={
            (edit || cupboard) && (
              <>
                {edit && <EditButton href={edit.href} entry={editable} />}
                {cupboard && !local && (
                  <CupboardActions
                    {...cupboard}
                    ingredientId={entry.id}
                    held={held}
                    compendium={{
                      name: entry.name,
                      description: entry.description,
                      safetyNotes: entry.safetyNotes,
                      elements: entry.elements ?? [],
                      celestialBodies: entry.celestialBodies ?? [],
                      zodiacSigns: entry.zodiacSigns ?? [],
                      colors: entry.colors ?? [],
                    }}
                    overrides={{
                      label: cupboardEntry?.label ?? null,
                      description: cupboardEntry?.description ?? null,
                      safetyNotes: cupboardEntry?.safetyNotes ?? null,
                      elements: cupboardEntry?.elements ?? null,
                      celestialBodies: cupboardEntry?.celestialBodies ?? null,
                      zodiacSigns: cupboardEntry?.zodiacSigns ?? null,
                      colors: cupboardEntry?.colors ?? null,
                    }}
                  />
                )}
              </>
            )
          }
        />
        {relabelled && (
          <p className="ingredient-entry__compendium-name">
            Called <span>{entry.name}</span> in the Compendium
          </p>
        )}
        {(local || held || toxic || retired) && (
          <div className="badges">
            {local && <span className="badge badge--local">Local</span>}
            {/* Where the row lives, as Local is, and in a neutral tint: neither is a warning. */}
            {held && <output className="badge badge--low-stock">From the Compendium</output>}
            {held && isAnnotated(cupboardEntry) && (
              <output className="badge badge--low-stock">Annotated</output>
            )}
            {/* A compendium entry the curators retired, read because this
                coven's cupboard names it (M12.24). An `output`, so it carries
                the status role: on the page from the start, never announced. */}
            {retired && (
              <output className="badge badge--retired">No Longer in the Compendium</output>
            )}
            <ToxicMark toxic={entry.toxic} variants={variants.map(({ variant }) => variant)} />
          </div>
        )}
        {movedAway && (
          // Quiet: on the page from the start, so a status, never an alert.
          <Notice kind="warn" quiet>
            The ingredient that was at this address has been moved to{' '}
            <Link href={movedAway.href}>
              {movedAway.name} <LinkHint />
            </Link>
          </Notice>
        )}
      </header>

      {variants.length > 0 && (
        <PageNav
          label="On this page"
          entries={[
            { href: '#details', label: 'Details' },
            ...variants.map(({ variant }, at) => ({
              href: `#${anchors[at]}` as const,
              label: capitalise(variant.form),
              group: 'Forms',
            })),
            { href: '#references', label: 'References', apart: true },
          ]}
        />
      )}

      <section id="details" className="ingredient-entry__section" aria-labelledby="details-heading">
        <h2 id="details-heading">Details</h2>
        <div className="ingredient-entry__text">
          {said(shown.description) ? (
            <p className="ingredient-entry__description">{shown.description}</p>
          ) : (
            <p className="ingredient-entry__empty">No description recorded.</p>
          )}
          <SafetyNote safetyNotes={shown.safetyNotes} level={3} />
          <NoteMarks section={DETAILS} numbers={notes.numbersOf(DETAILS)} />
        </div>
        {/* A plain div, not an aside: one complementary landmark per section
            would be noise, and each block is already headed and labelled. */}
        <div className="ingredient-entry__side">
          {replaces && <ReplacesBlock replaces={replaces} />}
          <CorrespondenceBlock
            block={blockOf('details', 'correspondences')}
            rows={correspondences(shown, deities)}
            level={3}
          />
          <ListBlock
            block={blockOf('details', 'folk-names')}
            title="Folk Names"
            level={3}
            empty="No folk names recorded."
          >
            {folkNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ListBlock>
          <ListBlock
            block={blockOf('details', 'categories')}
            title="Categories"
            level={3}
            empty="No categories recorded."
            className="ingredient-entry__chips"
          >
            {categoryItems(categories)}
          </ListBlock>
          <ListBlock
            block={blockOf('details', 'substitutes')}
            title="Substitutes"
            level={3}
            empty="No substitutes recorded."
          >
            {substituteItems(substitutes, hrefOf)}
          </ListBlock>
        </div>
      </section>

      {/* The forms, headed so
          the forms read as one part of the page (the owner's call), each
          form a level beneath. */}
      {variants.length > 0 && (
        <section id="forms" className="ingredient-entry__forms" aria-labelledby="forms-heading">
          <h2 id="forms-heading">Forms</h2>
          {variants.map((variant, at) => (
            <FormSection
              key={variant.variant.id}
              detail={variant}
              anchor={anchors[at]!}
              numbers={notes.numbersOf(anchors[at]!)}
              hrefOf={hrefOf}
            />
          ))}
        </section>
      )}

      {/* Last, so v2's notes section, appended beneath it, moves nothing. */}
      <ReferencesSection model={notes} />
    </article>
  );

  // The provider holds a pressed Edit on its way, shared by the link and the
  // dialog (M9.18). The admin layout has one above its pages; these two routes
  // have none, and a provider already above is kept, so this one is safe
  // beneath any. Only an entry that can be edited needs it.
  return edit ? (
    <RouteModalProvider>
      {page}
      <EntryDialog entry={editable} edit={edit} />
    </RouteModalProvider>
  ) : (
    page
  );
};

export default IngredientEntry;
