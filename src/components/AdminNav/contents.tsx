import Link from 'next/link';
import type { ReactElement } from 'react';
import { ADMIN_SECTIONS } from './sections';

// The `/admin` index's table of contents (MB.115): the nav's sections, each a
// titled list of its pages with the one line saying what each is for. Here
// rather than in the page so it reads the nav's own list, and the two cannot
// drift (claude-docs/components/admin-nav.md, "The index").

// An id from the page's first tab, `/admin/categories` giving
// `admin-contents-categories`, so the link can be described by its line.
const descriptionId = (href: string): string =>
  `admin-contents-${href.slice(href.lastIndexOf('/') + 1)}`;

const AdminContents = (): ReactElement => (
  <div className="admin-contents">
    {ADMIN_SECTIONS.map(({ name, pages }, at) => (
      <section key={name} className="page-frame__section" aria-labelledby={`admin-section-${at}`}>
        <h2 id={`admin-section-${at}`}>{name}</h2>
        <ul className="admin-contents__list">
          {pages.map(({ label, description, tabs: [{ href }] }) => (
            // Each page at its first tab, as the nav links it.
            <li key={href}>
              <Link href={href} aria-describedby={descriptionId(href)}>
                {label}
              </Link>
              <span id={descriptionId(href)} className="admin-contents__description">
                {description}
              </span>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
);

export default AdminContents;
