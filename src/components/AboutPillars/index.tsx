import type { ReactElement } from 'react';
import AboutCards from '../AboutCards';
import type { AboutPillarsProps } from './types';
import './index.scss';

// The About Us page's four parts as a grid of cards (claude-docs/components/about-pillars.md).
const AboutPillars = ({ pillars }: AboutPillarsProps): ReactElement => (
  <AboutCards block="about-pillars" cards={pillars} quiet />
);

export default AboutPillars;
