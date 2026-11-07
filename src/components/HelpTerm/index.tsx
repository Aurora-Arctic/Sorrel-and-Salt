'use client';

import { useId, type ReactElement } from 'react';
import { useTip } from '../InfoTip/use-tip';
import type { HelpTermProps } from './types';
import './index.scss';

// A glossary term marked in a help body: a link to the term in the glossary that opens the term's definition. It
// is the tooltip behaviour of InfoTip (`useTip`) on a link in running text rather than an ⓘ button, so the link
// keeps its job and the definition is its description (claude-docs/components/help-pages.md, "Glossary marks").
const HelpTerm = ({ slug, title, definition, shown }: HelpTermProps): ReactElement => {
  const id = useId();
  const { open, show, showSoon, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip();

  return (
    // Hover on the wrapper, which holds the bubble as well as the link, so the pointer can move onto the bubble.
    <span ref={anchor} className="help-term" onMouseEnter={showSoon} onMouseLeave={hideSoon}>
      <a
        href={`/help/glossary#${slug}`}
        className="help-term__link"
        aria-describedby={id}
        onFocus={show}
        onBlur={hide}
        onClick={show}
      >
        {shown}
      </a>
      <span
        ref={bubble}
        id={id}
        role="tooltip"
        className={open ? 'help-term__bubble is-open' : 'help-term__bubble'}
        aria-hidden={!open}
        style={bubbleStyle}
      >
        <strong>{title}</strong> {definition}
      </span>
    </span>
  );
};

export default HelpTerm;
