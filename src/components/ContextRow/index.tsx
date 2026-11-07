import type { ReactElement } from 'react';
import type { ContextRowProps } from './types';
import './index.scss';

// A server component of two slots (claude-docs/components/context-row.md).
const ContextRow = ({ lead, children }: ContextRowProps): ReactElement => (
  <section className="context-row" aria-label="Context">
    <div className="context-row__inner">
      <div className="context-row__lead">{lead}</div>
      {children}
    </div>
  </section>
);

export default ContextRow;
