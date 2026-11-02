import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import MemberDetail from '@/components/MemberDetail';
import Modal from '@/components/Modal';
import { makeQueryClient } from '@/lib/graphql-client';
import { announced } from '../../support/click-feedback';
import { graphqlLink, mockGraphQLQuery } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

// The member modal's Coven Access section: an owner's pause on one member's access to the coven, and its lifting. The
// page's own read says whether a pause stands; the member's pauses are read as the modal opens, and again after either
// write (claude-docs/components/member-detail.md, "Coven Access").

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, replace: vi.fn() }) }));

const owner = { id: 'o', name: 'Owner Testwort' };
const LIFTED = {
  id: 'p1',
  until: null,
  note: 'Too many edits',
  liftedAt: '2026-10-02T09:00:00.000Z',
  audit: { createdAt: '2026-10-01T09:00:00.000Z' },
  setBy: owner,
  liftedBy: owner,
};
const STANDING = {
  id: 'p2',
  until: '2099-01-01T00:00:00.000Z',
  note: 'Cooling off',
  liftedAt: null,
  audit: { createdAt: '2026-10-05T09:00:00.000Z' },
  setBy: owner,
  liftedBy: null,
};

/** Answers the pauses query with `history`, counting the reads, and records each mutation's name and variables. */
function serve(history: readonly object[]) {
  const reads = { count: 0 };
  mockGraphQLQuery('MemberPauses', () => {
    reads.count += 1;
    return { workspace: { id: 'w', memberPauses: { edges: history.map((node) => ({ node })) } } };
  });
  const sent: { name: string; variables: Record<string, unknown> }[] = [];
  for (const name of ['PauseMemberAccess', 'LiftMemberAccessPause']) {
    server.use(
      graphqlLink.mutation(name, ({ variables }) => {
        sent.push({ name, variables });
        return HttpResponse.json({ data: { [name]: { id: 'p9' } } });
      }),
    );
  }
  return { sent, reads };
}

const renderPanel = (standing: { until: Date | null } | null) =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <StatusRegionProvider>
        <Modal title="Testwort" onClose={vi.fn()}>
          <MemberDetail
            workspaceId="w"
            currentUserId="o"
            member={{
              userId: 'u',
              name: 'Testwort',
              role: 'member',
              joinedAt: new Date('2026-03-04T05:06:07Z'),
              invitedBy: null,
              updatedBy: null,
              updatedAt: null,
              paused: standing,
            }}
            canPause
          />
        </Modal>
      </StatusRegionProvider>
    </QueryClientProvider>,
  );

const section = () => screen.getByRole('region', { name: 'Coven Access' });
const unfold = () =>
  fireEvent.click(within(section()).getByRole('button', { name: 'Coven Access', expanded: false }));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  vi.clearAllMocks();
});

describe('CovenAccessPanel, while access stands open', () => {
  it('lists the earlier pauses with who set and lifted each, sends an open-ended pause with its note, and reads the pauses again', async () => {
    const { sent, reads } = serve([LIFTED]);
    renderPanel(null);
    unfold();

    const ledger = await within(section()).findByRole('list', { name: 'Earlier Pauses' });
    expect(ledger).toHaveTextContent('Set by Owner Testwort · Lifted by Owner Testwort');
    expect(within(section()).queryByText('Paused')).toBeNull();

    fireEvent.change(within(section()).getByRole('combobox', { name: 'For' }), {
      target: { value: 'none' },
    });
    fireEvent.change(within(section()).getByRole('textbox', { name: 'Note' }), {
      target: { value: '  Cooling off  ' },
    });
    fireEvent.click(within(section()).getByRole('button', { name: 'Pause Access' }));
    expect(sent).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([
      {
        name: 'PauseMemberAccess',
        variables: { workspaceId: 'w', userId: 'u', until: null, note: 'Cooling off' },
      },
    ]);
    expect(announced()).toContain('paused');
    await waitFor(() => expect(reads.count).toBe(2));
  });

  it('sends a pause of one day ending a day from now', async () => {
    const { sent } = serve([]);
    renderPanel(null);
    unfold();

    fireEvent.click(within(section()).getByRole('button', { name: 'Pause Access' }));
    const before = Date.now();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    const until = new Date(sent[0].variables.until as string).getTime();
    expect(until - before).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
    expect(until - Date.now()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it('holds Pause Access while Until a Date has no day picked', () => {
    const { sent } = serve([]);
    renderPanel(null);
    unfold();
    const pause = within(section()).getByRole('button', { name: 'Pause Access' });
    // Why it could have been sent: the default span, a day, is ready.
    expect(pause).toBeEnabled();

    const span = within(section()).getByRole('combobox', { name: 'For' });
    fireEvent.change(span, { target: { value: 'date' } });
    expect(pause).toBeDisabled();
    fireEvent.click(pause);
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    expect(sent).toEqual([]);

    fireEvent.change(span, { target: { value: 'none' } });
    expect(pause).toBeEnabled();
  });
});

describe('CovenAccessPanel, when the pauses cannot be read', () => {
  it("keeps the modal on the page's own answer when the read is refused, as when the owner was demoted meanwhile", async () => {
    let refused = 0;
    server.use(
      graphqlLink.query('MemberPauses', () => {
        refused += 1;
        return HttpResponse.json({
          data: null,
          errors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }],
        });
      }),
    );
    renderPanel({ until: null });

    await waitFor(() => expect(refused).toBe(1));
    unfold();
    expect(within(section()).getAllByText('Paused').length).toBeGreaterThan(0);
    expect(within(section()).getByRole('button', { name: 'Lift Pause' })).toBeInTheDocument();
  });
});

describe('CovenAccessPanel, while a pause stands', () => {
  it('shows the pause, with its note once read, and lifts it, offering no second pause', async () => {
    const { sent } = serve([STANDING, LIFTED]);
    renderPanel({ until: new Date(STANDING.until) });
    unfold();

    expect(within(section()).getAllByText('Paused').length).toBeGreaterThan(0);
    expect(within(section()).queryByRole('button', { name: 'Pause Access' })).toBeNull();
    expect(await within(section()).findByText('Cooling off')).toBeInTheDocument();
    // The standing pause is not listed again among the earlier ones.
    const ledger = within(section()).getByRole('list', { name: 'Earlier Pauses' });
    expect(within(ledger).getAllByRole('listitem')).toHaveLength(1);

    fireEvent.click(within(section()).getByRole('button', { name: 'Lift Pause' }));
    expect(sent).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Lift' }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([
      { name: 'LiftMemberAccessPause', variables: { workspaceId: 'w', userId: 'u' } },
    ]);
  });
});
