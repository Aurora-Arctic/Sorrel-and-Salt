import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import CategoryChips from '../CategoryChips';
import LastEdit from '../LastEdit';
import { EditLink } from '../IconTip';
import LinkHint from '../LinkHint';
import type { SpellCardProps } from './types';
import './index.scss';

// One spell in the grimoire's list (M10.11): its title, its intent, a Draft badge on
// a draft, a Private badge on a private spell (M10.13), the categories its author assigned it, and who last edited it. Presentational, in IngredientCard's
// pattern: the Foundations specimen for the layout and the card's surface, with no
// drawer. The title links to the spell's recipe page (MB.6) where the caller gives `href`. claude-docs/components/spell-card.md.

/** What a spell with no title is called, here and wherever it is listed. */
export const UNTITLED_SPELL = 'Untitled Spell';

/** The id of a spell's title heading, which the list item names itself by. */
export const spellTitleId = (id: string): string => `spell-${id}-title`;

const SpellCard = ({
  id,
  href,
  editHref,
  title,
  intent,
  status,
  visibility,
  categories,
  lastEdit,
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
            {href ? (
              // The recipe page draws its own frame while it loads, so the link names it (MB.6).
              // The link stretches over the whole card, as an ingredient card's name does.
              <PendingLink href={href} navigationTarget={ingredientLinkTarget(href)}>
                {name} <LinkHint />
              </PendingLink>
            ) : (
              name
            )}
          </Heading>
          {/* Only a draft is marked: complete is the default, so a Complete badge would
              say nothing (the owner, 2026-10-27). Likewise only a private spell: the
              coven is the default, and a private one lists to its author alone, so
              the badge tells them no one else sees it (M10.13). Under the title, as the
              marks sit under an ingredient card's name. */}
          {(status === 'draft' || visibility === 'private') && (
            <div className="specimen__badges">
              {status === 'draft' && <span className="badge badge--draft">Draft</span>}
              {visibility === 'private' && <span className="badge badge--private">Private</span>}
            </div>
          )}
        </div>
        {/* The card's top-right corner, as an ingredient card's badges are. */}
        {editHref && (
          <div className="spell-card__corner">
            <EditLink
              href={editHref}
              name={name}
              heading={{ eyebrow: 'Edit Spell', title: name }}
            />
          </div>
        )}
      </div>
      {purpose !== '' && <p className="spell-card__intent">{purpose}</p>}
      <CategoryChips categories={categories} label={name} />
      {/* In the foot, as IngredientCard's, so cards in one grid row end on the same line. */}
      {lastEdit != null && (
        <div className="specimen__foot">
          <LastEdit by={lastEdit.by} at={lastEdit.at} />
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
 * The filter that tears the smouldering edge ragged, referenced by id from index.scss.
 * Rendered once per page beside the list of cards (GrimoireList), not per card: an id
 * must be unique, and one filter serves every card. Without it the burn front is a smooth
 * curve. Coarse noise displacing the hole and its ember and char bands; still, since a
 * burn line does not wriggle.
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
