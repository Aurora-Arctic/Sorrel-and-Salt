import { Fragment, type ReactElement, type ReactNode } from 'react';
import { chipColors } from '../../lib/chip-colors';
import { capitalise, hasText } from '../../lib/text';
import CorrespondenceValue from './correspondence-value';
import type {
  PlainCorrespondences,
  Row,
  ValueCardProps,
  SourcedCorrespondences,
  SourcedValue,
} from './types';
import type { CategoryDetail, DeityDetail } from '@/modules/ingredients';
import { cx } from '@/lib/class-names';

export type { Row } from './types';

/** One row. A blank value goes and takes its sources with it, so `sources[i]` always belongs to `values[i]`. */
function rowOf(
  label: string,
  found: readonly SourcedValue[],
  format = (value: string) => value,
): Row {
  const kept = found.filter(({ value }) => hasText(value));
  return {
    label,
    values: kept.map(({ value }) => format(value)),
    sources: kept.map(({ sources }) => [...sources]),
  };
}

function rowsOf(
  source: SourcedCorrespondences,
  deities?: readonly SourcedValue<DeityDetail>[],
): Row[] {
  const rows = [
    rowOf('Elements', source.elements, capitalise),
    rowOf('Celestial Bodies', source.celestialBodies),
    rowOf('Zodiac Signs', source.zodiacSigns),
    rowOf('Colours', source.colors, capitalise),
  ];
  if (deities) {
    rows.push({
      label: 'Deities',
      values: deities.map(({ value }) => deityMention(value)),
      sources: deities.map(({ sources }) => [...sources]),
      deities: deities.map(({ value }) => value),
    });
  }
  // A group with no value is left out, so a block never draws an empty line.
  return rows.filter((row) => row.values.length > 0);
}

const unsourced = (values: readonly string[] | null): SourcedValue[] =>
  (values ?? []).map((value) => ({ value, sources: [] }));

export function correspondences(
  source: PlainCorrespondences,
  deities?: readonly DeityDetail[],
): Row[] {
  return rowsOf(
    {
      elements: unsourced(source.elements),
      celestialBodies: unsourced(source.celestialBodies),
      zodiacSigns: unsourced(source.zodiacSigns),
      colors: unsourced(source.colors),
    },
    deities?.map((value) => ({ value, sources: [] })),
  );
}

export const sourcedCorrespondences = rowsOf;

/** A deity as the Deities row names it: its tradition in brackets. Its other names are in its card. */
const deityMention = ({ name, tradition }: DeityDetail): string =>
  tradition ? `${name} (${tradition})` : name;

/** A value's card, or none when it has nothing to say past the row: no ingredient gave it and it names no deity with other names. */
function cardOf(row: Row, value: string, index: number): ValueCardProps | null {
  const sources = row.sources?.[index] ?? [];
  const deity = row.deities?.[index];
  if (sources.length === 0 && !deity?.otherNames.length) return null;
  return deity
    ? { title: deity.name, tradition: deity.tradition, otherNames: deity.otherNames, sources }
    : { title: value, sources };
}

export interface Block {
  id: string;
  labelledBy: string;
}

export function blockOf(prefix: string, key: string, nameId?: string): Block {
  const id = `${prefix}-${key}`;
  return { id, labelledBy: nameId ? `${nameId} ${id}` : id };
}

export type BlockLevel = 2 | 3 | 4;

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
            <dd>
              {row.values.map((value, index) => {
                const card = cardOf(row, value, index);
                return (
                  <Fragment key={`${index}-${value}`}>
                    {index > 0 && ', '}
                    {card ? <CorrespondenceValue value={value} card={card} /> : value}
                  </Fragment>
                );
              })}
            </dd>
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
