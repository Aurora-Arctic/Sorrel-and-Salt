import type { ReactNode } from 'react';

export type NoticeKind = 'error' | 'warn' | 'caution' | 'success' | 'plain';

export interface NoticeProps {
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
  inRegion?: boolean;
  id?: string;
  /**
   * The message a form's submit produced: focusable by script, and the target `useResultFocus` moves
   * focus to, so a keyboard or screen-reader user lands on the answer.
   */
  result?: boolean;
  className?: string;
  children: ReactNode;
}
