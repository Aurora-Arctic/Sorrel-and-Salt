import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import SupportRequests from '@/components/SupportRequests';
import { supportHref, supportViewTabs } from '@/components/SupportRequests/href';
import TabbedPage from '@/components/TabbedPage';
import type {
  SupportRequestDetailEntry,
  SupportRequestEntry,
  SupportViewer,
} from '@/components/SupportRequests/types';
import type {
  ReplyToSupportRequestMutation,
  ReplyToSupportRequestMutationVariables,
  SetSupportRequestIssueUrlMutation,
  SetSupportRequestIssueUrlMutationVariables,
  TimeOutSupportSenderMutation,
  TimeOutSupportSenderMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The admin Support page, render-only: the page owns the reads, this owns what a viewer sees of a
// request and sends from it (claude-docs/components/support-requests.md).

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/support',
}));

const ADMIN: SupportViewer = { id: 'admin-1', role: 'admin' };
const CURATOR: SupportViewer = { id: 'curator-1', role: 'curator' };
const ADMIN_ONLY = ['Assigned To', 'GitHub Issue', 'For'];

const ROW: SupportRequestEntry = {
  id: 'r1',
  about: 'bug',
  subject: 'The moon icon is missing',
  status: 'open',
  sender: { id: 'u1', name: 'Ada Wortley', email: 'ada@example.test' },
  signedOut: false,
  assignee: null,
  curatorVisible: false,
  errorCode: 500,
  errorReference: null,
  senderReplied: false,
  betaTester: false,
};

const DETAIL: SupportRequestDetailEntry = {
  ...ROW,
  message: 'There is no moon on the spell page.',
  createdAt: new Date('2026-10-29T09:00:00Z'),
  path: '/coven/[slug]/grimoire',
  issueUrl: null,
  resolvedBy: null,
  resolvedAt: null,
  replies: [],
  timeouts: [],
};

const open = (viewer: SupportViewer, detail: Partial<SupportRequestDetailEntry> = {}) =>
  render(
    <SupportRequests
      requests={[ROW]}
      viewer={viewer}
      opened={{ ...DETAIL, ...detail }}
      assignees={[{ id: 'curator-1', name: 'Curtis' }]}
    />,
  );

const dialog = () => screen.getByRole('dialog', { name: new RegExp(ROW.subject) });

// The Time-Out fold starts closed; its toggle is the one Time-Out button that says whether it is open.
const openTimeOut = () =>
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Time-Out', expanded: false }));

const timeOutSubmit = () => within(dialog()).getByRole('button', { name: 'Time Out Sender' });

// The question the button opens, answered.
const confirmTimeOut = () => fireEvent.click(screen.getByRole('button', { name: 'Time Out' }));
// The question Resolve opens over the dialog, a group named by its text.
const resolveQuestion = () => screen.findByRole('group', { name: /sender sees it as resolved/ });

const BASE = { id: 'u0', name: 'Bea Hollis', email: 'bea@example.test' };

beforeEach(() => {
  router.refresh.mockClear();
});

describe('SupportRequests list', () => {
  it('shows about, subject, status, sender, assignee, curator visibility and error number per row', () => {
    render(<SupportRequests requests={[ROW]} viewer={ADMIN} />);
    const row = screen.getByRole('row', { name: /moon icon/ });
    for (const text of ['Bug', 'Open', 'Ada Wortley', 'Unassigned', 'Not Shared', '500']) {
      expect(within(row).getByText(text)).toBeInTheDocument();
    }
    expect(
      within(row).getByRole('link', { name: `${ROW.subject} from Ada Wortley` }),
    ).toHaveAttribute('href', '/admin/support?request=r1');
  });

  it('says what the filter left out when no request matches', () => {
    render(
      <SupportRequests
        requests={[]}
        viewer={ADMIN}
        filter={{ about: 'bug', view: 'needs_staff', errorCode: '', betaOnly: false }}
      />,
    );
    expect(screen.getByText(/No support requests match/)).toBeInTheDocument();
  });
});

describe('Error reference', () => {
  it('is shown beside the error number with an icon button that copies it', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    open(ADMIN, { errorReference: 'abc123' });
    expect(within(dialog()).getByText('abc123')).toBeInTheDocument();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Copy Error Reference' }));
    expect(writeText).toHaveBeenCalledWith('abc123');
  });

  it('is left out when the request has none', () => {
    open(ADMIN);
    expect(within(dialog()).queryByRole('button', { name: 'Copy Error Reference' })).toBeNull();
  });
});

describe('Reply', () => {
  it('is disabled until there is a body, then sends it and reads the page again', async () => {
    const sent: ReplyToSupportRequestMutationVariables[] = [];
    mockGraphQLMutation<ReplyToSupportRequestMutation, ReplyToSupportRequestMutationVariables>(
      'ReplyToSupportRequest',
      (variables) => {
        sent.push(variables);
        return { replyToSupportRequest: { __typename: 'SupportReply', id: 'x' } };
      },
    );
    open(ADMIN);
    const reply = within(dialog()).getByRole('button', { name: 'Reply' });
    expect(reply).toBeDisabled();

    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Your Reply' }), {
      target: { value: 'Thank you, we are looking.' },
    });
    expect(reply).toBeEnabled();
    fireEvent.click(reply);

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent).toEqual([
      { requestId: 'r1', body: 'Thank you, we are looking.', waitingOnSender: false },
    ]);
  });

  it('marks the reply waiting on the sender when that choice is on', async () => {
    const sent: ReplyToSupportRequestMutationVariables[] = [];
    mockGraphQLMutation<ReplyToSupportRequestMutation, ReplyToSupportRequestMutationVariables>(
      'ReplyToSupportRequest',
      (variables) => {
        sent.push(variables);
        return { replyToSupportRequest: { __typename: 'SupportReply', id: 'x' } };
      },
    );
    open(ADMIN);
    fireEvent.click(within(dialog()).getByRole('switch', { name: /Waiting on Sender/ }));
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Your Reply' }), {
      target: { value: 'Which jar?' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Reply' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.waitingOnSender).toBe(true);
  });
});

describe('A timed-out sender', () => {
  const standing = (until: Date, liftedAt: Date | null = null) => ({
    id: 't1',
    until,
    note: null,
    liftedAt,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    setBy: { id: 'admin-1', name: 'Ash Warden' },
    liftedBy: null,
  });
  const NOTICE = 'The sender cannot answer until 2999-01-01 00:00 UTC.';

  it('is told to staff replying, with the end time, and the reply still sends', async () => {
    const sent: ReplyToSupportRequestMutationVariables[] = [];
    mockGraphQLMutation<ReplyToSupportRequestMutation, ReplyToSupportRequestMutationVariables>(
      'ReplyToSupportRequest',
      (variables) => {
        sent.push(variables);
        return { replyToSupportRequest: { __typename: 'SupportReply', id: 'x' } };
      },
    );
    open(ADMIN, { timeouts: [standing(new Date('2999-01-01T00:00:00Z'))] });
    expect(within(dialog()).getByText(NOTICE)).toBeInTheDocument();

    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Your Reply' }), {
      target: { value: 'Noted.' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Reply' }));
    await waitFor(() => expect(sent).toHaveLength(1));
  });

  it('is not told to staff when no time-out stands: none, lifted or past', () => {
    open(ADMIN);
    expect(within(dialog()).queryByText(/cannot answer until/)).toBeNull();
    cleanup();
    open(ADMIN, {
      timeouts: [
        standing(new Date('2999-01-01T00:00:00Z'), new Date('2026-10-02T00:00:00Z')),
        { ...standing(new Date('2001-01-01T00:00:00Z')), id: 't0' },
      ],
    });
    expect(within(dialog()).queryByText(/cannot answer until/)).toBeNull();
  });

  it('is not told to staff writing an internal note', () => {
    open(ADMIN, { timeouts: [standing(new Date('2999-01-01T00:00:00Z'))] });
    fireEvent.click(within(dialog()).getByRole('radio', { name: /^Internal Note/ }));
    expect(within(dialog()).queryByText(NOTICE)).toBeNull();
  });
});

describe('Time-Out', () => {
  it('is off while Until a Date has no date, and on for a span', () => {
    open(ADMIN);
    openTimeOut();
    expect(timeOutSubmit()).toBeEnabled();

    fireEvent.change(within(dialog()).getByLabelText('For'), { target: { value: 'date' } });
    expect(timeOutSubmit()).toBeDisabled();
  });

  it('sends the sender and an end a day on, after asking', async () => {
    const sent: TimeOutSupportSenderMutationVariables[] = [];
    mockGraphQLMutation<TimeOutSupportSenderMutation, TimeOutSupportSenderMutationVariables>(
      'TimeOutSupportSender',
      (variables) => {
        sent.push(variables);
        return { timeOutSupportSender: { __typename: 'SupportTimeout', id: 't' } };
      },
    );
    open(ADMIN);
    openTimeOut();
    fireEvent.click(timeOutSubmit());
    expect(sent).toHaveLength(0);
    confirmTimeOut();

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent[0]?.userId).toBe('u1');
    const ahead = new Date(sent[0]?.until as string).getTime() - Date.now();
    expect(ahead).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(ahead).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it('shows the standing time-out with Lift in place of the form, and a history link to the earlier ones', () => {
    open(ADMIN, {
      timeouts: [
        {
          id: 't2',
          until: new Date('2999-01-01T00:00:00Z'),
          note: 'Repeated sends',
          liftedAt: null,
          createdAt: new Date('2026-10-01T00:00:00Z'),
          setBy: { id: 'admin-1', name: 'Ash Warden' },
          liftedBy: null,
        },
        {
          id: 't1',
          until: new Date('2001-01-10T00:00:00Z'),
          note: 'First warning',
          liftedAt: null,
          createdAt: new Date('2001-01-03T00:00:00Z'),
          setBy: null,
          liftedBy: null,
        },
      ],
    });
    openTimeOut();
    const panel = within(dialog());
    expect(panel.getByText(/Repeated sends/)).toBeInTheDocument();
    expect(panel.getByText(/Set by Ash Warden/)).toBeInTheDocument();
    expect(panel.getByRole('link', { name: 'Earlier Time-Outs' })).toHaveAttribute(
      'href',
      expect.stringContaining('user=u1'),
    );
    expect(panel.queryByText(/First warning/)).toBeNull();
    expect(panel.getAllByRole('button', { name: 'Lift' })).toHaveLength(1);
    expect(panel.queryByLabelText('For')).toBeNull();
  });
});

describe('Issue', () => {
  it('says a pasted address that is not an issue on the project beside its field', async () => {
    mockGraphQLError('SetSupportRequestIssueUrl', {
      code: 'VALIDATION',
      fieldErrors: [
        {
          path: ['issueUrl'],
          message:
            'Paste a GitHub issue link, like github.com/Aurora-Arctic/Sorrel-and-Salt/issues/1409, or a link opened from the project board.',
        },
      ],
    });
    open(ADMIN);
    const field = within(dialog()).getByRole('textbox', { name: 'GitHub Issue' });
    const save = within(dialog()).getByRole('button', { name: 'Save Address' });
    expect(save).toBeDisabled();

    fireEvent.change(field, { target: { value: 'https://example.test/issues/4' } });
    fireEvent.click(save);

    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(field).toHaveAccessibleDescription(/Paste a GitHub issue link/);
  });

  it('sends a good address once, with the request id', async () => {
    const sent: SetSupportRequestIssueUrlMutationVariables[] = [];
    mockGraphQLMutation<
      SetSupportRequestIssueUrlMutation,
      SetSupportRequestIssueUrlMutationVariables
    >('SetSupportRequestIssueUrl', (variables) => {
      sent.push(variables);
      return { setSupportRequestIssueUrl: { __typename: 'SupportRequest', id: 'r1' } };
    });
    open(ADMIN);
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'GitHub Issue' }), {
      target: { value: 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/12' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Address' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent).toEqual([
      { id: 'r1', issueUrl: 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/12' },
    ]);
  });
});

describe('The sender', () => {
  it('links the name to the user modal over this page for an admin, keeping the open request, in the list and in the request', () => {
    render(<SupportRequests requests={[ROW]} viewer={ADMIN} />);
    const row = screen.getByRole('row', { name: /The moon icon is missing/ });
    expect(within(row).getByRole('link', { name: 'Ada Wortley' })).toHaveAttribute(
      'href',
      '/admin/support?user=u1',
    );
    cleanup();
    open(ADMIN);
    expect(within(dialog()).getByRole('link', { name: 'Ada Wortley' })).toHaveAttribute(
      'href',
      '/admin/support?request=r1&user=u1',
    );
  });

  it('leaves the name as text for a curator, in the list and in the request', () => {
    render(<SupportRequests requests={[{ ...ROW, curatorVisible: true }]} viewer={CURATOR} />);
    const row = screen.getByRole('row', { name: /The moon icon is missing/ });
    expect(within(row).queryByRole('link', { name: 'Ada Wortley' })).toBeNull();
    expect(within(row).getByText('Ada Wortley')).toBeInTheDocument();
    cleanup();
    open(CURATOR, { curatorVisible: true });
    expect(within(dialog()).queryByRole('link', { name: 'Ada Wortley' })).toBeNull();
  });

  it('calls a deleted account that, without a link', () => {
    open(ADMIN, { sender: null });
    expect(within(dialog()).getAllByText('Deleted account').length).toBeGreaterThan(0);
    expect(within(dialog()).queryByRole('link', { name: 'Deleted account' })).toBeNull();
  });
});

describe('A linked issue', () => {
  it('shows the address with an edit control, and opens the field when it is used', () => {
    open(ADMIN, { issueUrl: 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/12' });
    expect(within(dialog()).queryByRole('textbox', { name: 'GitHub Issue' })).toBeNull();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Change Issue Address' }));
    expect(within(dialog()).getByRole('textbox', { name: 'GitHub Issue' })).toHaveValue(
      'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/12',
    );
  });
});

describe('Resolve', () => {
  it('asks first, and sends the write only on the confirm', async () => {
    const sent = vi.fn(() => ({ saved: { __typename: 'Saved', id: 'r1' } }));
    mockGraphQLMutation('ResolveSupportRequest', sent);
    open(ADMIN);
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Resolve' }));
    const question = await resolveQuestion();
    expect(sent).not.toHaveBeenCalled();

    fireEvent.click(within(question).getByRole('button', { name: 'Cancel' }));
    expect(sent).not.toHaveBeenCalled();

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Resolve' }));
    fireEvent.click(within(await resolveQuestion()).getByRole('button', { name: 'Resolve' }));
    await waitFor(() => expect(sent).toHaveBeenCalledTimes(1));
  });
});

describe('What a viewer is shown', () => {
  it('shows a curator the issue link without the control to change it', () => {
    open(CURATOR, {
      curatorVisible: true,
      issueUrl: 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/12',
    });
    expect(within(dialog()).getByRole('link', { name: /12/ })).toHaveAttribute(
      'href',
      'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/12',
    );
    expect(within(dialog()).queryByRole('button', { name: 'Change Issue Address' })).toBeNull();
    expect(within(dialog()).queryByLabelText('GitHub Issue')).toBeNull();
  });

  it('gives a curator the sender’s name alone, and a signed-out sender no name or address', () => {
    open(CURATOR, { sender: { id: 'u1', name: 'Ada Wortley', email: null } });
    expect(within(dialog()).getAllByText(/Ada Wortley/).length).toBeGreaterThan(0);
    expect(within(dialog()).queryByText(/@/)).toBeNull();
  });

  it('calls a signed-out sender by that and shows an admin the address', () => {
    const visitor = { id: 's0', name: 'Support, signed out', email: 'visitor@example.test' };
    open(ADMIN, { sender: visitor, signedOut: true });
    expect(within(dialog()).getAllByText(/Signed-out sender/).length).toBeGreaterThan(0);
    expect(within(dialog()).getByText('visitor@example.test')).toBeInTheDocument();
    expect(within(dialog()).queryByText(/Support, signed out/)).toBeNull();
  });

  it('gives an admin every control', () => {
    open(ADMIN);
    for (const name of ['Assigned To', 'GitHub Issue', 'For', 'Your Reply']) {
      expect(within(dialog()).getByLabelText(name)).toBeInTheDocument();
    }
    expect(
      within(dialog()).getByRole('switch', { name: 'Shared With Curators' }),
    ).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'Resolve' })).toBeInTheDocument();
  });

  it('gives a curator Reply and Resolve on a request assigned to them, and no admin-only control', () => {
    open(CURATOR, { assignee: { id: CURATOR.id, name: 'Curtis' } });
    expect(within(dialog()).getByLabelText('Your Reply')).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'Resolve' })).toBeInTheDocument();
    for (const name of ADMIN_ONLY) {
      expect(within(dialog()).queryByLabelText(name)).not.toBeInTheDocument();
    }
    expect(within(dialog()).queryByRole('switch', { name: 'Shared With Curators' })).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: 'Lift' })).toBeNull();
  });

  it('gives a curator reading a request not theirs a note form alone: no Reply, mode choice, waiting switch or Resolve', () => {
    open(CURATOR, { curatorVisible: true, assignee: null });
    expect(within(dialog()).getByText(DETAIL.message)).toBeInTheDocument();
    expect(within(dialog()).queryByLabelText('Your Reply')).toBeNull();
    expect(within(dialog()).queryByRole('radio')).toBeNull();
    expect(within(dialog()).queryByRole('switch', { name: /Waiting on Sender/ })).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: 'Resolve' })).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: 'Reply' })).toBeNull();
    expect(within(dialog()).getByLabelText('Your Note')).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'Add Note' })).toBeInTheDocument();
    for (const name of ADMIN_ONLY) {
      expect(within(dialog()).queryByLabelText(name)).not.toBeInTheDocument();
    }
  });

  it('gives a curator the note form alone on a request assigned to someone else', () => {
    open(CURATOR, { curatorVisible: true, assignee: { id: 'admin-1', name: 'Ada' } });
    expect(within(dialog()).queryByLabelText('Your Reply')).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: 'Resolve' })).toBeNull();
    expect(within(dialog()).getByLabelText('Your Note')).toBeInTheDocument();
  });

  it('sends a curator’s note through the note mutation', async () => {
    const notes: { requestId: string; body: string }[] = [];
    mockGraphQLMutation(
      'AddSupportInternalNote',
      (variables: { requestId: string; body: string }) => {
        notes.push(variables);
        return { addSupportInternalNote: { __typename: 'SupportReply', id: 'n1' } };
      },
    );
    open(CURATOR, { curatorVisible: true, assignee: null });
    fireEvent.change(within(dialog()).getByLabelText('Your Note'), {
      target: { value: 'Seen it too' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Add Note' }));
    await waitFor(() => expect(notes).toEqual([{ requestId: 'r1', body: 'Seen it too' }]));
  });
});

describe('The list', () => {
  it('tells two requests with one subject apart by their link names', () => {
    render(
      <SupportRequests
        requests={[ROW, { ...ROW, id: 'r2', sender: { ...BASE } }]}
        viewer={ADMIN}
      />,
    );
    const names = screen
      .getAllByRole('link', { name: /missing from/ })
      .map((link) => link.textContent);
    expect(new Set(names).size).toBe(2);
    expect(screen.getByRole('link', { name: /missing from Ada Wortley/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /missing from Bea Hollis/ })).toBeInTheDocument();
  });

  it('heads the curator column Shared With Curators and answers with a word for a reader', () => {
    render(
      <SupportRequests
        requests={[ROW, { ...ROW, id: 'r2', curatorVisible: true }]}
        viewer={ADMIN}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Shared With Curators' })).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
    expect(screen.getByText('Not Shared')).toBeInTheDocument();
  });

  it('gives the number of requests shown in a status line', () => {
    const { rerender } = render(
      <SupportRequests
        requests={[ROW, { ...ROW, id: 'r2' }, { ...ROW, id: 'r3' }]}
        viewer={ADMIN}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('3 Requests');
    rerender(<SupportRequests requests={[ROW]} viewer={ADMIN} />);
    expect(screen.getByRole('status')).toHaveTextContent('1 Request');
    rerender(<SupportRequests requests={[]} viewer={ADMIN} />);
    expect(screen.getByRole('status')).toHaveTextContent('0 Requests');
  });
});

describe('Dates', () => {
  it('are written as the account page writes them, day month year', () => {
    open(ADMIN, {
      status: 'resolved',
      resolvedBy: { id: 'admin-1', name: 'Ada' },
      resolvedAt: new Date('2026-10-27T11:05:00Z'),
      replies: [
        {
          id: 'p1',
          body: 'Seen.',
          author: null,
          createdAt: new Date('2026-10-27T11:05:00Z'),
          internal: false,
          fromSender: false,
        },
      ],
    });
    const d = within(dialog());
    expect(d.getAllByText('27 October 2026, 11:05 am')).toHaveLength(1);
    expect(d.getAllByText(/^27 Oct\b.*11:05 am$/)).toHaveLength(1);
  });
});

describe('Unsaved input in the dialog', () => {
  const close = () => fireEvent.click(within(dialog()).getByRole('button', { name: 'Close' }));

  it.each([
    ['GitHub Issue', 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/9'],
    ['For', 'week'],
    ['Note', 'Warned twice'],
  ])('asks before closing with %s typed, though the reply is untouched', async (label, value) => {
    open(ADMIN);
    fireEvent.change(within(dialog()).getByLabelText(label), { target: { value } });
    close();
    expect(await screen.findByText('You have unsaved changes. Discard them?')).toBeInTheDocument();
  });

  it('says nothing on closing when nothing was typed', () => {
    open(ADMIN);
    close();
    expect(screen.queryByText(/unsaved changes/)).toBeNull();
  });
});

describe('Status line in the dialog', () => {
  const status = () => within(dialog()).getByRole('status');

  it('announces a reply sent', async () => {
    mockGraphQLMutation<ReplyToSupportRequestMutation, ReplyToSupportRequestMutationVariables>(
      'ReplyToSupportRequest',
      () => ({ replyToSupportRequest: { __typename: 'SupportReply', id: 'x' } }),
    );
    open(ADMIN);
    expect(status()).toBeEmptyDOMElement();
    fireEvent.change(within(dialog()).getByLabelText('Your Reply'), { target: { value: 'Hi' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Reply' }));
    await waitFor(() => expect(status()).toHaveTextContent('Reply sent.'));
  });

  it.each([
    ['assign', 'AssignSupportRequest', 'Request assigned.'],
    ['share', 'SetSupportRequestCuratorVisible', 'Request shared with curators.'],
    ['link', 'SetSupportRequestIssueUrl', 'Issue address saved.'],
  ])('announces %s', async (action, operation, message) => {
    mockGraphQLMutation(operation, () => ({ saved: { __typename: 'Saved', id: 'r1' } }));
    open(ADMIN);
    const d = within(dialog());
    if (action === 'assign')
      await userEvent.selectOptions(d.getByLabelText('Assigned To'), 'Curtis');
    if (action === 'share')
      fireEvent.click(d.getByRole('switch', { name: 'Shared With Curators' }));
    if (action === 'link') {
      fireEvent.change(d.getByLabelText('GitHub Issue'), {
        target: { value: 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/9' },
      });
      fireEvent.click(d.getByRole('button', { name: 'Save Address' }));
    }
    await waitFor(() => expect(status()).toHaveTextContent(message));
  });

  it('announces resolve on the page status line, since the confirm sits over the dialog', async () => {
    mockGraphQLMutation('ResolveSupportRequest', () => ({
      saved: { __typename: 'Saved', id: 'r1' },
    }));
    render(
      <StatusRegionProvider>
        <SupportRequests
          requests={[ROW]}
          viewer={ADMIN}
          opened={DETAIL}
          assignees={[{ id: 'curator-1', name: 'Curtis' }]}
        />
      </StatusRegionProvider>,
    );
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Resolve' }));
    fireEvent.click(within(await resolveQuestion()).getByRole('button', { name: 'Resolve' }));
    await waitFor(() =>
      expect(
        screen.getAllByRole('status').some((o) => /Request resolved./.test(o.textContent ?? '')),
      ).toBe(true),
    );
  });
});

describe('The views', () => {
  const COUNTS = { needs_staff: 4, mine: 1, unassigned: 2, waiting: 0, resolved: 7, closed: 3 };
  const FILTER = { about: 'bug', view: 'mine', errorCode: '500', betaOnly: true } as const;

  const views = () =>
    within(screen.getByRole('navigation', { name: 'Support' })).getAllByRole('link');
  const renderTabs = () =>
    render(
      <TabbedPage title="Support" tabs={supportViewTabs(FILTER, COUNTS)} open={supportHref(FILTER)}>
        <p>List</p>
      </TabbedPage>,
    );

  it('are six links in the shared tab row, each with its count, the chosen one the current page', () => {
    renderTabs();
    expect(views().map((link) => link.textContent)).toEqual([
      'Needs Staff (4)',
      'Mine (1)',
      'Unassigned (2)',
      'Waiting on Sender (0)',
      'Resolved (7)',
      'Closed (3)',
    ]);
    expect(views().filter((link) => link.getAttribute('aria-current') === 'page')).toEqual([
      screen.getByRole('link', { name: 'Mine (1)' }),
    ]);
  });

  it('keep the other filters in each view address', () => {
    renderTabs();
    expect(screen.getByRole('link', { name: /Closed/ })).toHaveAttribute(
      'href',
      '/admin/support?about=bug&view=closed&error=500&beta=only',
    );
  });

  it('open through the shared navigation hook on a plain click, so the wait shows', async () => {
    router.push.mockClear();
    const user = userEvent.setup();
    renderTabs();
    await user.click(screen.getByRole('link', { name: /Closed/ }));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenLastCalledWith(
      '/admin/support?about=bug&view=closed&error=500&beta=only',
    );
  });

  it('are given a Beta Testers filter that shows its choice and keeps the view when changed', async () => {
    router.push.mockClear();
    const user = userEvent.setup();
    render(
      <SupportRequests requests={[ROW]} viewer={ADMIN} filter={{ ...FILTER, betaOnly: false }} />,
    );
    const field = screen.getByRole('combobox', { name: 'Beta Testers' });
    expect(field).toHaveTextContent('All');
    await user.click(field);
    await user.click(screen.getByRole('option', { name: 'Only' }));
    expect(router.push).toHaveBeenLastCalledWith(
      '/admin/support?about=bug&view=mine&error=500&beta=only',
    );
  });

  it('show the Beta Testers filter as chosen when the address names it', () => {
    render(<SupportRequests requests={[ROW]} viewer={ADMIN} filter={FILTER} />);
    expect(screen.getByRole('combobox', { name: 'Beta Testers' })).toHaveTextContent('Only');
  });

  it('say in text when the sender wrote last and when the sender is a beta tester', () => {
    render(
      <SupportRequests
        requests={[
          { ...ROW, id: 'a', subject: 'First', senderReplied: true, betaTester: true },
          { ...ROW, id: 'b', subject: 'Second' },
        ]}
        viewer={ADMIN}
      />,
    );
    const first = screen.getByRole('row', { name: /First/ });
    expect(within(first).getByText('Sender Replied')).toBeInTheDocument();
    expect(within(first).getByText('Beta Tester')).toBeInTheDocument();
    const second = screen.getByRole('row', { name: /Second/ });
    expect(within(second).queryByText('Sender Replied')).toBeNull();
    expect(within(second).queryByText('Beta Tester')).toBeNull();
  });
});

describe('The composer', () => {
  const reply = () => within(dialog()).getByLabelText('Your Reply');

  it('opens in reply mode, and a note must be chosen', () => {
    open(ADMIN);
    expect(within(dialog()).getByRole('radio', { name: /^Reply/ })).toBeChecked();
    expect(within(dialog()).getByRole('radio', { name: /^Internal Note/ })).not.toBeChecked();
    expect(reply()).toBeInTheDocument();
  });

  it('sends a note through the note mutation, not the reply one', async () => {
    const notes: { requestId: string; body: string }[] = [];
    mockGraphQLMutation(
      'AddSupportInternalNote',
      (variables: { requestId: string; body: string }) => {
        notes.push(variables);
        return { addSupportInternalNote: { __typename: 'SupportReply', id: 'n1' } };
      },
    );
    open(ADMIN);
    fireEvent.click(within(dialog()).getByRole('radio', { name: /^Internal Note/ }));
    fireEvent.change(within(dialog()).getByLabelText('Your Note'), {
      target: { value: 'Check the log' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Add Note' }));
    await waitFor(() => expect(notes).toEqual([{ requestId: 'r1', body: 'Check the log' }]));
    await waitFor(() =>
      expect(within(dialog()).getByRole('status')).toHaveTextContent('Note added.'),
    );
  });

  it('shows a note on the thread with an Internal tag and a public reply without one', () => {
    open(ADMIN, {
      replies: [
        {
          id: 'p1',
          body: 'Out loud.',
          author: null,
          createdAt: new Date(),
          internal: false,
          fromSender: false,
        },
        {
          id: 'p2',
          body: 'Quietly.',
          author: null,
          createdAt: new Date(),
          internal: true,
          fromSender: false,
        },
      ],
    });
    const entries = within(dialog()).getAllByRole('listitem');
    const note = entries.find((entry) => within(entry).queryByText('Quietly.'));
    const spoken = entries.find((entry) => within(entry).queryByText('Out loud.'));
    expect(within(note as HTMLElement).getByText(/Internal/)).toBeInTheDocument();
    expect(within(spoken as HTMLElement).queryByText(/Internal/)).toBeNull();
  });
});
