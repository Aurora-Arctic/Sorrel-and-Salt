import { Fragment, type ReactElement, type ReactNode } from 'react';
import { chipColors } from '../../lib/chip-colors';
import { capitalise, hasText } from '../../lib/text';
import CorrespondenceValue from './correspondence-value';
import type { SourcedValue } from './types';
import type { CategoryDetail, DeityDetail } from '@/modules/ingredients';
import './index.scss';
import { cx } from '@/lib/class-names';

export interface Row {
  label: string;
  values: string[];
  /** Parallel to `values`: the ingredients that gave each one. */
  sources?: string[][];
}

// Elements are plain text here: the spell page's combined values arrive as strings, not the column's enum.
interface Correspondences<T> {
  elements: readonly T[];
  celestialBodies: readonly T[];
  zodiacSigns: readonly T[];
  colors: readonly T[];
}

type PlainCorrespondences = {
  [K in keyof Correspondences<string>]: readonly string[] | null;
};

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
  source: Correspondences<SourcedValue>,
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
    });
  }
  // A group with no value is left out, so a block never draws an empty line.
  return rows.filter((row) => row.values.length > 0);
}

const unsourced = (values: readonly string[] | null): SourcedValue[] =>
  (values ?? []).map((value) => ({ value, sources: [] }));

/** The ingredient page's rows: no value has sources, so none is a button. */
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

/** The spell page's rows: each value keeps the ingredients that gave it. */
export const sourcedCorrespondences = rowsOf;

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
                const sources = row.sources?.[index] ?? [];
                return (
                  <Fragment key={`${index}-${value}`}>
                    {index > 0 && ', '}
                    {sources.length > 0 ? (
                      <CorrespondenceValue value={value} sources={sources} />
                    ) : (
                      value
                    )}
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
