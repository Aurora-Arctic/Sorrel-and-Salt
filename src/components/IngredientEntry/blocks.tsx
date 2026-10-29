import type { ReactElement, ReactNode } from 'react';
import { chipColors } from '../../lib/chip-colors';
import { capitalise } from '../../lib/text';
import type { CategoryDetail, DeityDetail, IngredientRow } from '@/modules/ingredients';
// Holds `.ingredient-entry__empty`, which these blocks say "None recorded" in.
import './index.scss';

// The entry page's blocks, drawn by its Details, its form sections and the details modal's summary:
// a headed list, the correspondences, the category chips, and the ids tying each heading to its
// content. Server-renderable, with no hook.

/** Blank counts as nothing said, as `SafetyNote` counts it. */
export const said = (text: string | null | undefined): text is string => (text ?? '').trim() !== '';

export const listed = (values: readonly string[] | null | undefined): string[] =>
  (values ?? []).filter(said);

/** One correspondence row: its label and what it lists, possibly nothing. */
export interface Row {
  label: string;
  values: string[];
}

type Correspondences = Pick<
  IngredientRow,
  'elements' | 'celestialBodies' | 'zodiacSigns' | 'colors'
>;

export function correspondences(source: Correspondences, deities?: readonly DeityDetail[]): Row[] {
  const rows: Row[] = [
    { label: 'Elements', values: listed(source.elements).map(capitalise) },
    { label: 'Celestial Bodies', values: listed(source.celestialBodies) },
    { label: 'Zodiac Signs', values: listed(source.zodiacSigns) },
    { label: 'Colours', values: listed(source.colors).map(capitalise) },
  ];
  if (deities) {
    rows.push({
      label: 'Deities',
      values: deities.map(deityMention),
    });
  }
  return rows;
}

/** A deity as the Deities row names it: its tradition and other names in brackets, parted by a semicolon because the row joins its values with commas. */
function deityMention({ name, tradition, otherNames }: DeityDetail): string {
  const parts = [
    tradition ?? [],
    otherNames.length > 0 ? `also called ${otherNames.join(', ')}` : [],
  ].flat();
  return parts.length > 0 ? `${name} (${parts.join('; ')})` : name;
}

/** The ids one block of a section takes: its heading's, and what names its content. */
export interface Block {
  /** The block's own heading id. */
  id: string;
  /** What names the list: the heading alone, or the form's name before it. */
  labelledBy: string;
}

export function blockOf(prefix: string, key: string, nameId?: string): Block {
  const id = `${prefix}-${key}`;
  return { id, labelledBy: nameId ? `${nameId} ${id}` : id };
}

/** A block's heading level: below Details' h2, or below a form's h3. */
export type BlockLevel = 3 | 4;

export function ListBlock({
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

export function CorrespondenceBlock({
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

export const categoryItems = (categories: readonly CategoryDetail[]): ReactNode[] =>
  categories.map(({ category, group }) => (
    <li key={category.id}>
      <span className="chip" style={chipColors(group)}>
        {category.name}
      </span>
    </li>
  ));
