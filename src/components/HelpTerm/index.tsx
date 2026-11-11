'use client';

import {
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  useEffect,
  useId,
  useRef,
} from 'react';
import { useDismiss } from '../../lib/use-dismiss';
import type { Route } from 'next';
import { PendingLink } from '../../lib/navigation';
import TipAnchor, { type TipControls } from '../InfoTip/tip-anchor';
import type { HelpTermProps } from './types';
import './index.scss';

// A glossary term marked in a help body: a link to the term in the glossary that opens the term's definition. It
// is the tooltip behaviour of InfoTip (`TipAnchor`) on a link in running text rather than an ⓘ button, so the link
// keeps its job and the definition is its description (claude-docs/components/help-pages.md, "Glossary marks").
// A touch or pen tap opens the tooltip instead of following the link, because there is no hover to reach it by.

// Focus moving from the link onto the tooltip's own link keeps the tooltip open.
const leaveTerm =
  (wrapper: { current: HTMLElement | null }, hide: () => void) => (event: FocusEvent) => {
    if (event.relatedTarget instanceof Node && wrapper.current?.contains(event.relatedTarget))
      return;
    hide();
  };

const TermLink = ({
  tip: { open, show, hide },
  wrapper,
  href,
  id,
  shown,
}: {
  tip: TipControls;
  wrapper: { current: HTMLElement | null };
  href: string;
  id: string;
  shown: string;
}): ReactElement => {
  const touching = useRef(false);
  const heldOpen = useRef(false);

  // A tap outside the term and its tooltip closes a tooltip a tap opened.
  useDismiss({
    active: open,
    inside: (target) => wrapper.current?.contains(target) ?? false,
    onOutsidePress: () => {
      if (!heldOpen.current) return;
      heldOpen.current = false;
      hide();
    },
  });

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

  return (
    <PendingLink
      href={href as Route}
      className="help-term__link"
      aria-describedby={id}
      onPointerDown={onPointerDown}
      onFocus={show}
      onBlur={leaveTerm(wrapper, hide)}
      onClick={onClick}
    >
      {shown}
    </PendingLink>
  );
};

const HelpTerm = ({ slug, title, definition, shown }: HelpTermProps): ReactElement => {
  const id = useId();
  const wrapper = useRef<HTMLElement | null>(null);
  const href = `/help/glossary#${slug}`;

  return (
    <TipAnchor
      className="help-term"
      bubbleClass="help-term__bubble"
      bubbleId={id}
      anchorRef={wrapper}
      bubble={({ hide }) => (
        <>
          <strong>{title}</strong> {definition}{' '}
          <PendingLink
            href={href as Route}
            className="help-term__more"
            onBlur={leaveTerm(wrapper, hide)}
          >
            See in Glossary
          </PendingLink>
        </>
      )}
    >
      {(tip) => <TermLink tip={tip} wrapper={wrapper} href={href} id={id} shown={shown} />}
    </TipAnchor>
  );
};

export default HelpTerm;
