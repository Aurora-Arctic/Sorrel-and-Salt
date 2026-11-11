import type { PagePosition } from '../../lib/types';

export interface PagerProps {
  previousHref?: string;
  nextHref?: string;
  /**
   * A soft navigation through `next/link`, for a list whose page guards
   * itself on every render; a plain anchor's full load otherwise, which runs
   * a layout's guard again too.
   */
  soft?: boolean;
  position?: PagePosition;
}

type PagerLabel = 'Prev' | 'Next';

export interface PagerEndProps {
  href?: string;
  soft: boolean;
  label: PagerLabel;
}

export interface PagerLinkProps {
  href: string;
  label: PagerLabel;
  soft: boolean;
}

export interface PagerEndContentProps {
  label: PagerLabel;
}
