'use client';

import type { ReactElement } from 'react';
import { useNavigationState } from '../../lib/navigation';
import Notice from '../Notice';
import type { DemoNoticeProps } from './types';

// The demo coven's warning. It sits above the section body, so the body's skeleton does not cover it;
// it leaves as soon as a switch to another coven starts, so the coven loading is not read as the demo.
export default function DemoNotice({ slug, text }: DemoNoticeProps): ReactElement | null {
  const { busy, target } = useNavigationState();
  if (busy && target?.coven !== undefined && target.coven !== slug) return null;
  return (
    // A region of its own: axe asks all page content to sit in a landmark, and the pages own the main one.
    <section aria-label="Demo Coven" className="coven-layout__demo-notice">
      <Notice kind="warn" quiet>
        <span className="coven-layout__demo-text">{text}</span>
      </Notice>
    </section>
  );
}
