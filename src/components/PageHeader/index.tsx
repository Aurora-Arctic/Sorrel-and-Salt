import type { ReactElement } from 'react';
import type { PageHeaderProps } from './types';

const classes = (...names: (string | false | undefined)[]): string =>
  names.filter(Boolean).join(' ');

// Every page's head: the heading with its one primary action on the same line, the action at the end
// (claude-docs/styling.md, "Buttons"), and, where the page carries them, an eyebrow above and a lede
// beneath in a `.header` column. No client directive and no hook, so a server page renders it
// directly; an action that needs the browser is a client component of its own.
const PageHeader = ({
  title,
  id,
  eyebrow,
  lede,
  lead,
  tag,
  action,
  className,
}: PageHeaderProps): ReactElement => {
  // A tag makes the h1 a two-column grid, so it stays beside the title's first line when the title wraps.
  const heading = tag ? (
    <h1 id={id} className="page-title--tagged">
      <span>{title}</span> {tag}
    </h1>
  ) : (
    <h1 id={id}>{title}</h1>
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
