import type { ReactElement } from 'react';
import PageHeader from '../PageHeader';
import { dayInUtc } from '../../lib/utc';
import type { DocumentPageProps } from './types';
import './index.scss';

// A public document: the privacy policy, the disclaimer or the code of ethics. The day the text
// last changed above the title, as an ingredient entry's Last Edit line sits above its names, then
// the document's own sections. It reads no session and holds no application data, so a signed-out
// visitor reads the same page a member does (claude-docs/components/document-page.md).

const DocumentPage = ({ title, lede, updatedOn, children }: DocumentPageProps): ReactElement => (
  <article className="document-page" aria-labelledby="document-title">
    <p className="document-page__updated">
      Last updated{' '}
      <time dateTime={updatedOn.toISOString().slice(0, 10)}>{dayInUtc(updatedOn)}</time>
    </p>
    <PageHeader id="document-title" eyebrow="Documents" title={title} lede={lede} />
    <div className="document-page__body">{children}</div>
  </article>
);

export default DocumentPage;
