import type { ReactElement, ReactNode } from 'react';
import { chipColors } from '../../lib/chip-colors';
import { capitalise, hasText } from '../../lib/text';
import type { CategoryDetail, DeityDetail, IngredientRow } from '@/modules/ingredients';
import './index.scss';
import { cx } from '@/lib/class-names';

const listed = (values: readonly string[] | null | undefined): string[] =>
  (values ?? []).filter(hasText);

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

export interface Block {
  id: string;
  labelledBy: string;
}

export function blockOf(prefix: string, key: string, nameId?: string): Block {
  const id = `${prefix}-${key}`;
  return { id, labelledBy: nameId ? `${nameId} ${id}` : id };
}

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
        <ul className={cx('ingredient-entry__list', className)} aria-labelledby={block.labelledBy}>
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
              <dd className="ingredient-entry__empty">{`No ${row.label.toLowerCase()} recorded.`}</dd>
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
