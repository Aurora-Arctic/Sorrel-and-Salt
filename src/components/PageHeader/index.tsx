import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';
import type { PageHeaderProps } from './types';

const classes = (...names: (string | false | undefined)[]): string =>
  names.filter(Boolean).join(' ');

// Every page's head: the heading with its one primary action on the same line, the action at the end
// (claude-docs/styling.md, "Buttons"), and, where the page carries them, an eyebrow above and a lede
// beneath in a `.header` column. No client directive and no hook, so a server page renders it
// directly; an action that needs the browser is a client component of its own.
const PageHeader = ({
  title,
  pendingTitle,
  id,
  eyebrow,
  lede,
  lead,
  tag,
  action,
  className,
  headingClassName,
  focusable,
  suffix,
}: PageHeaderProps): ReactElement => {
  // A tag makes the h1 a two-column grid, so it stays beside the title's first line when the title wraps.
  const focus = focusable ? { tabIndex: -1, 'data-view-heading': true } : {};
  // A pending title draws a bar the height of the heading in the same box, so the head keeps its
  // size; the heading is hidden from assistive technology, the shell's status saying Loading.
  const heading = pendingTitle ? (
    <h1 id={id} className={headingClassName} aria-hidden="true">
      <Skeleton shape="line" quiet />
    </h1>
  ) : tag ? (
    <h1 id={id} className={classes('page-title--tagged', headingClassName)} {...focus}>
      <span>{title}</span> {tag}
    </h1>
  ) : (
    <h1 id={id} className={headingClassName} {...focus}>
      {title}
      {suffix && <> {suffix}</>}
    </h1>
  );
  const column = Boolean(eyebrow) || Boolean(lede);
  const line =
    column && !lead && !action ? (
      heading
    ) : (
      <div className={classes('page-header', !column && className)}>
        {lead ? (
          <div className="page-header__title">
            {lead}
            {heading}
          </div>
        ) : (
          heading
        )}
        {action}
      </div>
    );
  if (!column) return line;
  return (
    <div className={classes('header', className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      {line}
      {lede && <p className="lede">{lede}</p>}
    </div>
  );
};

export default PageHeader;
