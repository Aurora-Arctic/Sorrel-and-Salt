import { type AnchorHTMLAttributes, type ReactElement, createContext, useContext } from 'react';

// What `next/link` resolves to in the workshop (vite.config.ts aliases it):
// a plain anchor. Ladle runs under Vite with no Next router or `process`, and
// this is the substitution Ladle's own Next.js guide prescribes
// (claude-docs/workshop.md, ".ladle/").

/** The href of the link a component sits inside, for `useLinkStatus` below. */
const LinkHref = createContext<string | undefined>(undefined);

/**
 * The link a story shows as pressed and still on its way, by its href: a
 * story wraps itself in this provider to show a link's pending state, as a
 * tabbed page's does (MB.115). Nothing is pending unless one says so.
 */
export const WorkshopPendingHref = createContext<string | undefined>(undefined);

const UnoptimizedLink = ({
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>): ReactElement => (
  <LinkHref.Provider value={props.href}>
    <a {...props}>{children}</a>
  </LinkHref.Provider>
);

// Next's hook answers whether the link it sits in is on its way; here, only
// the one a story names.
export function useLinkStatus(): { pending: boolean } {
  const href = useContext(LinkHref);
  const pending = useContext(WorkshopPendingHref);
  return { pending: href !== undefined && href === pending };
}

export default UnoptimizedLink;
