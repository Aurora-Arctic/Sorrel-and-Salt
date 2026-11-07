import type { ReactElement } from 'react';
import SectionNav from '../SectionNav';
import { covenSections } from './sections';
import type { CovenNavProps } from './types';

// The `/coven/[slug]` layout's nav, in the context row and the phone's bottom bar. The tabs, the bar and the
// current-page marks are `SectionNav`'s (claude-docs/components/coven-nav.md).
const CovenNav = ({ slug, canReadMembers = false }: CovenNavProps): ReactElement => (
  <SectionNav label="Coven" sections={covenSections(slug, canReadMembers)} />
);

export default CovenNav;
