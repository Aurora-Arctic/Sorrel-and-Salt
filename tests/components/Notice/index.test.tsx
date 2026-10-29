import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Notice from '@/components/Notice';
import type { NoticeKind } from '@/components/Notice/types';

// The role is what makes a late-arriving notice announced, and the kind is
// what picks it (claude-docs/components/notice.md): an error, a warning or a
// caution is an alert, success a status, and a plain remark neither.

// The children are the test's own, not product copy: finding them proves the
// notice rendered, so a plain notice's missing roles are not an empty render.
const SENTENCE = 'A sentence about the view.';

describe('Notice', () => {
  it.each([
    ['error', 'alert'],
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
  it.each(['warn'] as const)('renders a quiet %s as a status', (kind) => {
    render(
      <Notice kind={kind} quiet>
        {SENTENCE}
      </Notice>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(SENTENCE);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// The block form holds what a sentence cannot: a list and buttons beneath it,
// for the duplicates warning (M12.48). A `<p>` cannot hold a list or a button,
// nor an `<output>` a list, so the block form keeps the kinds and their roles
// on an element that can.
describe('Notice, the block form', () => {
  /** A sentence, a list and a button, as the duplicates warning holds. */
  const Block = ({ kind, quiet }: { kind: NoticeKind; quiet?: boolean }) => (
    <Notice kind={kind} quiet={quiet} block>
      <p>{SENTENCE}</p>
      <ul>
        <li>Testwort</li>
      </ul>
      <button type="button">Fixture Action</button>
    </Notice>
  );

  /** A list or a button where the HTML content model forbids it. */
  const invalidNesting = (container: HTMLElement) =>
    container.querySelector('p ul, p button, p p, output ul, output p, output div');

  it.each([
    ['error', 'alert'],
    ['success', 'status'],
    ['plain', null],
  ] as const satisfies readonly (readonly [NoticeKind, 'alert' | 'status' | null])[])(
    'holds a sentence, a list and a button as a %s notice with the %s role',
    (kind, role) => {
      const { container } = render(<Block kind={kind} />);

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fixture Action' })).toBeInTheDocument();
      expect(invalidNesting(container)).toBeNull();

      for (const other of ['alert', 'status'] as const) {
        if (other === role) {
          const notice = screen.getByRole(other);
          expect(notice).toHaveTextContent(SENTENCE);
          expect(within(notice).getByRole('list')).toBeInTheDocument();
          expect(within(notice).getByRole('button')).toBeInTheDocument();
        } else {
          expect(screen.queryByRole(other)).not.toBeInTheDocument();
        }
      }
    },
  );

  it.each(['error'] as const)('holds a quiet %s as a status', (kind) => {
    const { container } = render(<Block kind={kind} quiet />);

    expect(within(screen.getByRole('status')).getByRole('list')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(invalidNesting(container)).toBeNull();
  });
});

// A notice inside a live region that is always in the page: the region
// announces it, so a role of its own would have it announced twice.
describe('Notice, inside a region', () => {
  it.each(['success'] as const)('takes no role of its own as a %s, inline or block', (kind) => {
    render(
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a test fixture standing in for the real control
      <div role="status" aria-label="Fixture Region">
        <Notice kind={kind} inRegion>
          {SENTENCE}
        </Notice>
        <Notice kind={kind} inRegion quiet block>
          <p>{SENTENCE}</p>
        </Notice>
      </div>,
    );

    const region = screen.getByRole('status', { name: 'Fixture Region' });
    // Both notices drew, inside the region, and neither is a region itself.
    expect(within(region).getAllByText(SENTENCE)).toHaveLength(2);
    expect(screen.getAllByRole('status')).toEqual([region]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
