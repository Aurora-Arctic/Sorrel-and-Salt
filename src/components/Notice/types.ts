import type { ReactNode } from 'react';

/** What a notice says about the view: a failure, a caution, news of success, or a plain remark. */
export type NoticeKind = 'error' | 'warn' | 'success' | 'plain';

export interface NoticeProps {
  /** Picks both the look and the role: error and warn are alerts, success is a status, plain is neither. */
  kind: NoticeKind;
  /** For a control that names the notice in its `aria-describedby`. */
  id?: string;
  /** A layout class from the caller, added after the notice's own. */
  className?: string;
  children: ReactNode;
}
