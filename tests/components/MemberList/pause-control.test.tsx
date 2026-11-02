import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw/http';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { makeQueryClient } from '@/lib/graphql-client';
import { announced } from '../../support/click-feedback';
import { graphqlLink, mockGraphQLQuery } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

// The members page's Pause Access and Lift Pause: the write each sends, the earlier pauses each dialog lists, and the
// page read again afterwards, which is what redraws the row in the state the action leaves.

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const { default: PauseControl } = await import('@/components/MemberList/pause-control');

const owner = { id: 'o', name: 'Owner Testwort' };
const HISTORY = [
  {
    id: 'p1',
    until: null,
    note: 'Too many edits',
    liftedAt: '2026-10-02T09:00:00.000Z',
    audit: { createdAt: '2026-10-01T09:00:00.000Z' },
    setBy: owner,
    liftedBy: owner,
  },
];

/** Answers the history query with `HISTORY`, and records each mutation's name and variables. */
function serve() {
  mockGraphQLQuery('MemberPauses', () => ({
    workspace: { id: 'w', memberPauses: { edges: HISTORY.map((node) => ({ node })) } },
  }));
  const sent: { name: string; variables: Record<string, unknown> }[] = [];
  for (const name of ['PauseMemberAccess', 'LiftMemberAccessPause']) {
    server.use(
      graphqlLink.mutation(name, ({ variables }) => {
        sent.push({ name, variables });
        return HttpResponse.json({ data: { [name]: { id: 'p2' } } });
      }),
    );
  }
  return sent;
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={makeQueryClient()}>
    <StatusRegionProvider>{children}</StatusRegionProvider>
  </QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PauseControl, while access stands open', () => {
  const renderOpen = () =>
    render(<PauseControl workspaceId="w" userId="u" name="Testwort" standing={null} />, {
      wrapper,
    });

  it('lists the earlier pauses with who set and lifted each, and sends an open-ended pause with its note', async () => {
    const sent = serve();
    renderOpen();
    expect(screen.queryByText('Paused')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Pause Access for Testwort' }));
    const dialog = screen.getByRole('dialog', { name: 'Pause Access for Testwort?' });
    const ledger = await within(dialog).findByRole('list', { name: 'Earlier Pauses' });
    expect(ledger).toHaveTextContent('Set by Owner Testwort · Lifted by Owner Testwort');

    fireEvent.change(within(dialog).getByRole('combobox', { name: 'For' }), {
      target: { value: 'none' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Note' }), {
      target: { value: 'Cooling off' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pause' }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([
      {
        name: 'PauseMemberAccess',
        variables: { workspaceId: 'w', userId: 'u', until: null, note: 'Cooling off' },
      },
    ]);
    expect(announced()).toContain('paused');
  });

  it('sends a pause of one day ending a day from now', async () => {
    const sent = serve();
    renderOpen();

    fireEvent.click(screen.getByRole('button', { name: 'Pause Access for Testwort' }));
    const before = Date.now();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    const until = new Date(sent[0].variables.until as string).getTime();
    expect(until - before).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
    expect(until - Date.now()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it('holds the Pause confirm, with the dialog open, while Until a Date has no day picked', () => {
    const sent = serve();
    renderOpen();

    fireEvent.click(screen.getByRole('button', { name: 'Pause Access for Testwort' }));
    const dialog = screen.getByRole('dialog', { name: 'Pause Access for Testwort?' });
    const confirm = within(dialog).getByRole('button', { name: 'Pause' });
    // Why it could have been sent: the default span, a day, is ready.
    expect(confirm).toBeEnabled();

    const span = within(dialog).getByRole('combobox', { name: 'For' });
    fireEvent.change(span, { target: { value: 'date' } });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(screen.getByRole('dialog', { name: 'Pause Access for Testwort?' })).toBeInTheDocument();
    expect(sent).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();

    fireEvent.change(span, { target: { value: 'none' } });
    expect(confirm).toBeEnabled();
  });
});

describe('PauseControl, while a pause stands', () => {
  it('shows the pause and lifts it, offering no second pause', async () => {
    const sent = serve();
    render(
      <PauseControl
        workspaceId="w"
        userId="u"
        name="Testwort"
        standing={{ until: new Date('2099-01-01T00:00:00Z') }}
      />,
      { wrapper },
    );
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause Access for Testwort' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Lift Pause for Testwort' }));
    const dialog = screen.getByRole('dialog', { name: 'Lift the Pause for Testwort?' });
    expect(await within(dialog).findByRole('list', { name: 'Earlier Pauses' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lift' }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([
      { name: 'LiftMemberAccessPause', variables: { workspaceId: 'w', userId: 'u' } },
    ]);
  });
});
