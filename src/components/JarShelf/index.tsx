import { type ReactElement, useId } from 'react';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import IconTip from '../IconTip';
import { stockState } from '../StockBadge/stock-state';
import { stockName, stockTip, withUnit } from '../StockBadge/stock-words';
import { StockJarButton } from '../StockDialog';
import type { StockDialogProps } from '../StockDialog/types';
import { fillOf } from './level';
import { pick } from './pick';
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

/** A jar's amount as the card's jar line writes it: "250 g", "250", or "Unmeasured". */
function amountText({ quantity, unit }: HeldJar): string {
  return quantity === null ? 'Unmeasured' : withUnit(quantity, unit);
}

/**
 * The amount of a Low or Out jar, as the button that opens its tip: the badge's tip
 * and wording (`stock-words.ts`), on text and not a box. Its name is the amount and
 * the state ("40 g, Low Stock"), so a screen reader has both without opening the tip.
 * Low's statement is its description, written once out of sight as the badge does, since
 * `IconTip`'s bubble is hidden from a screen reader; Out's would only repeat the name.
 */
function AmountTip({ jar, state }: { jar: HeldJar; state: 'low' | 'out' }): ReactElement {
  const descriptionId = useId();
  const tip = stockTip(state, jar.threshold, jar.unit);
  const amount = amountText(jar);
  return (
    <IconTip tip={tip}>
      <button
        type="button"
        className="jar-shelf__amount-tip"
        aria-label={`${amount}, ${stockName(state)}`}
        aria-describedby={state === 'low' ? descriptionId : undefined}
      >
        {amount}
      </button>
      {state === 'low' && (
        <span id={descriptionId} className="visually-hidden">
          {tip}
        </span>
      )}
    </IconTip>
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
function Drawing({
  shape,
  held,
}: {
  shape: keyof typeof SHAPES;
  held: HeldJar | null;
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
      <Drawing shape={pick(seed, form)} held={jar} />
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
        {!jar ? 'No Jar' : state === 'ok' ? amountText(jar) : <AmountTip jar={jar} state={state} />}
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
