import type { ReactElement } from 'react';
import CategoryChips from '../CategoryChips';
import LastEdit from '../LastEdit';
import type { SpellCardProps } from './types';
import './index.scss';

// One spell in the grimoire's list (M10.11): its title, its intent, a Draft badge on
// a draft, the categories its author assigned it, and who last edited it. Presentational, in IngredientCard's
// pattern: the Foundations specimen for the layout and the card's surface, with no
// drawer, since nothing opens from it yet. Not a link until the spell page exists
// (MB.6), so the title is plain text. claude-docs/components/spell-card.md.

/** What a spell with no title is called, here and wherever it is listed. */
export const UNTITLED_SPELL = 'Untitled Spell';

/** The id of a spell's title heading, which the list item names itself by. */
export const spellTitleId = (id: string): string => `spell-${id}-title`;

const SpellCard = ({
  id,
  title,
  intent,
  status,
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
          {name}
        </Heading>
        {/* Only a draft is marked: complete is the default, so a Complete badge would
            say nothing (the owner, 2026-10-27). */}
        {status === 'draft' && (
          <div className="specimen__badges">
            <span className="badge badge--draft">Draft</span>
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
