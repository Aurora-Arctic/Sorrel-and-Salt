import type { ComponentType, ReactElement } from 'react';
import ContextRow from '../ContextRow';
import Skeleton from '../Skeleton';
import type { SkeletonHost } from '../../lib/navigation/skeleton-for';
import './index.scss';

// A section's page drawn by the shell's body, because its section is not standing (a move in from
// the compendium or from another area). The section's own layout is not mounted yet, so this draws
// the context row it will have, and the frame its body keeps, so the page's head stands where it
// will and nothing jumps when the section arrives.
const frames = new Map<ComponentType, ComponentType>();

/** The page's skeleton inside the frame of the section `host` names, one component per skeleton. */
export function framed(host: SkeletonHost, Page: ComponentType): ComponentType {
  if (host === 'main') return Page;
  const known = frames.get(Page);
  if (known) return known;
  const className = host === 'coven' ? 'coven-layout' : 'page-column';
  const Framed = (): ReactElement => (
    <>
      <ContextRow
        lead={
          <span className="skeleton-frame__lead">
            <Skeleton shape="block" quiet />
          </span>
        }
      />
      <div className={className}>
        <Page />
      </div>
    </>
  );
  frames.set(Page, Framed);
  return Framed;
}
