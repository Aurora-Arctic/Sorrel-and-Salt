import type { AnchorHTMLAttributes, ReactElement } from 'react';

// What `next/link` resolves to in the workshop (vite.config.ts aliases it):
// a plain anchor. Ladle runs under Vite with no Next router or `process`, and
// this is the substitution Ladle's own Next.js guide prescribes
// (claude-docs/workshop.md, ".ladle/").
const UnoptimizedLink = ({
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>): ReactElement => <a {...props}>{children}</a>;

export default UnoptimizedLink;
