'use client';

import type { ReactElement } from 'react';
import { covenSlugOf } from '../../lib/coven-path';
import { useNavigationState } from '../../lib/navigation';
import Notice from '../Notice';
import type { DemoNoticeProps } from './types';

// It sits above the section body so the body's skeleton does not cover it, and leaves when a switch starts.
export default function DemoNotice({ slug, text }: DemoNoticeProps): ReactElement | null {
  const { busy, href } = useNavigationState();
  const heading = href === undefined ? null : covenSlugOf(href.split(/[?#]/)[0] ?? href);
  if (busy && heading !== null && heading !== slug) return null;
  return (
    // A region of its own: axe asks all page content to sit in a landmark, and the pages own the main one.
    <section aria-label="Demo Coven" className="coven-layout__demo-notice">
      <Notice kind="warn" quiet>
        <span className="coven-layout__demo-text">{text}</span>
      </Notice>
    </section>
  );
}
