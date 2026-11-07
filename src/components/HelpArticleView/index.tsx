import type { Route } from 'next';
import type { ReactElement } from 'react';
import { helpTerms } from '../../lib/help-marks';
import { PendingLink } from '../../lib/navigation';
import { renderMarkdown } from '../DocumentPage/markdown';
import HelpSearchForm from '../HelpSearchForm';
import { HELP_WIDGET_ELEMENTS } from '../HelpWidget';
import { BackChevron } from '../IngredientEntry/back-chevron';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import type { HelpArticleViewProps } from './types';
import './index.scss';

/** A body with this many sections gains a contents menu; fewer are in view without one. */
const MENU_FROM = 3;

// One help article: its body as sanitised Markdown with its widgets drawn, the pages beneath it and the search box
// (claude-docs/components/help-pages.md).
const HelpArticleView = ({
  title,
  body,
  subpages,
  parent,
  heading = 'Help',
  terms = [],
  steps = {},
}: HelpArticleViewProps): ReactElement => {
  const { content, entries } = renderMarkdown(
    body,
    {},
    [],
    true,
    helpTerms(terms),
    HELP_WIDGET_ELEMENTS,
  );
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
            <PendingLink className="back-link" href={parent.href as Route}>
              <BackChevron />
              Back to {parent.title}
            </PendingLink>
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
                <PendingLink href={page.href as Route}>{page.title}</PendingLink>
                {page.summary && <p>{page.summary}</p>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      {(steps.previous || steps.next) && (
        <nav className="help-article__steps" aria-label="Guide Pages">
          {steps.previous && (
            <PendingLink
              className="back-link help-article__step"
              href={steps.previous.href as Route}
            >
              <BackChevron />
              <span>
                <span className="help-article__step-label">Previous</span>
                <span className="help-article__step-title">{steps.previous.title}</span>
              </span>
            </PendingLink>
          )}
          {steps.next && (
            <PendingLink
              className="back-link back-link--forward help-article__step help-article__step--next"
              href={steps.next.href as Route}
            >
              <span>
                <span className="help-article__step-label">Next</span>
                <span className="help-article__step-title">{steps.next.title}</span>
              </span>
              <BackChevron direction="forward" />
            </PendingLink>
          )}
        </nav>
      )}
    </article>
  );
};

export default HelpArticleView;
