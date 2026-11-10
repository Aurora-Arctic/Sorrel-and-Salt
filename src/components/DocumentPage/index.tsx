import type { ReactElement } from 'react';
import type { Route } from 'next';
import { EditLink } from '../IconTip';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import { dayInUtc } from '../../lib/utc';
import { renderMarkdown } from './markdown';
import type { DocumentPageProps } from './types';
import './index.scss';

// A public document (privacy policy, about us, disclaimer, code of ethics, terms) beside a jump menu. It reads no session
// itself and holds no application data; the page that renders it hands a keeper the editor address
// (claude-docs/components/document-page.md).

// The menu is read from the markdown's own `##` and `###` headings, so a heading is written once and
// the menu and the anchors cannot drift from it. An `##` followed by `###`s is a group label: each
// `###` is an entry beneath it and the `##` has none of its own, since a group label is not a link.
const DocumentPage = ({
  title,
  lede,
  updatedOn,
  number,
  body,
  history,
  placeholders,
  editHref,
  variant,
}: DocumentPageProps): ReactElement => {
  const { content, entries } = renderMarkdown(body, placeholders);
  return (
    <article
      className={`document-page page-with-nav${variant ? ` document-page--${variant}` : ''}`}
      aria-labelledby="document-title"
    >
      <div className="document-page__head">
        {updatedOn && (
          <p className="document-page__updated">
            {number !== undefined && <>Version {number}, </>}
            {number !== undefined ? 'last updated' : 'Last updated'}{' '}
            <time dateTime={updatedOn.toISOString().slice(0, 10)}>{dayInUtc(updatedOn)}</time>
          </p>
        )}
        <PageHeader
          id="document-title"
          title={title}
          lede={lede}
          action={editHref && <EditLink href={editHref as Route} name={title} />}
        />
      </div>
      {entries.length > 0 && <PageNav label="On This Page" entries={entries} collapsible />}
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
