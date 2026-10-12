import type { ReactElement } from 'react';
import SectionNav from '../SectionNav';
import { covenSections } from './sections';
import type { CovenNavProps } from './types';

// The `/coven/[slug]` layout's nav, in the context row beside the switcher
// and, on a phone, the bottom bar. The sections are the coven's; the tabs,
// the bar and the links that mark the page you are on are `SectionNav`'s
// (claude-docs/components/coven-nav.md).
const CovenNav = ({ slug, covenRole }: CovenNavProps): ReactElement => (
  <SectionNav label="Coven" sections={covenSections(slug, covenRole)} />
);

export default CovenNav;
