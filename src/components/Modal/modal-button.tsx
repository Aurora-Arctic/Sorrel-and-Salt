'use client';

import { type ReactElement, useRef, useState } from 'react';
import IconTip from '../IconTip/icon-tip';
import Modal from './modal';
import type { ModalButtonProps } from './types';

/**
 * A button that opens a modal, and the focus back on the button however the
 * modal closes: its Close, Escape, a click outside, or its contents' own
 * close (MB.119, lifted from InviteDialog). Modal restores nothing itself,
 * because its owner unmounts it rather than closing the `<dialog>` in place,
 * so the browser's own return never runs (claude-docs/components/modal.md,
 * "Focus"). A modal opened by its address is RouteModal's instead.
 */
export default function ModalButton({
  label,
  className,
  title,
  eyebrow,
  qualifier,
  ariaLabel,
  tip,
  size,
  children,
}: ModalButtonProps): ReactElement {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  const trigger = (
    <button
      ref={button}
      className={className}
      type="button"
      aria-label={ariaLabel}
      onClick={() => setOpen(true)}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* The tip wraps the button alone: the dialog is a DOM child of whatever
          wraps it, and a tip wrapping it would open on the dialog's focus and
          hover and take its Escape (claude-docs/components/icon-tip.md). */}
      {tip === undefined ? trigger : <IconTip tip={tip}>{trigger}</IconTip>}
      {open && (
        <Modal
          title={title}
          eyebrow={eyebrow}
          qualifier={qualifier}
          size={size}
          onClose={() => setOpen(false)}
          // Modal gives the focus back to the button; named too, as a click
          // in WebKit leaves the focus on nothing.
          returnTo={() => button.current}
        >
          {children}
        </Modal>
      )}
    </>
  );
}
