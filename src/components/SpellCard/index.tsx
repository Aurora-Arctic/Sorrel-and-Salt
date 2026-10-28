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
      <div className="specimen__top">
        <Heading id={spellTitleId(id)} className="spell-card__title">
          {href ? (
            // The recipe page draws its own frame while it loads, so the link names it (MB.6).
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
            the badge tells them no one else sees it (M10.13). */}
        {editHref && (
          <EditLink href={editHref} name={name} heading={{ eyebrow: 'Edit Spell', title: name }} />
        )}
        {(status === 'draft' || visibility === 'private') && (
          <div className="specimen__badges">
            {status === 'draft' && <span className="badge badge--draft">Draft</span>}
            {visibility === 'private' && <span className="badge badge--private">Private</span>}
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
    </article>
  );
};

export default SpellCard;
export type { SpellCardProps } from './types';
