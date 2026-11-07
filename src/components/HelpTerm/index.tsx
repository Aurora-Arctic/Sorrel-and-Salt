'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
} from 'react';
import { useTip } from '../InfoTip/use-tip';
import type { HelpTermProps } from './types';
import './index.scss';

// A glossary term marked in a help body: a link to the term in the glossary that opens the term's definition. It
// is the tooltip behaviour of InfoTip (`useTip`) on a link in running text rather than an ⓘ button, so the link
// keeps its job and the definition is its description (claude-docs/components/help-pages.md, "Glossary marks").
// A touch or pen tap opens the tooltip instead of following the link, because there is no hover to reach it by.
const HelpTerm = ({ slug, title, definition, shown }: HelpTermProps): ReactElement => {
  const id = useId();
  const { open, show, showSoon, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip();
  const wrapper = useRef<HTMLSpanElement | null>(null);
  const touching = useRef(false);
  const heldOpen = useRef(false);
  const href = `/help/glossary#${slug}`;

  const setWrapper = useCallback(
    (node: HTMLSpanElement | null) => {
      wrapper.current = node;
      anchor(node);
    },
    [anchor],
  );

  // A tap outside the term and its tooltip closes a tooltip a tap opened.
  useEffect(() => {
    if (!open || !heldOpen.current) return undefined;
    const onPointerDown = (event: Event): void => {
      if (event.target instanceof Node && wrapper.current?.contains(event.target)) return;
      heldOpen.current = false;
      hide();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, hide]);

  useEffect(() => {
    if (!open) heldOpen.current = false;
  }, [open]);

  const onPointerDown = (event: PointerEvent): void => {
    touching.current = event.pointerType === 'touch' || event.pointerType === 'pen';
  };

  const onClick = (event: MouseEvent): void => {
    if (!touching.current) {
      show();
      return;
    }
    touching.current = false;
    event.preventDefault();
    if (heldOpen.current) {
      heldOpen.current = false;
      hide();
    } else {
      heldOpen.current = true;
      show();
    }
  };

  // Focus moving from the link onto the tooltip's own link keeps the tooltip open.
  const onBlur = (event: FocusEvent): void => {
    if (event.relatedTarget instanceof Node && wrapper.current?.contains(event.relatedTarget))
      return;
    hide();
  };

  return (
    // Hover on the wrapper, which holds the bubble as well as the link, so the pointer can move onto the bubble.
    <span ref={setWrapper} className="help-term" onMouseEnter={showSoon} onMouseLeave={hideSoon}>
      <a
        href={href}
        className="help-term__link"
        aria-describedby={id}
        onPointerDown={onPointerDown}
        onFocus={show}
        onBlur={onBlur}
        onClick={onClick}
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
        <strong>{title}</strong> {definition}{' '}
        <a href={href} className="help-term__more" onBlur={onBlur}>
          See in Glossary
        </a>
      </span>
    </span>
  );
};

export default HelpTerm;
