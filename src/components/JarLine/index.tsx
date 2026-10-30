import type { ReactElement } from 'react';
import { JarDrawing, ONE_OFF_HELD, pickJarShape } from '../JarShelf';
import { StockJarButton } from '../StockDialog';
import type { JarLineProps } from './types';
import './index.scss';

// A jar you can press beside its name and words: the recipe page's In Coven Inventory and the
// completion preview draw their lines through it, so the shake and the name's growth are one thing
// (claude-docs/components/jar-line.md).

/** One `li`: the jar, the name (the Edit Stock button where there is one), an optional control, and the words. */
export default function JarLine({
  seed,
  kind,
  held,
  tone,
  oneOff = false,
  name,
  press,
  look,
  words,
  className,
}: JarLineProps): ReactElement {
  const modifier = oneOff || tone === 'ok' ? '' : ` jar-shelf__jar--${tone}`;
  const nameText = <span className="jar-line__name">{name}</span>;
  return (
    <li className={`jar-line${oneOff ? ' is-one-off' : ''}${className ? ` ${className}` : ''}`}>
      <span className={`jar-line__jar${modifier}`}>
        <JarDrawing shape={pickJarShape(seed, kind)} held={oneOff ? ONE_OFF_HELD : held} />
      </span>
      <span className="jar-line__title">
        {press && !oneOff ? (
          // The button is the name, stretched over the jar by its `::after`; the control at the
          // right and the words' marks are raised above the stretch to keep their own press.
          <StockJarButton {...press} className="jar-line__press">
            {nameText}
          </StockJarButton>
        ) : (
          nameText
        )}
      </span>
      {look && <span className="jar-line__look">{look}</span>}
      <span className="jar-line__words">{words}</span>
    </li>
  );
}

export type { JarLineProps, JarLinePress, JarLineTone } from './types';
