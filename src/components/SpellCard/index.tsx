import type { ReactElement } from 'react';
import CategoryChips from '../CategoryChips';
import type { SpellCardProps } from './types';
import './index.scss';

// One spell in the grimoire's list (M10.11): its title, its intent, a status badge
// and the categories its author assigned it. Presentational, in IngredientCard's
// pattern: the Foundations specimen for the layout and the card's surface, with no
// drawer, since nothing opens from it yet. Not a link until the spell page exists
// (MB.6), so the title is plain text. claude-docs/components/spell-card.md.

/** What a spell with no title is called, here and wherever it is listed. */
export const UNTITLED_SPELL = 'Untitled Spell';

/** The id of a spell's title heading, which the list item names itself by. */
export const spellTitleId = (id: string): string => `spell-${id}-title`;

// Draft and Complete each take a badge of their own palette, so the two read apart
// at a glance and not only by the word (the acceptance criterion's "visually distinct").
const STATUS = {
  draft: { label: 'Draft', className: 'badge badge--draft' },
  complete: { label: 'Complete', className: 'badge badge--complete' },
} as const;

const SpellCard = ({
  id,
  title,
  intent,
  status,
  categories,
  level = 2,
}: SpellCardProps): ReactElement => {
  const Heading = `h${level}` as const;
  const name = (title ?? '').trim() || UNTITLED_SPELL;
  const purpose = (intent ?? '').trim();
  const badge = STATUS[status];
  return (
    <article className="spell-card specimen" aria-labelledby={spellTitleId(id)}>
      <div className="specimen__top">
        <Heading id={spellTitleId(id)} className="spell-card__title">
          {name}
        </Heading>
        <div className="specimen__badges">
          <span className={badge.className}>{badge.label}</span>
        </div>
      </div>
      {purpose !== '' && <p className="spell-card__intent">{purpose}</p>}
      <CategoryChips categories={categories} label={name} />
    </article>
  );
};

export default SpellCard;
export type { SpellCardProps } from './types';
