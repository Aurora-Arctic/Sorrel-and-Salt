import type { ReactElement } from 'react';
import type { AboutRolesProps } from './types';
import './index.scss';

// The About Us page's people who run the site, one card each (claude-docs/components/about-roles.md).
const AboutRoles = ({ roles }: AboutRolesProps): ReactElement => (
  <ul className="about-roles">
    {roles.map(({ heading, text, icon }) => (
      <li key={heading} className="about-roles__card">
        <div className="about-roles__top">
          {icon ? (
            <span className="about-roles__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <h3 className="about-roles__heading">{heading}</h3>
        </div>
        <p>{text}</p>
      </li>
    ))}
  </ul>
);

export default AboutRoles;
