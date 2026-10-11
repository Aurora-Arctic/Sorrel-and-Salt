'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactElement, useId } from 'react';
import { ChevronIcon } from '../Combobox/icons';
import type { AdminPage, AdminSection, NavLinksProps } from './types';

// The nav's links, the one part that has to know which page is open, and so
// the one client part: only `usePathname()` reads the address, and only in a
// client component (claude-docs/components/admin-nav.md).

// A link is current on its own page and on any address beneath it, but not on
// a page whose path merely begins with its letters: a later
// `/admin/forms-archive` must not mark Forms. Hence the slash, rather than a
// bare `startsWith(href)`.
const isCurrent = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

/** The section and page you are on, or null on the index, which is in no section. */
function locate(
  sections: readonly AdminSection[],
  pathname: string,
): { section: AdminSection; page: AdminPage } | null {
  for (const section of sections) {
    const page = section.pages.find(({ href }) => isCurrent(pathname, href));
    if (page) return { section, page };
  }
  return null;
}

const NavLinks = ({ sections }: NavLinksProps): ReactElement => {
  const pathname = usePathname();
  const groupId = useId();
  const here = locate(sections, pathname);

  const link = ({ href, label }: AdminPage) => (
    <li key={href}>
      {/* Every route is built, so typed routes accept each (M5.6b). */}
      <Link href={href} aria-current={isCurrent(pathname, href) ? 'page' : undefined}>
        {label}
      </Link>
    </li>
  );

  return (
    <>
      {/* Wider than a phone: every page in one wrapping `.link-row`, in the
          sections' order, the current one drawn by weight and a heavy
          underline (claude-docs/styling.md, "Link rows and provider marks"). */}
      <ul className="link-row admin-nav__row">
        {sections.flatMap(({ pages }) => pages).map(link)}
      </ul>
      {/* At a phone's width: the same links in their sections behind a
          disclosure, which opens and navigates with no script. Both are in
          the page and the stylesheet shows one, since a `<details>` cannot be
          open at one width and shut at another without script. Keyed by the
          address, so a client-side navigation, which keeps the layout
          mounted, remounts it shut. */}
      <details key={pathname} className="admin-nav__menu">
        <summary className="admin-nav__summary">
          <span className="admin-nav__here">
            {here === null ? (
              'Admin Pages'
            ) : (
              <>
                {/* A section of one page, the compendium, is not named twice. */}
                {here.section.name !== here.page.label && (
                  <span className="admin-nav__section">
                    {here.section.name}
                    <span className="visually-hidden">, </span>
                  </span>
                )}
                <span className="admin-nav__page">{here.page.label}</span>
              </>
            )}
          </span>
          <span className="admin-nav__chevron">
            <ChevronIcon />
          </span>
        </summary>
        <div className="admin-nav__groups">
          {sections.map(({ name, pages }, at) => (
            <div key={name}>
              <p className="admin-nav__group-name" id={`${groupId}-${at}`}>
                {name}
              </p>
              <ul className="link-row" aria-labelledby={`${groupId}-${at}`}>
                {pages.map(link)}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </>
  );
};

export default NavLinks;
