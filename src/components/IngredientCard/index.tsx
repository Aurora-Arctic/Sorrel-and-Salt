import { Fragment, type ReactElement } from 'react';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import CategoryChips from '../CategoryChips';
import EntryMarks from '../EntryMarks';
import FormIcon from '../FormIcon';
import LastEdit from '../LastEdit';
import LinkHint from '../LinkHint';
import { isBinomial } from '@/modules/ingredients/schema/ingredient-enums';
import type { IngredientCardProps } from './types';
import './index.scss';

// One ingredient in a list, for the public compendium and the coven's Ingredients page: the name as the
// card's link, formal name and forms beneath, the marks and a slot for jar lines. Props only; New or
// Updated sits left of the safety badge (claude-docs/components/ingredient-card.md).

const IngredientCard = ({
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
  const formal = (formalName ?? '').trim();

  // Without a mark each holder is left out, not left empty, so it adds no gap.
  const marked = kind === 'own' || Boolean(retired);
  const safe =
    Boolean(toxic) ||
    (safetyNotes ?? '').trim() !== '' ||
    variants.some((v) => v.toxic || (v.safetyNotes ?? '').trim() !== '');
  const cornered = safe || recency != null;
  // The first word apart, so the safety badge beside the name drops below only once that word would have
  // to break to fit (index.scss). Spans do not change the link's name.
  const [, first = label, rest = ''] = /^(\S+)(.*)$/s.exec(label) ?? [];

  const jars = children != null && children !== false;
  const hasActions = actions != null && actions !== false;
  const hasStart = startActions != null && startActions !== false;
  const edited = lastEdit != null;

  return (
    // The slot is the cabinet hole the card's face slides out of; the drawer body behind the
    // face is decorative and painted first, so it sits behind the face (index.scss).
    <div className="ingredient-card-slot">
      <span className="ingredient-card-slot__drawer" aria-hidden="true" />
      <article className="ingredient-card specimen">
        <div className="specimen__top">
          <div className="ingredient-card__heading">
            <Heading className="ingredient-card__name">
              {/* The entry page draws its own frame while it loads, so the link names it. */}
              <PendingLink href={href} navigationTarget={ingredientLinkTarget(href)}>
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
        <CategoryChips categories={categories} label={label} />
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
          // The foot: the jar lines, then the actions, with any start actions at their
          // left. Pushed to the card's bottom edge (`margin-top: auto`), so cards in one
          // grid row end on the same line.
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
      </article>
    </div>
  );
};

export default IngredientCard;
export type { IngredientCardProps, CardCategory } from './types';
