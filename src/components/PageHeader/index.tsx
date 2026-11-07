import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';
import type { PageHeaderProps } from './types';
import './index.scss';

const classes = (...names: (string | false | undefined)[]): string =>
  names.filter(Boolean).join(' ');

// No client directive and no hook, so a server page renders it (claude-docs/styling.md, "Buttons").
const PageHeader = ({
  title,
  pendingTitle,
  level = 'h1',
  greeting,
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
  const Heading = level;
  const focus = focusable ? { tabIndex: -1, 'data-view-heading': true } : {};
  // A pending title draws a bar the height of the heading in the same box, so the head keeps its
  // size; the heading is named Loading, so a wait keeps its one level-one heading.
  const heading = pendingTitle ? (
    <Heading
      id={id}
      className={headingClassName}
      data-pending-lines={pendingTitle === 2 ? 2 : undefined}
    >
      <span className="visually-hidden">Loading</span>
      <Skeleton shape="line" quiet />
    </Heading>
  ) : tag ? (
    <Heading id={id} className={classes('page-title--tagged', headingClassName)} {...focus}>
      <span>{title}</span> {tag}
    </Heading>
  ) : (
    <Heading id={id} className={headingClassName} {...focus}>
      {greeting ? (
        <>
          <span className="page-title__greeting">{greeting}</span> <span>{title}</span>
        </>
      ) : (
        title
      )}
      {suffix && <> {suffix}</>}
    </Heading>
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
