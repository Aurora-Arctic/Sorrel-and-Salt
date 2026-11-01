import type { CSSProperties, ReactElement } from 'react';
import type { JarShapeName } from '../../components/JarShelf/types';
import type { CompendiumShareCard } from '@/modules/ingredients';
import { SITE_NAME, SITE_TAGLINE } from '../site';
import { BODY, DISPLAY } from './fonts';
import { PALETTE } from './palette';
import { Shelf } from './shelf';

// The two share cards, 1200 by 630 on the dark theme, as the owner approved them (claude-docs/share-card.md, "The design").

/** The side margin both cards keep. */
const SIDE = 90;

const display: CSSProperties = {
  fontFamily: DISPLAY,
  fontWeight: 700,
  color: PALETTE.chalk,
  lineHeight: 1.05,
  letterSpacing: '0.01em',
  textAlign: 'center',
};

const secondLine: CSSProperties = {
  fontFamily: BODY,
  fontWeight: 300,
  fontSize: 44,
  color: PALETTE.chalkMuted,
};

const page: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  background: PALETTE.soot,
  color: PALETTE.chalk,
};

/** The site card's seven vessels and how full each is. */
const SITE_SHELF: readonly JarShapeName[] = [
  'bottle',
  'hex',
  'flask',
  'honey',
  'vial',
  'apoth',
  'erlen',
];
const SITE_LEVELS = [0.7, 0.45, 0.8, 0.6, 0.35, 0.7, 0.55];

/** The tagline's first sentence; the rest is the compendium's caveat, which a preview has no room for. */
const SITE_LINE = `${SITE_TAGLINE.split('. ')[0].replace(/\.$/, '')}.`;

/** `/` and `/compendium`: the site's name and tagline above a shelf of seven jars. */
export function SiteCard(): ReactElement {
  return (
    <div style={page}>
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          padding: `0 ${SIDE}px`,
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            paddingTop: 80,
          }}
        >
          <div style={{ ...display, fontSize: 148 }}>{SITE_NAME}</div>
          <div style={secondLine}>{SITE_LINE}</div>
        </div>
        <div style={{ height: 20 }} />
        <Shelf shapes={SITE_SHELF} levels={SITE_LEVELS} vessel={80} gap={48} />
        <div style={{ height: SIDE }} />
      </div>
    </div>
  );
}

/** How many category chips fit on one line; the rest are counted in a last chip. */
const CHIPS = 4;
/** A name longer than this is set smaller, so it stays on one line. */
const LONG_NAME = 20;

const chip: CSSProperties = {
  display: 'flex',
  fontFamily: BODY,
  fontWeight: 400,
  fontSize: 24,
  borderRadius: 999,
  padding: '6px 18px',
};

const chipIn = (color: string): CSSProperties => ({
  ...chip,
  color,
  border: `1.5px solid ${color}`,
});

/**
 * A compendium entry: the site's name and a Compendium eyebrow, the entry's name and formal name, its first
 * categories as chips in their group's colour, and a band along the foot with one segment per group.
 */
export function EntryCard({ card }: { card: CompendiumShareCard }): ReactElement {
  const shown = card.categories.slice(0, CHIPS);
  const more = card.categories.length - shown.length;
  return (
    <div style={page}>
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          padding: `48px ${SIDE}px 0`,
        }}
      >
        <div style={{ ...display, fontSize: 64 }}>{SITE_NAME}</div>
        <div style={{ height: 12 }} />
        <div
          style={{
            fontFamily: BODY,
            fontWeight: 400,
            fontSize: 26,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: PALETTE.sorrelBright,
          }}
        >
          Compendium
        </div>
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          <div style={{ ...display, fontSize: card.name.length > LONG_NAME ? 84 : 112 }}>
            {card.name}
          </div>
          {card.formalName && <div style={secondLine}>{card.formalName}</div>}
          {shown.length > 0 && (
            <div style={{ display: 'flex', gap: 14 }}>
              {shown.map((category) => (
                <div key={category.name} style={chipIn(category.color)}>
                  {category.name}
                </div>
              ))}
              {more > 0 && <div style={chipIn(PALETTE.chalkMuted)}>{`+${more}`}</div>}
            </div>
          )}
        </div>
        <div style={{ height: 40 }} />
      </div>
      {/* Empty for an entry with no categories, keeping its height so the layout does not move. */}
      <div style={{ display: 'flex', width: '100%', height: 4 }}>
        {card.groupColors.map((color, i) => (
          <div key={i} style={{ flex: 1, background: color }} />
        ))}
      </div>
    </div>
  );
}
