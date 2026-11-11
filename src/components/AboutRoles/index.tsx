import type { ReactElement } from 'react';
import AboutCards from '../AboutCards';
import type { AboutRolesProps } from './types';
import './index.scss';

// The About Us page's people who run the site, one card each (claude-docs/components/about-roles.md).
const AboutRoles = ({ roles }: AboutRolesProps): ReactElement => (
  <AboutCards block="about-roles" cards={roles} />
);

export default AboutRoles;
