import type { ReactElement } from 'react';
import type { ContextRowProps } from './types';
import './index.scss';

// The band under the shell's bar that says where you are in words: the
// coven's name (as its switcher) or "Admin", with the area's section nav
// beside it (MB.7). A server component of two slots. The section nav leaves
// the row at a phone's width by its own stylesheet, to the bottom of the
// window, so there the row shows the lead alone.
// See claude-docs/components/context-row.md.
const ContextRow = ({ lead, children }: ContextRowProps): ReactElement => (
  <section className="context-row" aria-label="Context">
    <div className="context-row__inner">
      <div className="context-row__lead">{lead}</div>
      {children}
    </div>
  </section>
);

export default ContextRow;
