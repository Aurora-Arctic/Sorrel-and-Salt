import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';
import FormIcon from '../FormIcon';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import InfoTip from '../InfoTip';
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
import type { IngredientEntryProps } from './types';
import './index.scss';

// An ingredient's page body, the same on the public compendium route and a
// coven's (M8.19): the entry's own fields, then one section per form. No
// hook and no client directive, so either server page renders it directly;
// the ids are built from the entry's own data rather than `useId`, since a
// page holds one entry. claude-docs/components/ingredient-entry.md.

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
  botanical:
    'The botanical name: the name the International Code of Nomenclature for algae, fungi, and plants (ICN) gives the plant.',
  fungal:
    'The fungal name: the name the International Code of Nomenclature for algae, fungi, and plants (ICN) gives the fungus.',
  zoological:
    'The zoological name: the name the International Code of Zoological Nomenclature (ICZN) gives the animal.',
  mineral:
    'The mineral name: an International Mineralogical Association (IMA) species or variety, or the accepted name of a rock, mineraloid or natural glass.',
  chemical:
    'The chemical name: the name the International Union of Pure and Applied Chemistry (IUPAC) gives the substance, or its accepted chemical name.',
};
const FORMAL_NAME_TIP =
  'The formal name: there is one, and which naming system it belongs to is not yet settled.';
const NO_FORMAL_NAME_TIP = 'The formal name: no naming system names this.';

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

function ListBlock({
  block,
  title,
  empty,
  className,
  children,
}: {
  block: Block;
  title: string;
  /** Said in place of the list when it holds nothing, so the heading never stands over nothing. */
  empty?: string;
  className?: string;
  children: ReactNode[];
}): ReactElement {
  return (
    <div className="ingredient-entry__block">
      <h3 id={block.id}>{title}</h3>
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

function CorrespondenceBlock({ block, rows }: { block: Block; rows: Row[] }): ReactElement {
  return (
    <div className="ingredient-entry__block">
      <h3 id={block.id}>Correspondences</h3>
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
      <li key={`${at}-${label}`}>{href ? <Link href={href}>{label}</Link> : label}</li>
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
  hrefOf,
}: {
  detail: VariantDetail;
  anchor: string;
  hrefOf: IngredientEntryProps['hrefOf'];
}): ReactElement {
  const { variant, icon, categories, substitutes } = detail;
  const nameId = `${anchor}-name`;
  // Only what the form adds: the ingredient's own fields stand above, and a
  // form inherits them by the union rule (DESIGN.md §5).
  const rows = correspondences(variant).filter((row) => row.values.length > 0);
  const hasLists = rows.length > 0 || categories.length > 0 || substitutes.length > 0;
  const addsNothing = !said(variant.description) && !said(variant.safetyNotes) && !hasLists;

  return (
    <section id={anchor} className="ingredient-entry__section" aria-labelledby={nameId}>
      <h2 className="ingredient-entry__form-heading">
        <FormIcon name={icon} /> <span id={nameId}>{capitalise(variant.form)}</span>{' '}
        <ToxicMark toxic={variant.toxic} />
      </h2>
      <div className="ingredient-entry__text">
        {said(variant.description) && (
          <p className="ingredient-entry__description">{variant.description}</p>
        )}
        <SafetyNote safetyNotes={variant.safetyNotes} level={3} />
        {addsNothing && (
          <p className="ingredient-entry__empty">
            {variant.toxic
              ? 'This form adds only its Toxic mark to what the ingredient says.'
              : 'This form adds nothing to what the ingredient says.'}
          </p>
        )}
      </div>
      {hasLists && (
        <div className="ingredient-entry__side">
          {rows.length > 0 && (
            <CorrespondenceBlock block={blockOf(anchor, 'correspondences', nameId)} rows={rows} />
          )}
          {categories.length > 0 && (
            <ListBlock
              block={blockOf(anchor, 'categories', nameId)}
              title="Categories"
              className="ingredient-entry__chips"
            >
              {categoryItems(categories)}
            </ListBlock>
          )}
          {substitutes.length > 0 && (
            <ListBlock block={blockOf(anchor, 'substitutes', nameId)} title="Substitutes">
              {substituteItems(substitutes, hrefOf)}
            </ListBlock>
          )}
        </div>
      )}
    </section>
  );
}

const IngredientEntry = ({
  detail,
  hrefOf,
  edit,
  movedAway,
  canonical,
}: IngredientEntryProps): ReactElement => {
  const { entry, folkNames, categories, deities, substitutes, variants } = detail;
  const local = entry.workspaceId !== null;
  const toxic = entry.toxic || variants.some(({ variant }) => variant.toxic);
  const anchors = formAnchors(variants);

  return (
    <article
      className={
        variants.length > 0 ? 'ingredient-entry ingredient-entry--with-nav' : 'ingredient-entry'
      }
    >
      <header className="ingredient-entry__head">
        <FormalName entry={entry} />
        <PageHeader
          title={entry.name}
          action={
            edit && (
              <Link className="btn" href={edit.href}>
                Edit
              </Link>
            )
          }
        />
        {(local || toxic) && (
          <div className="badges">
            {local && <span className="badge badge--local">Local</span>}
            <ToxicMark toxic={entry.toxic} variants={variants.map(({ variant }) => variant)} />
          </div>
        )}
        {canonical && (
          <p className="ingredient-entry__canonical">
            <Link href={canonical}>View in the Compendium</Link>
          </p>
        )}
        {movedAway && (
          // Quiet: on the page from the start, so a status, never an alert.
          <Notice kind="warn" quiet>
            Looking for <Link href={movedAway.href}>{movedAway.name}</Link>? It used to be at this
            address, and has its own page now.
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
          ]}
        />
      )}

      <section id="details" className="ingredient-entry__section" aria-labelledby="details-heading">
        <h2 id="details-heading">Details</h2>
        <div className="ingredient-entry__text">
          {said(entry.description) ? (
            <p className="ingredient-entry__description">{entry.description}</p>
          ) : (
            <p className="ingredient-entry__empty">No description recorded.</p>
          )}
          <SafetyNote safetyNotes={entry.safetyNotes} level={3} />
        </div>
        {/* A plain div, not an aside: one complementary landmark per section
            would be noise, and each block is already headed and labelled. */}
        <div className="ingredient-entry__side">
          <CorrespondenceBlock
            block={blockOf('details', 'correspondences')}
            rows={correspondences(entry, deities)}
          />
          <ListBlock
            block={blockOf('details', 'folk-names')}
            title="Folk Names"
            empty="No folk names recorded."
          >
            {folkNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ListBlock>
          <ListBlock
            block={blockOf('details', 'categories')}
            title="Categories"
            empty="No categories recorded."
            className="ingredient-entry__chips"
          >
            {categoryItems(categories)}
          </ListBlock>
          <ListBlock
            block={blockOf('details', 'substitutes')}
            title="Substitutes"
            empty="No substitutes recorded."
          >
            {substituteItems(substitutes, hrefOf)}
          </ListBlock>
          {/* MB.155's references go here, beneath the substitutes. */}
        </div>
      </section>

      {/* The forms, the last thing drawn: v2's notes section is appended
          after this wrapper, so adding it moves nothing above. */}
      <div className="ingredient-entry__forms">
        {variants.map((variant, at) => (
          <FormSection
            key={variant.variant.id}
            detail={variant}
            anchor={anchors[at]!}
            hrefOf={hrefOf}
          />
        ))}
      </div>
    </article>
  );
};

export default IngredientEntry;
