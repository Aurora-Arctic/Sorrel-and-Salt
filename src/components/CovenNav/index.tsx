import type { ReactElement } from 'react';
import SectionNav from '../SectionNav';
import { covenSections } from './sections';
import type { CovenNavProps } from './types';

// (claude-docs/components/coven-nav.md)
const CovenNav = ({ slug, canReadMembers = false }: CovenNavProps): ReactElement => (
  <SectionNav label="Coven" sections={covenSections(slug, canReadMembers)} />
);

export default CovenNav;
