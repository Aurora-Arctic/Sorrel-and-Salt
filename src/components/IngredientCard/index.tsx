import Link from 'next/link';
import type { ReactElement } from 'react';
import { chipColors } from '../../lib/chip-colors';
import { capitalise } from '../../lib/text';
import EntryMarks from '../EntryMarks';
import FormIcon from '../FormIcon';
import { ToxicMark } from '../SafetyNote';
import { isBinomial } from '@/modules/ingredients/schema/ingredient-enums';
import type { IngredientCardProps } from './types';
import './index.scss';

// One ingredient in a list, for the public compendium (M8.18) and the coven's
// Ingredients page (M9.6) alike: its name as the card's one link, the formal
// name and the forms beneath it (two entries can share a label, and these tell
// them apart), the marks, and a slot for jar lines. Presentational:
// it takes props only and works out nothing from the data, so the marks and the
// stock badge are each the project's one presentation, used
// as they are and never restyled here. claude-docs/components/ingredient-card.md.
const IngredientCard = ({
  href,
  label,
  formalName,
  nomenclature,
  variants = [],
  categories = [],
  toxic,
  kind,
  annotated,
  retired,
  level = 2,
  children,
}: IngredientCardProps): ReactElement => {
  const Heading = `h${level}` as const;
  const formal = (formalName ?? '').trim();

  // Without a mark the cluster is left out, not left empty, so it adds no gap.
  const marked = Boolean(
    kind !== 'compendium' || retired || toxic || variants.some((v) => v.toxic),
  );

  return (
    <article className="ingredient-card specimen">
      <div className="specimen__top">
        <div>
          <Heading className="ingredient-card__name">
            <Link href={href}>{label}</Link>
          </Heading>
          {formal !== '' && (
            <p className="meta ingredient-card__formal">
              {/* `i` rather than `em`: a taxonomic name is set apart, not stressed.
                  Only a binomial is italic; a mineral or chemical name is upright
                  (the entry page’s rule, `isBinomial`). */}
              {nomenclature && isBinomial(nomenclature) ? (
                <i className="binomial">{formal}</i>
              ) : (
                formal
              )}
            </p>
          )}
        </div>
        {marked && (
          <div className="specimen__badges">
            <EntryMarks kind={kind} annotated={annotated} retired={retired} />
            <ToxicMark toxic={toxic} variants={variants} />
          </div>
        )}
      </div>
      {variants.length > 0 && (
        <p className="ingredient-card__forms">
          {variants.map((variant, at) => (
            <span key={variant.form} className="ingredient-card__item">
              {/* Decorative: the separator is for the eye, and a screen reader
                  hears the forms as the run of text they are. */}
              {at > 0 && <span aria-hidden="true">·</span>}
              <span className="ingredient-card__form">
                <FormIcon name={variant.formChoice?.group.icon ?? null} />{' '}
                {capitalise(variant.form)}
              </span>
            </span>
          ))}
        </p>
      )}
      {categories.length > 0 && (
        <ul className="specimen__chips" aria-label="Categories">
          {categories.map(({ category, group }) => (
            <li key={category.id}>
              <span className="chip" style={chipColors(group)}>
                {category.name}
              </span>
            </li>
          ))}
        </ul>
      )}
      {children != null && children !== false && <div className="specimen__stock">{children}</div>}
    </article>
  );
};

export default IngredientCard;
export type { IngredientCardProps } from './types';
