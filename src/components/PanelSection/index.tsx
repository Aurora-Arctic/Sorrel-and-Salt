import type { ReactElement } from 'react';
import type { PanelSectionProps } from './types';

// No client directive and no hook, so a server page renders it.
const PanelSection = ({ id, title, lede, children }: PanelSectionProps): ReactElement => (
  <section id={id} className="page-frame__section panel" aria-labelledby={`${id}-heading`}>
    <div className="header">
      <h2 id={`${id}-heading`}>{title}</h2>
      {lede && <p className="lede">{lede}</p>}
    </div>
    {children}
  </section>
);

export default PanelSection;
