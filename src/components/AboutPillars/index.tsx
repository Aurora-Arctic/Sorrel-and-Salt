import type { ReactElement } from 'react';
import type { AboutPillarsProps } from './types';
import './index.scss';

// The About Us page's four parts as a grid of cards (claude-docs/components/about-pillars.md).
const AboutPillars = ({ pillars }: AboutPillarsProps): ReactElement => (
  <ul className="about-pillars">
    {pillars.map(({ kicker, heading, text, icon, accent }) => (
      <li key={heading} className="about-pillars__card card--quiet" data-accent={accent}>
        <div className="about-pillars__top">
          <span className="eyebrow">{kicker}</span>
          {icon ? (
            <span className="about-pillars__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
        </div>
        <h3 className="about-pillars__heading">{heading}</h3>
        <p>{text}</p>
      </li>
    ))}
  </ul>
);

export default AboutPillars;
