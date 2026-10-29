import type { CSSProperties, ReactElement, ReactNode } from 'react';

/** The one placed panel holding a box's listbox and, beneath it, its empty message, so the two move together (claude-docs/components/combobox.md, "Component notes"). */
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
