import type { ReactElement } from 'react';
import SectionLinks from './section-links';
import type { SectionNavProps } from './types';
import './index.scss';

// The coven's and admin area's section nav: tabs on a wide screen, later ones behind More on a
// tablet, a bottom bar on a phone, all one markup. No client directive: the list is plain data from
// the server and the links are the client part (claude-docs/components/section-nav.md).
const SectionNav = (props: SectionNavProps): ReactElement => <SectionLinks {...props} />;

export default SectionNav;
