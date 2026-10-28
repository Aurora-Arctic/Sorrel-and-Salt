import { type ReactElement, useId } from 'react';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { StockIcon, StockTip } from '../StockBadge';
import { stockState } from '../StockBadge/stock-state';
import { amountText, stockName } from '../StockBadge/stock-words';
import { StockJarButton } from '../StockDialog';
import type { StockDialogProps } from '../StockDialog/types';
import { fillOf } from './level';
import { pick } from './pick';
export { pick as pickJarShape } from './pick';
import { SHAPES, lv, wv } from './shapes';
import type { HeldJar, JarPart, JarShelfProps, ShelfForm } from './types';
import './index.scss';

// A shelf of small drawn jars, one per form of an ingredient (M12.29): what the coven
// holds of each, at a glance. A form with a jar draws it with its level, a dashed mark at
// the low-stock threshold and a wave on the level; a form with none draws a dashed empty
// jar. Under each: the form, then its amount. A Low or Out jar is told by the jar itself
// (amber glass, level and mark for Low; a solid red empty outline for Out) and by its amount
// in the same colour, which is a button opening the same tip the badge has. For a
// role that may edit, a jar is a button opening the Edit Stock dialog on that form, an
// empty one too (it adds the form). The drawing is the owner's mock, the Fillets bracket
// only, with no idle motion: the level's rise is the one transition.
// claude-docs/components/jar-shelf.md.

/**
 * The amount of a Low or Out jar, as the button that opens its tip: the badge's
 * `StockTip`, on text and not a box. Its name is the amount and the state
 * ("40 g, Low Stock"), so a screen reader has both without opening the tip, and Low's
 * statement is its description, as on the badge. The badge's drawing sits before the amount,
 * so Low and Out are told by a symbol as well as by colour, the same symbol the card shows
 * (MB.121, proposal P1; WCAG 1.4.1).
 */
function AmountTip({ jar, state }: { jar: HeldJar; state: 'low' | 'out' }): ReactElement {
  const amount = amountText(jar.quantity, jar.unit);
  return (
    <StockTip
      state={state}
      threshold={jar.threshold}
      unit={jar.unit}
      ariaLabel={`${amount}, ${stockName(state)}`}
      className="jar-shelf__amount-tip"
    >
      <StockIcon out={state === 'out'} className="jar-shelf__amount-icon" />
      {amount}
    </StockTip>
  );
}

function Part({ part }: { part: JarPart }): ReactElement {
  const className = `jar-shelf__${part.paint}`;
  if (part.el === 'rect') return <rect className={className} {...part.attrs} />;
  if (part.el === 'circle') return <circle className={className} {...part.attrs} />;
  return <path className={className} {...part.attrs} />;
}

/**
 * The drawing. `aria-hidden`: the form and amount beside it say everything it
 * does. The clip is the body's outline, applied to an untransformed group
 * around the group that moves, since a clip on a transformed element moves
 * with it. Each jar's clip has an id of its own, as two on a page cannot share.
 */
/** How many bands fill the spell's jar; past it the bands shrink to keep fitting. */
export const BANDS_FULL = 8;

/** Height of the crest on each band edge, in drawing units (about 2% of a body). */
const CREST = 0.6;

/** A band's top edge: one low crest across the jar. */
const crest = `M-2 ${CREST}Q24 ${-CREST} 50 ${CREST}`;

/**
 * One band, `height` tall: its top is the crest and its bottom is the same crest, so stacked
 * bands tile with no gap. The lowest band is flat along the base.
 */
function bandPath(height: number, lowest: boolean): string {
  const bottom = lowest
    ? `V${height + 4}H-2z`
    : `V${height + CREST}Q24 ${height - CREST} -2 ${height + CREST}z`;
  return crest + bottom;
}

export function JarDrawing({
  shape,
  held,
  bands = 0,
}: {
  shape: keyof typeof SHAPES;
  held: Pick<HeldJar, 'quantity' | 'threshold'> | null;
  /** Equal horizontal bands stacked from the base, one per ingredient (the spell's jar); 0 draws none. */
  bands?: number;
}): ReactElement {
  const clip = `jar-shelf-clip-${useId().replace(/\W/g, '')}`;
  const S = SHAPES[shape];
  const fill = held ? fillOf(held) : null;
  const level = fill ? lv(shape, fill.level) : null;
  const mark = fill?.mark != null ? lv(shape, fill.mark) : null;
  const url = `url(#${clip})`;
  return (
    <svg viewBox="0 0 48 40" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <path d={S.body} />
        </clipPath>
      </defs>
      {S.lid.map((part, i) => (
        <Part key={i} part={part} />
      ))}
      {level !== null && (
        <g clipPath={url}>
          <g className="jar-shelf__rise" style={{ transform: `translateY(${level}px)` }}>
            <rect className="jar-shelf__level" x={0} y={0} width={48} height={40} />
          </g>
        </g>
      )}
      {bands > 0 && (
        <g clipPath={url}>
          {Array.from({ length: bands }, (_, i) => {
            const height = +((40 - S.full) / Math.max(bands, BANDS_FULL)).toFixed(2);
            return (
              <g
                key={i}
                className={`jar-shelf__band jar-shelf__band--${i % 2}`}
                style={{ transform: `translateY(${+(40 - height * (i + 1)).toFixed(2)}px)` }}
              >
                <path className="jar-shelf__band-fill" d={bandPath(height, i === 0)} />
                <path
                  className={`jar-shelf__band-edge${i === bands - 1 ? ' jar-shelf__band-edge--top' : ''}`}
                  d={crest}
                />
              </g>
            );
          })}
        </g>
      )}
      {S.shaded && held && (
        <>
          <rect className="jar-shelf__shade" x={S.sx} y={0} width={8} height={40} clipPath={url} />
          <rect
            className="jar-shelf__shine"
            x={(S.ex ?? 0) - 8}
            y={0}
            width={8}
            height={40}
            clipPath={url}
          />
        </>
      )}
      <path className="jar-shelf__glass" d={S.open ? S.body.replace(/z$/, '') : S.body} />
      {S.extra?.map((part, i) => (
        <Part key={i} part={part} />
      ))}
      {level !== null && (
        <g clipPath={url}>
          <g className="jar-shelf__rise" style={{ transform: `translateY(${level}px)` }}>
            <path className="jar-shelf__wave" d={wv(...S.wave)} />
          </g>
          {mark !== null && <line className="jar-shelf__mark" x1={0} y1={mark} x2={48} y2={mark} />}
        </g>
      )}
    </svg>
  );
}

function Jar({
  entry,
  seed,
  edit,
}: {
  entry: ShelfForm;
  seed: string;
  edit: StockDialogProps | undefined;
}): ReactElement {
  const { variantId, form, jar } = entry;
  const label = formLabel(form);
  const name = <span className="jar-shelf__name">{label}</span>;
  const state = jar ? stockState(jar.quantity, jar.threshold) : 'ok';
  const modifier = jar
    ? state === 'ok'
      ? ''
      : ` jar-shelf__jar--${state}`
    : ' jar-shelf__jar--empty';
  return (
    <li className={`jar-shelf__jar${modifier}`}>
      <JarDrawing shape={pick(seed, form)} held={jar} />
      {edit ? (
        // The button is the form's name, stretched over the whole jar by its `::after`, so a
        // press anywhere on the jar lands on it. A Low or Out amount is its own button (its
        // tip), so it sits beside this one rather than inside, raised above the stretch.
        <StockJarButton
          {...edit}
          openOn={variantId}
          ariaLabel={`Edit Stock, ${edit.ingredientName}, ${label}`}
          className="jar-shelf__press"
        >
          {name}
        </StockJarButton>
      ) : (
        name
      )}
      <span className="jar-shelf__amount">
        {!jar ? (
          'No Jar'
        ) : state === 'ok' ? (
          amountText(jar.quantity, jar.unit)
        ) : (
          <AmountTip jar={jar} state={state} />
        )}
      </span>
    </li>
  );
}

export default function JarShelf({ forms, seed, edit }: JarShelfProps): ReactElement {
  return (
    <ul className="jar-shelf" aria-label="Jars">
      {forms.map((entry) => (
        <Jar key={entry.variantId} entry={entry} seed={seed} edit={edit} />
      ))}
    </ul>
  );
}
