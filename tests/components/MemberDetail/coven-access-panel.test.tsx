import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import MemberDetail from '@/components/MemberDetail';
import Modal from '@/components/Modal';
import { announced } from '../../support/click-feedback';
import { graphqlLink, mockGraphQLQuery } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';
import { router } from '../../support/next-navigation';
import { renderWithQuery } from '../../support/render-with-query';

// claude-docs/components/member-detail.md, "Coven Access"

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
  renderWithQuery(
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
    </StatusRegionProvider>,
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

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([
      {
        name: 'PauseMemberAccess',
        variables: {
          workspaceId: 'w',
          userId: 'u',
          until: null,
          note: 'Cooling off',
          message: null,
        },
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

  it("offers a Message to Member, said to be emailed to them, beside a note said to be seen by the coven's owners only", () => {
    serve([]);
    renderPanel(null);
    unfold();

    const message = within(section()).getByRole('textbox', { name: 'Message to Member' });
    expect(message).not.toBeRequired();
    expect(message).toHaveAccessibleDescription(/email/i);
    expect(within(section()).getByRole('textbox', { name: 'Note' })).toHaveAccessibleDescription(
      /Seen by the coven's stewards only/,
    );
  });

  it('sends the message to the member, trimmed, with the pause', async () => {
    const { sent } = serve([]);
    renderPanel(null);
    unfold();
    fireEvent.change(within(section()).getByRole('textbox', { name: 'Message to Member' }), {
      target: { value: '  A short break while we talk.  ' },
    });
    fireEvent.click(within(section()).getByRole('button', { name: 'Pause Access' }));
    // Precondition: nothing goes before the confirmation.
    expect(sent).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({
      name: 'PauseMemberAccess',
      variables: { workspaceId: 'w', userId: 'u', message: 'A short break while we talk.' },
    });
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
    const ledger = within(section()).getByRole('list', { name: 'Earlier Pauses' });
    expect(within(ledger).getAllByRole('listitem')).toHaveLength(1);

    fireEvent.click(within(section()).getByRole('button', { name: 'Lift Pause' }));
    expect(sent).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Lift' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([
      { name: 'LiftMemberAccessPause', variables: { workspaceId: 'w', userId: 'u' } },
    ]);
  });
});

describe('CovenAccessPanel, while the pauses are read', () => {
  // A test that stops early still lets the held answer go before happy-dom waits on the request, so it holds up no later test.
  let release = () => {};
  afterEach(() => release());

  // The earlier pauses are a round trip away as the modal opens: their place holds a skeleton until they arrive.
  it('draws a skeleton where the earlier pauses go until the read answers, then the pauses in its place', async () => {
    const held = new Promise<void>((resolve) => (release = resolve));
    let requested = false;
    server.use(
      graphqlLink.query('MemberPauses', async () => {
        requested = true;
        await held;
        return HttpResponse.json({
          data: { workspace: { id: 'w', memberPauses: { edges: [{ node: LIFTED }] } } },
        });
      }),
    );
    renderPanel(null);
    unfold();

    // Precondition: the read is out, so the panel is waiting on it.
    await waitFor(() => expect(requested).toBe(true));
    expect(within(section()).queryByRole('status')).not.toBeNull();
    expect(within(section()).queryByRole('list', { name: 'Earlier Pauses' })).toBeNull();

    release();

    expect(
      await within(section()).findByRole('list', { name: 'Earlier Pauses' }),
    ).toBeInTheDocument();
    expect(within(section()).queryByRole('status')).toBeNull();
  });
});
