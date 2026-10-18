import Link from 'next/link';
import type { ReactElement } from 'react';
import { capitalise } from '../../lib/text';
import EntryMarks from '../EntryMarks';
import FormIcon from '../FormIcon';
import SafetyNote, { ToxicMark } from '../SafetyNote';
import type { IngredientCardProps } from './types';
import './index.scss';

// One ingredient in a list, for the public compendium (M8.18) and the coven's
// Ingredients page (M9.6) alike: its name as the card's one link, the formal
// name and the forms beneath it (two entries can share a label, and these tell
// them apart), the marks, the caution, and a slot for jar lines. Presentational:
// it takes props only and works out nothing from the data, so the marks, the
// safety note and the stock badge are each the project's one presentation, used
// as they are and never restyled here. claude-docs/components/ingredient-card.md.
const IngredientCard = ({
  href,
  label,
  formalName,
  variants = [],
  safetyNotes,
  toxic,
  kind,
  annotated,
  retired,
  level = 2,
  children,
}: IngredientCardProps): ReactElement => {
  const Heading = `h${level}` as const;
  const formal = (formalName ?? '').trim();

  // The secondary line's items in order: the formal name, then each form.
  const items = [
    ...(formal !== ''
      ? [{ key: 'formal', node: <i className="ingredient-card__formal">{formal}</i> }]
      : []),
    ...variants.map((variant) => ({
      key: `form-${variant.form}`,
      node: (
        <span className="ingredient-card__form">
          <FormIcon name={variant.formChoice?.group.icon ?? null} /> {capitalise(variant.form)}
        </span>
      ),
    })),
  ];

  // Without a mark the row is left out, not left empty, so it adds no gap.
  const marked = Boolean(
    kind !== 'compendium' || retired || toxic || variants.some((v) => v.toxic),
  );

  return (
    <article className="ingredient-card panel">
      <Heading className="ingredient-card__name">
        <Link href={href}>{label}</Link>
      </Heading>
      {items.length > 0 && (
        <p className="ingredient-card__secondary">
          {items.map((item, at) => (
            <span key={item.key} className="ingredient-card__item">
              {/* Decorative: the separator is for the eye, and a screen reader
                  hears the items as the run of text they are. */}
              {at > 0 && <span aria-hidden="true"> · </span>}
              {item.node}
            </span>
          ))}
        </p>
      )}
      {marked && (
        <div className="badges">
          <EntryMarks kind={kind} annotated={annotated} retired={retired} />
          <ToxicMark toxic={toxic} variants={variants} />
        </div>
      )}
      <SafetyNote
        safetyNotes={safetyNotes}
        variants={variants}
        level={(level + 1) as 3 | 4 | 5 | 6}
      />
      {children}
    </article>
  );
};

export default IngredientCard;
export type { IngredientCardProps } from './types';
