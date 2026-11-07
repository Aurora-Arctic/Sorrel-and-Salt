import type { ReactElement } from 'react';
import { renderMarkdown } from '../DocumentPage/markdown';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import type { HelpArticleViewProps } from './types';
import './index.scss';

// One help article: its body as sanitised Markdown, the pages beneath it and the search box. A widget directive in
// the body stays as text here; the widget's own task draws it (claude-docs/components/help-pages.md).
const HelpArticleView = ({
  title,
  body,
  subpages,
  heading = 'Help',
}: HelpArticleViewProps): ReactElement => {
  const { content } = renderMarkdown(body, {}, [], true);
  return (
    <article className="help-article">
      <PageHeader title={heading} />
      <HelpSearchForm />
      <h2>{title}</h2>
      <div className="help-article__body">{content}</div>
      {subpages.length > 0 && (
        <nav className="help-article__subpages" aria-label="In This Guide">
          <ul>
            {subpages.map((page) => (
              <li key={page.href}>
                <a href={page.href}>{page.title}</a>
                {page.summary && <p>{page.summary}</p>}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  );
};

export default HelpArticleView;
