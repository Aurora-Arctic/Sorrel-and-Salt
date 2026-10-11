import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Notice from '@/components/Notice';
import type { NoticeKind } from '@/components/Notice/types';

// The role is what makes a late-arriving notice announced, and the kind is
// what picks it (claude-docs/components/notice.md): an error or a warning is
// an alert, success a status, and a plain remark neither.

// The children are the test's own, not product copy: finding them proves the
// notice rendered, so a plain notice's missing roles are not an empty render.
const SENTENCE = 'A sentence about the view.';

describe('Notice', () => {
  it.each([
    ['error', 'alert'],
    ['warn', 'alert'],
    ['success', 'status'],
    ['plain', null],
  ] as const satisfies readonly (readonly [NoticeKind, 'alert' | 'status' | null])[])(
    'renders a %s notice with the %s role',
    (kind, role) => {
      render(<Notice kind={kind}>{SENTENCE}</Notice>);

      expect(screen.getByText(SENTENCE)).toBeInTheDocument();

      for (const other of ['alert', 'status'] as const) {
        if (other === role) {
          expect(screen.getByRole(other)).toBeInTheDocument();
        } else {
          expect(screen.queryByRole(other)).not.toBeInTheDocument();
        }
      }
    },
  );

  // A notice on the page from the start is a status, not an alert, so it is
  // found by its role without being announced over what the reader is doing.
  it('renders a quiet warning as a status', () => {
    render(
      <Notice kind="warn" quiet>
        {SENTENCE}
      </Notice>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(SENTENCE);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
