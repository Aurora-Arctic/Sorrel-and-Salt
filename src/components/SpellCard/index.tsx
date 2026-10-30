import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import CategoryChips from '../CategoryChips';
import LastEdit from '../LastEdit';
import { EditLink, QuickLookLink } from '../IconTip';
import LinkHint from '../LinkHint';
import RecordWorkingButton from '../RecordWorking';
import SpellMoreMenu from '../SpellRecipe/more-menu';
import type { SpellCardProps } from './types';
import './index.scss';

// One spell in the grimoire's list: title, intent, Draft and Private badges, assigned categories,
// the made count, last editor and the actions. Presentational, in IngredientCard's pattern, with no drawer; the title links where
// `href` is given (claude-docs/components/spell-card.md).

/** What a spell with no title is called, here and wherever it is listed. */
export const UNTITLED_SPELL = 'Untitled Spell';

/** The modal place the Quick Look shows in, apart from the spell builder's. */
export const SPELL_LOOK_PLACE = 'look';

/** The id of a spell's title heading, which the card names itself by. */
const spellTitleId = (id: string): string => `spell-${id}-title`;

const SpellCard = ({
  id,
  href,
  editHref,
  recordWorking,
  more,
  lookHref,
  title,
  intent,
  status,
  visibility,
  categories,
  lastEdit,
  workingCount,
  level = 2,
}: SpellCardProps): ReactElement => {
  const Heading = `h${level}` as const;
  const name = (title ?? '').trim() || UNTITLED_SPELL;
  const purpose = (intent ?? '').trim();
  return (
    <article className="spell-card specimen" aria-labelledby={spellTitleId(id)}>
      {/* The card's face and shadow, and the warm glow behind them, as layers, so the
          smouldering edge (_smoulder.scss) can burn a real hole in the face and its shadow.
          First, so the content paints over them; decoration only, so hidden from assistive
          technology and named in nothing. */}
      <span className="spell-card__glow" aria-hidden="true" />
      <span className="spell-card__face" aria-hidden="true">
        <span className="spell-card__face-paper">
          <span className="spell-card__face-corner">
            <span className="spell-card__face-hole" />
          </span>
        </span>
      </span>
      <div className="specimen__top">
        <div className="spell-card__heading">
          <Heading id={spellTitleId(id)} className="spell-card__title">
            {/* The words are their own positioned span, inside the link so the link's overlay
                is not placed against it: the top row is unpositioned so the overlay is placed
                against the article, and unpositioned words would paint under the smouldering
                face (index.scss). */}
            {href ? (
              // The recipe page draws its own frame while it loads, so the link names it.
              // The link stretches over the whole card, as an ingredient card's name does.
              <PendingLink href={href} navigationTarget={ingredientLinkTarget(href)}>
                <span className="spell-card__title-text">
                  {name} <LinkHint />
                </span>
              </PendingLink>
            ) : (
              <span className="spell-card__title-text">{name}</span>
            )}
          </Heading>
          {/* Only a draft is marked: complete is the default, so a Complete badge would
              say nothing. Likewise only a private spell: the
              coven is the default, and a private one lists to its author alone, so
              the badge tells them no one else sees it. Under the title, as the
              marks sit under an ingredient card's name. */}
          {(status === 'draft' || visibility === 'private') && (
            <div className="specimen__badges">
              {status === 'draft' && <span className="badge badge--draft">Draft</span>}
              {visibility === 'private' && <span className="badge badge--private">Private</span>}
            </div>
          )}
        </div>
      </div>
      {purpose !== '' && <p className="spell-card__intent">{purpose}</p>}
      <CategoryChips categories={categories} label={name} />
      {/* How often it has been made: none draws nothing, as a spell never worked has nothing to say. */}
      {workingCount != null && workingCount > 0 && (
        <p className="meta">
          Made {workingCount} {workingCount === 1 ? 'Time' : 'Times'}
        </p>
      )}
      {(lastEdit != null || lookHref || editHref || recordWorking || more) && (
        // The foot, as IngredientCard's, so cards in one grid row end on the same line: who last edited,
        // then the actions on one row, the Quick Look eye at the left (the start group) and Record a
        // Working, the Edit pencil and the More menu at the right.
        <div className="specimen__foot">
          {lastEdit != null && <LastEdit by={lastEdit.by} at={lastEdit.at} />}
          {(lookHref || editHref || recordWorking || more) && (
            <div className="specimen__actions">
              {lookHref && (
                <span className="specimen__actions-start">
                  <QuickLookLink
                    href={lookHref}
                    name={name}
                    heading={{ title: name }}
                    place={SPELL_LOOK_PLACE}
                  />
                </span>
              )}
              {recordWorking && (
                <RecordWorkingButton
                  {...recordWorking}
                  spellId={id}
                  spellName={name}
                  spellVisibility={visibility}
                />
              )}
              {editHref && (
                <EditLink
                  href={editHref}
                  name={name}
                  heading={{ eyebrow: 'Edit Spell', title: name }}
                  className="icon-tip__edit icon-tip__edit--plain"
                />
              )}
              {more && <SpellMoreMenu {...more} spellId={id} name={name} canPrint={false} />}
            </div>
          )}
        </div>
      )}
      {/* The smoulder's ember line and char rim, over the content (_smoulder.scss). */}
      <span className="spell-card__burn" aria-hidden="true">
        <span className="spell-card__burn-paper">
          <span className="spell-card__burn-corner">
            <span className="spell-card__burn-hole" />
          </span>
          <span className="spell-card__burn-curve" />
        </span>
      </span>
    </article>
  );
};

/**
 * The filter that tears the smouldering edge ragged, referenced by id from index.scss and rendered once per page (an id must be unique).
 * Coarse and still noise displaces the hole and its ember and char bands; without it the burn front is a smooth curve.
 * (claude-docs/components/spell-card.md, "The burn filter").
 */
export const SpellCardFilters = (): ReactElement => (
  <svg className="spell-card-filters" aria-hidden="true" focusable="false" width="0" height="0">
    <defs>
      <filter
        id="spell-card-burn"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.07 0.05"
          numOctaves="4"
          seed="11"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="11"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  </svg>
);

export default SpellCard;
export type { SpellCardProps } from './types';
