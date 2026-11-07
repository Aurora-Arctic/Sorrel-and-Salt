import type { ReactElement } from 'react';
import { helpTerms } from '../../lib/help-marks';
import { renderMarkdown } from '../DocumentPage/markdown';
import HelpSearchForm from '../HelpSearchForm';
import { BackChevron } from '../IngredientEntry/back-link';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import type { HelpArticleViewProps } from './types';
import './index.scss';

/** A body with this many sections gains a contents menu; fewer are in view without one. */
const MENU_FROM = 3;

// One help article: its body as sanitised Markdown, the pages beneath it and the search box. A widget directive in
// the body stays as text here; the widget's own task draws it (claude-docs/components/help-pages.md).
const HelpArticleView = ({
  title,
  body,
  subpages,
  parent,
  heading = 'Help',
  terms = [],
}: HelpArticleViewProps): ReactElement => {
  const { content, entries } = renderMarkdown(body, {}, [], true, helpTerms(terms));
  // The entries are read before the headings move down, so a top-level entry or a group is one `##` of the body.
  const sections =
    entries.filter((entry) => entry.group === undefined).length +
    new Set(entries.flatMap((entry) => (entry.group === undefined ? [] : [entry.group]))).size;
  const withMenu = sections >= MENU_FROM;
  return (
    <article
      className={withMenu ? 'help-page help-article page-with-nav' : 'help-page help-article'}
    >
      <div className="help-article__head">
        <PageHeader title={heading} />
        <HelpSearchForm />
        {parent && (
          <p className="help-article__parent">
            <a className="back-link" href={parent.href}>
              <BackChevron />
              Back to {parent.title}
            </a>
          </p>
        )}
        <h2>{title}</h2>
      </div>
      {withMenu && <PageNav label="On This Page" entries={entries} collapsible />}
      <div className="help-article__body">{content}</div>
      {subpages.length > 0 && (
        <nav className="help-article__subpages" aria-label="In This Guide">
          <p className="eyebrow" aria-hidden="true">
            In This Guide
          </p>
          <ol>
            {subpages.map((page) => (
              <li key={page.href}>
                <a href={page.href}>{page.title}</a>
                {page.summary && <p>{page.summary}</p>}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </article>
  );
};

export default HelpArticleView;
