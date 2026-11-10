import { PendingLink } from '../../lib/navigation';
import type { ReactElement } from 'react';
import SkeletonText from '../Skeleton/text';
import { adminSections, CURATOR_SECTIONS } from './sections';
import type { AdminNavProps, ContentsProps } from './types';

// Each area's index, a table of contents: the nav's sections, each a titled list of its pages with a line
// saying what each is for. Here rather than in the page so it reads the nav's own list
// (claude-docs/components/admin-nav.md, "The index").

// An id from the page's first tab, `/curator/categories` giving
// `admin-contents-categories`, so the link can be described by its line.
const descriptionId = (href: string): string =>
  `admin-contents-${href.slice(href.lastIndexOf('/') + 1)}`;

// With `pending`, the same words as plain text for a skeleton: no links and no ids, since the loaded
// index is mounted beside it and the hidden copy must hold nothing focusable or duplicated.
const Contents = ({ sections, pending = false }: ContentsProps): ReactElement => (
  <div className="admin-contents" aria-hidden={pending || undefined}>
    {sections.map(({ name, pages }, at) => (
      <section
        key={name ?? at}
        className="page-frame__section"
        aria-labelledby={pending || !name ? undefined : `admin-section-${at}`}
      >
        {name && (
          <h2 id={pending ? undefined : `admin-section-${at}`}>
            {pending ? <SkeletonText>{name}</SkeletonText> : name}
          </h2>
        )}
        <ul className="admin-contents__list">
          {pages.map(({ label, description, tabs: [{ href }] }) => (
            // Each page at its first tab, as the nav links it.
            <li key={href}>
              {pending ? (
                <span className="admin-contents__name admin-contents__name--pending">
                  <SkeletonText>{label}</SkeletonText>
                </span>
              ) : (
                <PendingLink href={href} aria-describedby={descriptionId(href)}>
                  {label}
                </PendingLink>
              )}
              <span
                id={pending ? undefined : descriptionId(href)}
                className="admin-contents__description"
              >
                {pending ? <SkeletonText>{description}</SkeletonText> : description}
              </span>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
);

const AdminContents = ({ managesPeople }: AdminNavProps): ReactElement => (
  <Contents sections={adminSections(managesPeople)} />
);

export const AdminContentsPending = ({ managesPeople }: AdminNavProps): ReactElement => (
  <Contents sections={adminSections(managesPeople)} pending />
);

export const CuratorContents = (): ReactElement => <Contents sections={CURATOR_SECTIONS} />;

export const CuratorContentsPending = (): ReactElement => (
  <Contents sections={CURATOR_SECTIONS} pending />
);

export default AdminContents;
