import type { CSSProperties, ReactElement, ReactNode } from 'react';

/**
 * The panel that holds a box's listbox and, beneath it, its message when
 * there is nothing to list: the one element that is placed, so the two move
 * together. Unwrapped (a typed box that says nothing, `empty={false}`), it
 * is the listbox alone, placed itself, as it always was. Downshift counts
 * only the input, the toggle and the listbox as inside, and closes on a
 * press anywhere else, the message included. The popup does not scroll:
 * Downshift scrolls a highlighted row into view within the listbox element,
 * so the listbox is the scroller and the popup only the panel.
 */
export function Popup({
  wrapped,
  popupRef,
  open,
  style,
  placement,
  after,
  children,
}: {
  wrapped: boolean;
  popupRef: (element: HTMLElement | null) => void;
  open: boolean;
  style: CSSProperties;
  placement: string;
  after: ReactNode;
  children: ReactNode;
}): ReactElement {
  if (!wrapped) return <>{children}</>;
  return (
    <div
      ref={popupRef}
      className={open ? 'combobox__popup is-open' : 'combobox__popup'}
      style={style}
      data-placement={placement}
      hidden={!open}
    >
      {children}
      {after}
    </div>
  );
}

/** What a typed box with nothing to show says by default: the text, quoted. */
export const noMatch = (typed: string): string => `No match for “${typed.trim()}”`;

/** The one message row, outside every listbox: it is no option. */
export function EmptyMessage({ children }: { children: ReactNode }): ReactElement {
  return <div className="combobox__empty">{children}</div>;
}
