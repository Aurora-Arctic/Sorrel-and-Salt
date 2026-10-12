import type { ReactElement } from 'react';
import NavLinks from './nav-links';
import { covenSections } from './sections';
import type { CovenNavProps } from './types';
import './index.scss';

// The `/coven/[slug]` layout's nav, above every page under a coven. The list
// stays here, on the server; only the links, which mark the page you are on,
// are a client part (claude-docs/components/coven-nav.md).
const CovenNav = ({ slug }: CovenNavProps): ReactElement => (
  <nav aria-label="Workspace" className="coven-nav">
    <NavLinks sections={covenSections(slug)} />
  </nav>
);

export default CovenNav;
