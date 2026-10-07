import type { Route } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import type { PagerEndProps, PagerProps } from './types';
import './index.scss';

// A paged list's Prev and Next, centred under it on the `.pager` primitive
// (claude-docs/components/pager.md). An end with no page is disabled rather
// than hidden, the owner's call in M5.6, so neither control moves from one
// page to the next. A list of one page has no pager at all.

const PagerEnd = ({ href, soft, label }: PagerEndProps): ReactElement => {
  const mark = (
    <span className="pager__mark" aria-hidden="true">
      {label === 'Prev' ? '‹' : '›'}
    </span>
  );
  const content =
    label === 'Prev' ? (
      <>
        {mark}
        {label}
      </>
    ) : (
      <>
        {label}
        {mark}
      </>
    );
  // An anchor cannot be `disabled`: a link with no address and
  // `aria-disabled`, which `.btn` draws as off and nothing can follow. The
  // role is not redundant: an `<a>` without `href` is no link to assistive
  // technology, and a disabled Prev should still read as the pager's Prev.
  if (!href) {
    return (
      // oxlint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/no-redundant-roles
      <a className="btn btn--quiet" role="link" aria-disabled="true">
        {content}
      </a>
    );
  }
  return soft ? (
    <Link className="btn btn--quiet" href={href as Route}>
      {content}
    </Link>
  ) : (
    <a className="btn btn--quiet" href={href}>
      {content}
    </a>
  );
};

const Pager = ({
  previousHref,
  nextHref,
  soft = false,
  position,
}: PagerProps): ReactElement | null => {
  if (!previousHref && !nextHref) return null;
  return (
    <nav className="pager" aria-label="Pages">
      <ul>
        <li>
          <PagerEnd href={previousHref} soft={soft} label="Prev" />
        </li>
        {position && (
          <li className="pager__position">
            Page {position.page} of {position.pages}
          </li>
        )}
        <li>
          <PagerEnd href={nextHref} soft={soft} label="Next" />
        </li>
      </ul>
    </nav>
  );
};

export default Pager;
