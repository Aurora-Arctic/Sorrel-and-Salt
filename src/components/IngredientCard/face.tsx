'use client';

import { Fragment, type ReactElement } from 'react';
import { hasText } from '@/lib/text';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { PendingLink } from '../../lib/navigation';
import CategoryChips from '../CategoryChips';
import EntryMarks from '../EntryMarks';
import FormIcon from '../FormIcon';
import LastEdit from '../LastEdit';
import LinkHint from '../LinkHint';
import { isBinomial } from '@/modules/ingredients/schema/ingredient-enums';
import { useNamedCategories } from './category-vocabulary';
import { IngredientCardFrame } from './frame';
import type { IngredientCardProps } from './types';
import './index.scss';

// The card as drawn, in the browser: a client component, so the page sends its props once rather than
// its whole drawn markup beside the HTML. `index.tsx` hands it the props it needs and no more.

const CardFace = ({
  href,
  label,
  formalName,
  nomenclature,
  variants = [],
  forms = true,
  categories = [],
  toxic,
  safetyNotes,
  kind,
  retired,
  recency,
  level = 2,
  actions,
  startActions,
  lastEdit,
  children,
}: IngredientCardProps): ReactElement => {
  const Heading = `h${level}` as const;
  const named = useNamedCategories(categories);
  const formal = (formalName ?? '').trim();

  // Without a mark each holder is left out, not left empty, so it adds no gap.
  const marked = kind === 'own' || Boolean(retired);
  const safe =
    Boolean(toxic) ||
    hasText(safetyNotes) ||
    variants.some((v) => v.toxic || hasText(v.safetyNotes));
  const cornered = safe || recency != null;
  // The first word apart, so the safety badge beside the name drops below only once that word would have
  // to break to fit (index.scss). Spans do not change the link's name.
  const [, first = label, rest = ''] = /^(\S+)(.*)$/s.exec(label) ?? [];

  const jars = children != null && children !== false;
  const hasActions = actions != null && actions !== false;
  const hasStart = startActions != null && startActions !== false;
  const edited = lastEdit != null;

  return (
    <IngredientCardFrame>
      <div className="specimen__top">
        <div className="ingredient-card__heading">
          <Heading className="ingredient-card__name">
            {/* The entry page draws its own frame while it loads, so the link names it. */}
            <PendingLink href={href}>
              <span className="ingredient-card__first">{first}</span>
              {rest} <LinkHint />
            </PendingLink>
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
          {/* Every badge but the safety one, as a row under the formal name. */}
          {marked && (
            <div className="specimen__badges">
              <EntryMarks kind={kind} retired={retired} provenance={false} safety={false} />
            </div>
          )}
        </div>
        {/* The card's top-right corner, beside the name: the one safety badge, Toxic
            over Caution, always at the very corner, and New or Updated just left of it,
            or in the corner itself without one. After
            the row above in the document: read last, as the row's red mark is, and
            where it lands when it wraps below. */}
        {cornered && (
          <div className="ingredient-card__corner">
            {/* EntryMarks for the safety badge alone (no kind mark, no provenance), so
                New or Updated comes first here as in every row it shares with badges. */}
            <EntryMarks
              kind="compendium"
              provenance={false}
              recency={recency}
              toxic={toxic}
              safetyNotes={safetyNotes}
              variants={variants}
            />
          </div>
        )}
      </div>
      <CategoryChips categories={named} label={label} />
      {forms && variants.length > 0 && (
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
      {(jars || hasActions || hasStart || edited) && (
        <div className="specimen__foot">
          {jars && <div className="specimen__stock">{children}</div>}
          {/* Who last changed the stock, under the jar lines and above the actions. */}
          {edited && <LastEdit by={lastEdit.by} at={lastEdit.at} />}
          {(hasActions || hasStart) && (
            <div className="specimen__actions">
              {hasStart && <span className="specimen__actions-start">{startActions}</span>}
              {actions}
            </div>
          )}
        </div>
      )}
    </IngredientCardFrame>
  );
};

export default CardFace;
