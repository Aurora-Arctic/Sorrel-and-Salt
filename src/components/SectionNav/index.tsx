import type { ReactElement } from 'react';
import SectionLinks from './section-links';
import type { SectionNavProps } from './types';
import './index.scss';

// The coven's and the admin area's section nav: tabs along the context row on a wide screen,
// the same tabs with the later ones behind More on a tablet, and a bar along the bottom of
// the window on a phone, all one markup and the stylesheet's choice. No client directive
// here: the list is built on the server and handed down as plain data, and the links, which
// must know which page is open, are the client part (claude-docs/components/section-nav.md).
const SectionNav = (props: SectionNavProps): ReactElement => <SectionLinks {...props} />;

export default SectionNav;
