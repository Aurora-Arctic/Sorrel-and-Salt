import type { ReactNode } from 'react';

/**
 * What a notice says about the view: a failure, a warning, a caution (a
 * quieter warning, in muted grey with the ochre triangle), news of success, or
 * a plain remark.
 */
export type NoticeKind = 'error' | 'warn' | 'caution' | 'success' | 'plain';

export interface NoticeProps {
  /** Picks both the look and the role: error, warn and caution are alerts, success is a status, plain is neither. */
  kind: NoticeKind;
  /**
   * A notice on the page from the start, which must not interrupt: an error,
   * warning or caution rendered as a status (an `<output>`) rather than an alert.
   * Success is a status already, and a plain remark has no role to quieten.
   */
  quiet?: boolean;
  /**
   * Holds block content, a sentence with a list or buttons beneath it, as a
   * `<div>` rather than a `<p>`, with the same look and the same role rules.
   */
  block?: boolean;
  /**
   * Inside a live region that is always in the page and announces it: the
   * notice takes no role of its own, so nothing is announced twice. The look
   * still follows the kind.
   */
  inRegion?: boolean;
  /** For a control that names the notice in its `aria-describedby`. */
  id?: string;
  /**
   * The message a form's submit produced: focusable by script, and the target `useResultFocus` moves
   * focus to, so a keyboard or screen-reader user lands on the answer.
   */
  result?: boolean;
  /** A layout class from the caller, added after the notice's own. */
  className?: string;
  children: ReactNode;
}
