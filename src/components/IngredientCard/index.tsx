import { Fragment, type ReactElement } from 'react';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import CategoryChips from '../CategoryChips';
import EntryMarks, { RecencyMark } from '../EntryMarks';
import FormIcon from '../FormIcon';
import DetailsLink from '../IngredientEntry/details-link';
import LinkHint from '../LinkHint';
import { CautionMark, ToxicMark } from '../SafetyNote';
import { isBinomial } from '@/modules/ingredients/schema/ingredient-enums';
import type { IngredientCardProps } from './types';
import './index.scss';

// One ingredient in a list, for the public compendium (M8.18) and the coven's
// Ingredients page (M9.6) alike: its name as the card's link (with a Quick Look
// eye beside it on the coven's list, M12.5), the formal
// name and the forms beneath it (two entries can share a label, and these tell
// them apart), the marks, and a slot for jar lines. Presentational:
// it takes props only and works out nothing from the data, so the marks and the
// stock badge are each the project's one presentation, used
// as they are and never restyled here. claude-docs/components/ingredient-card.md.
const IngredientCard = ({
  href,
  opens,
  label,
  formalName,
  nomenclature,
  variants = [],
  categories = [],
  toxic,
  safetyNotes,
  kind,
  annotated,
  retired,
  recency,
  level = 2,
  actions,
  children,
}: IngredientCardProps): ReactElement => {
  const Heading = `h${level}` as const;
  const formal = (formalName ?? '').trim();

  // Without a mark the cluster is left out, not left empty, so it adds no gap.
  const marked = Boolean(
    kind !== 'compendium' ||
    retired ||
    toxic ||
    variants.some((v) => v.toxic) ||
    (safetyNotes ?? '').trim() !== '' ||
    variants.some((v) => (v.safetyNotes ?? '').trim() !== ''),
  );

  const jars = children != null && children !== false;
  const hasActions = actions != null && actions !== false;

  return (
    <article className="ingredient-card specimen">
      {/* The top right of the card, above the name row (the owner, 2026-10-19). */}
      <RecencyMark recency={recency} />
      <div className="specimen__top">
        <div className="ingredient-card__heading">
          <Heading className="ingredient-card__name">
            {/* The entry page draws its own frame while it loads, so the link names it (M12.33). */}
            <PendingLink href={href} navigationTarget={ingredientLinkTarget(href)}>
              {label} <LinkHint />
            </PendingLink>
          </Heading>
          {/* Outside the heading, so its name stays the entry's alone; in its line. */}
          {opens && (
            <>
              {' '}
              <DetailsLink opens={opens} name={formal ? `${label}, ${formal}` : label} />
            </>
          )}
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
            <CautionMark safetyNotes={safetyNotes} variants={variants} />
            <ToxicMark toxic={toxic} variants={variants} />
          </div>
        )}
      </div>
      <CategoryChips categories={categories} label={label} />
      {variants.length > 0 && (
        <p className="ingredient-card__forms">
          {variants.map((variant, at) => (
            <Fragment key={variant.form}>
              {at > 0 && ' '}
              <span className="ingredient-card__item">
                <span className="ingredient-card__form">
                  <FormIcon name={variant.formChoice?.group.icon ?? null} />
                  {/* The eye gets a dot drawn in CSS (it is not text, so it is never
                      announced, and it can be clipped at the start of a wrapped line);
                      a screen reader gets this comma. Inside the label's own inline span,
                      not a flex child: Chrome sets a flex child apart with spaces, which
                      read "Herb , Oil". */}
                  <span>
                    {formLabel(variant.form)}
                    {at < variants.length - 1 && <span className="spoken-separator">,</span>}
                  </span>
                </span>
              </span>
            </Fragment>
          ))}
        </p>
      )}
      {(jars || hasActions) && (
        // The foot: the jar lines, then the actions. Pushed to the card's bottom edge
        // (`margin-top: auto`), so cards in one grid row end on the same line.
        <div className="specimen__foot">
          {jars && <div className="specimen__stock">{children}</div>}
          {hasActions && <div className="specimen__actions">{actions}</div>}
        </div>
      )}
    </article>
  );
};

export default IngredientCard;
export type { IngredientCardProps, CardCategory } from './types';
