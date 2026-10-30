import type { CSSProperties, ReactElement, ReactNode } from 'react';

/**
 * Every data state of one small component side by side, each under its name (claude-docs/workshop.md,
 * rule 5). A state needing a canvas of its own (a click, an open dialog, a hanging request, a
 * viewport) is not a cell: it stays a story.
 */
export function StatesGrid({
  states,
  cell = '16rem',
}: {
  states: Readonly<Record<string, ReactNode>>;
  /** The narrowest a cell gets before the grid wraps to another row. */
  cell?: string;
}): ReactElement {
  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(min(${cell}, 100%), 1fr))`,
    gap: '1.5rem',
    alignItems: 'start',
  };
  return (
    <div style={style}>
      {Object.entries(states).map(([name, node]) => (
        <section key={name} aria-label={name}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: '0 0 0.5rem' }}>{name}</h3>
          {node}
        </section>
      ))}
    </div>
  );
}
