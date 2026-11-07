import type { ReactElement } from 'react';
import type { PageHeaderProps } from './types';

const classes = (...names: (string | false | undefined)[]): string =>
  names.filter(Boolean).join(' ');

// No client directive and no hook, so a server page renders it (claude-docs/styling.md, "Buttons").
const PageHeader = ({
  title,
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
  const heading = tag ? (
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
