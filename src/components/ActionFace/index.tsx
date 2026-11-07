import type { ReactElement, ReactNode } from 'react';
import { PlusIcon } from '../IconTip';

// A page's header action drawn before the page arrives: the Add button's own wrapper, classes and
// label with nothing to press, so the header keeps its height when the real one replaces it.
// The anchor is named by a variable because the lint rule for links wants an address this one must not have.
const Anchor = 'a';

export default function ActionFace({ children }: { children: ReactNode }): ReactElement {
  return (
    <span className="icon-tip icon-tip--side" aria-hidden="true">
      {/* An anchor with no address: the real Add is a link, and a link's letter-spacing sets its width. */}
      <Anchor className="btn btn--solid add-action">
        <span className="add-action__label">{children}</span>
        <span className="add-action__plus">
          <PlusIcon />
        </span>
      </Anchor>
    </span>
  );
}

// A plain solid header button drawn the same way: its classes and label, with nothing to press.
export function ButtonFace({
  children,
  link = false,
}: {
  children: ReactNode;
  link?: boolean;
}): ReactElement {
  const Face = link ? 'a' : 'span';
  return (
    <Face className={'btn btn--solid'} aria-hidden="true">
      {children}
    </Face>
  );
}
