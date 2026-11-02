import type { ReactElement } from 'react';
import type { SectionRowProps } from './types';

// A way in that is not a provider (the password, the passkeys): its state in words and a link to the
// section of the page that manages it. No mark and no action of its own, as the section holds the controls.
export function SectionRow({ label, status, href, linkLabel }: SectionRowProps): ReactElement {
  return (
    <li className="sign-in-methods__item">
      <span className="sign-in-methods__label">{label}</span>
      <span className="meta">{status}</span>
      <a className="btn btn--quiet btn--small" href={href}>
        {linkLabel}
      </a>
    </li>
  );
}
