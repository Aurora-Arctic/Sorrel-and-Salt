import type { ReactElement } from 'react';
import type { ContextRowProps } from './types';
import './index.scss';

// The band under the shell's bar that says where you are: the coven's switcher or "Admin", with the
// area's section nav beside it. A server component of two slots; the nav leaves the row at a phone's
// width (claude-docs/components/context-row.md).
const ContextRow = ({ lead, children }: ContextRowProps): ReactElement => (
  <section className="context-row" aria-label="Context">
    <div className="context-row__inner">
      <div className="context-row__lead">{lead}</div>
      {children}
    </div>
  </section>
);

export default ContextRow;
