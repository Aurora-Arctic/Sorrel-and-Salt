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

// The menu is read from the `h2` children themselves, so a heading is written once and the menu and
// the anchors cannot drift from it.
function withSections(children: ReactNode): { body: ReactNode[]; entries: PageNavEntry[] } {
  const entries: PageNavEntry[] = [];
  const body = Children.toArray(children).map((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child) || child.type !== 'h2') return child;
    const label = Children.toArray(child.props.children).join('');
    const id = slugify(label);
    entries.push({ href: `#${id}`, label });
    return cloneElement(child, { id } as object);
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
