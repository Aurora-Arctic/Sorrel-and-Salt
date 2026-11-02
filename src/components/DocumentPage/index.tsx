import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import type { PageNavEntry } from '../PageNav/types';
import { slugify } from '../../lib/slugify';
import { dayInUtc } from '../../lib/utc';
import type { DocumentPageProps } from './types';
import './index.scss';

// A public document: the privacy policy, the disclaimer, the code of ethics or the terms. The day the
// text last changed above the title, as an ingredient entry's Last Edit line sits above its names,
// then the document's own sections beside a jump menu. It reads no session and holds no application
// data, so a signed-out visitor reads the same page a member does
// (claude-docs/components/document-page.md).

// The menu is read from the `h2` and `h3` children themselves, so a heading is written once and the
// menu and the anchors cannot drift from it. An `h2` followed by `h3`s is a group label: each `h3`
// is an entry beneath it and the `h2` has none of its own, since a group label is not a link. An `h2`
// with no `h3` after it is an entry itself.
function withSections(children: ReactNode): { body: ReactNode[]; entries: PageNavEntry[] } {
  const items = Children.toArray(children);
  const headingOf = (child: ReactNode): { tag: string; label: string; id: string } | null => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return null;
    if (child.type !== 'h2' && child.type !== 'h3') return null;
    const label = Children.toArray(child.props.children).join('');
    return { tag: child.type, label, id: slugify(label) };
  };
  const entries: PageNavEntry[] = [];
  let group: string | null = null;
  const body = items.map((child, index) => {
    const heading = headingOf(child);
    if (!heading || !isValidElement(child)) return child;
    if (heading.tag === 'h2') {
      const next = items.slice(index + 1).find((item) => headingOf(item) !== null);
      const hasSubsections = next !== undefined && headingOf(next)?.tag === 'h3';
      group = hasSubsections ? heading.label : null;
      if (!hasSubsections) entries.push({ href: `#${heading.id}`, label: heading.label });
    } else {
      entries.push({
        href: `#${heading.id}`,
        label: heading.label,
        ...(group === null ? {} : { group }),
      });
    }
    return cloneElement(child, { id: heading.id } as object);
  });
  return { body, entries };
}

const DocumentPage = ({ title, lede, updatedOn, children }: DocumentPageProps): ReactElement => {
  const { body, entries } = withSections(children);
  return (
    <article className="document-page page-with-nav" aria-labelledby="document-title">
      <div className="document-page__head">
        <p className="document-page__updated">
          Last updated{' '}
          <time dateTime={updatedOn.toISOString().slice(0, 10)}>{dayInUtc(updatedOn)}</time>
        </p>
        <PageHeader id="document-title" title={title} lede={lede} />
      </div>
      {entries.length > 0 && <PageNav label="On This Page" entries={entries} />}
      <div className="document-page__body">{body}</div>
    </article>
  );
};

export default DocumentPage;

export { SourceItem, SourceMarks } from './sources';
