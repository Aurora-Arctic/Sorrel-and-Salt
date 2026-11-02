import type { ReactElement } from 'react';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import { dayInUtc } from '../../lib/utc';
import { renderMarkdown } from './markdown';
import type { DocumentPageProps } from './types';
import './index.scss';

// A public document: the privacy policy, the disclaimer, the code of ethics or the terms. The day the
// text last changed above the title, as an ingredient entry's Last Edit line sits above its names,
// then the document's own sections beside a jump menu. It reads no session and holds no application
// data, so a signed-out visitor reads the same page a member does
// (claude-docs/components/document-page.md).

// The menu is read from the markdown's own `##` and `###` headings, so a heading is written once and
// the menu and the anchors cannot drift from it. An `##` followed by `###`s is a group label: each
// `###` is an entry beneath it and the `##` has none of its own, since a group label is not a link.
const DocumentPage = ({
  title,
  lede,
  updatedOn,
  body,
  history,
}: DocumentPageProps): ReactElement => {
  const { content, entries } = renderMarkdown(body);
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
      <div className="document-page__body">
        {content}
        {history && history.length > 0 && (
          <section aria-labelledby="document-history">
            <h2 id="document-history">Earlier Versions</h2>
            <ul>
              {history.map((entry) => (
                <li key={entry.number}>
                  <a href={entry.href}>
                    Version {entry.number}, {dayInUtc(entry.publishedAt)}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
};

export default DocumentPage;
