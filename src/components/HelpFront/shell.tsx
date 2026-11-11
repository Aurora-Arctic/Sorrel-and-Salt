import { HelpFrame } from '../HelpChrome';
import type { ComponentType, ReactElement, ReactNode } from 'react';

// The help header's frame, shared by the help layout and its skeleton so they cannot differ. The body is a plain box
// unless the caller hands one that takes part in navigation: the skeleton must not import it, as the skeleton
// registry would then import itself (claude-docs/components/help-front.md).
export const HelpFrontShell = ({
  head,
  body: Body = 'div',
  children,
}: {
  head: ReactNode;
  body?: ComponentType<{ className: string; children: ReactNode }> | 'div';
  children: ReactNode;
}): ReactElement => (
  <HelpFrame>
    <div className="help-front">
      {head}
      <Body className="help-front__body">{children}</Body>
    </div>
  </HelpFrame>
);
