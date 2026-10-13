'use client';

import { type ReactElement, useEffect, useRef, useState } from 'react';
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
  size,
  children,
}: ModalButtonProps): ReactElement {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  // Set by a close only, so the first render takes no focus.
  const returning = useRef(false);

  useEffect(() => {
    if (!open && returning.current) {
      returning.current = false;
      button.current?.focus();
    }
  }, [open]);

  return (
    <>
      <button ref={button} className={className} type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <Modal
          title={title}
          size={size}
          onClose={() => {
            returning.current = true;
            setOpen(false);
          }}
        >
          {children}
        </Modal>
      )}
    </>
  );
}
