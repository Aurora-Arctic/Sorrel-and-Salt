import type { ComponentType, ReactElement } from 'react';
import ContextRow from '../ContextRow';
import { HelpFrontSkeleton } from '../HelpFront/skeleton';
import PageColumn from '../PageColumn';
import Skeleton from '../Skeleton';
import { isHelpFront } from '../../lib/help-paths';
import type { SkeletonHost } from '../../lib/navigation/skeleton-for';

/** The context row a page draws above itself, its lead a bar the size of the switcher. */
export const SkeletonContextRow = (): ReactElement => (
  <ContextRow
    lead={
      <span className="skeleton-frame__lead">
        <Skeleton shape="block" quiet />
      </span>
    }
  />
);

// A section's page drawn by the shell's body, because its section is not standing (a move in from
// the compendium or from another area). The section's own layout is not mounted yet, so this draws
// the context row it will have and the frame its body keeps, so the
// page's head stands where it will and nothing jumps when the section arrives.
const frames = new Map<ComponentType, Map<string, ComponentType>>();

/** The page's skeleton inside the frame of the section `host` names, one component per skeleton (and per `query`, the words the help header's box shows, and per whether `destination`, the page's address or route, is headed Help). */
export function framed(
  host: SkeletonHost,
  Page: ComponentType,
  query = '',
  destination = '/help',
): ComponentType {
  if (host === 'main') return Page;
  const byQuery = frames.get(Page) ?? new Map<string, ComponentType>();
  frames.set(Page, byQuery);
  const asLabel = !isHelpFront(destination);
  const key = `${asLabel}|${query}`;
  const known = byQuery.get(key);
  if (known) return known;
  if (host === 'help') {
    const InHelp = (): ReactElement => (
      <PageColumn as="div">
        <HelpFrontSkeleton query={query} asLabel={asLabel}>
          <Page />
        </HelpFrontSkeleton>
      </PageColumn>
    );
    byQuery.set(key, InHelp);
    return InHelp;
  }
  const className = host === 'coven' ? 'coven-layout' : 'page-column';
  const Framed = (): ReactElement => (
    <>
      <SkeletonContextRow />
      <div className={className}>
        <Page />
      </div>
    </>
  );
  byQuery.set(key, Framed);
  return Framed;
}
