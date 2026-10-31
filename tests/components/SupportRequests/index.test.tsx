import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SupportRequests from '@/components/SupportRequests';
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
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const ADMIN: SupportViewer = { id: 'admin-1', role: 'admin' };
const CURATOR: SupportViewer = { id: 'curator-1', role: 'curator' };
const ADMIN_ONLY = ['Assigned To', 'Issue Address', 'Time-Out Until'];

const ROW: SupportRequestEntry = {
  id: 'r1',
  about: 'bug',
  subject: 'The moon icon is missing',
  status: 'open',
  sender: { id: 'u1', name: 'Ada Wortley', email: 'ada@example.test' },
  assignee: null,
  curatorVisible: false,
  errorCode: 500,
};

const DETAIL: SupportRequestDetailEntry = {
  ...ROW,
  message: 'There is no moon on the spell page.',
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

const dialog = () => screen.getByRole('dialog', { name: ROW.subject });
const BASE = { id: 'u0', name: 'Bea Hollis', email: 'bea@example.test' };
const FAR = '2999-01-01T00:00';

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
        filter={{ about: 'bug', status: '', errorCode: '' }}
      />,
    );
    expect(screen.getByText(/No support requests match/)).toBeInTheDocument();
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
    expect(sent).toEqual([{ requestId: 'r1', body: 'Thank you, we are looking.' }]);
  });
});

describe('Time-Out', () => {
  it('is disabled until a future end is given', () => {
    open(ADMIN);
    const timeOut = within(dialog()).getByRole('button', { name: 'Time-Out' });
    const until = within(dialog()).getByLabelText('Time-Out Until');
    expect(timeOut).toBeDisabled();

    fireEvent.change(until, { target: { value: '2001-01-01T00:00' } });
    expect(timeOut).toBeDisabled();

    fireEvent.change(until, { target: { value: '2999-01-01T00:00' } });
    expect(timeOut).toBeEnabled();
  });

  it('sends the sender and the end', async () => {
    const sent: TimeOutSupportSenderMutationVariables[] = [];
    mockGraphQLMutation<TimeOutSupportSenderMutation, TimeOutSupportSenderMutationVariables>(
      'TimeOutSupportSender',
      (variables) => {
        sent.push(variables);
        return { timeOutSupportSender: { __typename: 'SupportTimeout', id: 't' } };
      },
    );
    open(ADMIN);
    fireEvent.change(within(dialog()).getByLabelText('Time-Out Until'), {
      target: { value: '2999-01-01T00:00' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Time-Out' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent[0]?.userId).toBe('u1');
    expect(new Date(sent[0]?.until as string).getFullYear()).toBe(2999);
  });

  it('lists past time-outs beside the sender, and offers Lift on an active one only', () => {
    open(ADMIN, {
      timeouts: [
        {
          id: 't2',
          until: new Date('2999-01-01T00:00:00Z'),
          note: 'Repeated sends',
          liftedAt: null,
        },
        {
          id: 't1',
          until: new Date('2001-01-01T00:00:00Z'),
          note: 'First warning',
          liftedAt: null,
        },
      ],
    });
    const panel = within(dialog()).getByRole('region', { name: 'Time-Outs' });
    expect(within(panel).getByText(/Ada Wortley/)).toBeInTheDocument();
    expect(within(panel).getByText(/First warning/)).toBeInTheDocument();
    expect(within(panel).getByText(/Repeated sends/)).toBeInTheDocument();
    expect(within(panel).getAllByRole('button', { name: 'Lift' })).toHaveLength(1);
  });
});

describe('Issue', () => {
  it('links Create Issue with the request written in, and not the sender', () => {
    open(ADMIN);
    const link = within(dialog()).getByRole('link', { name: 'Create Issue' });
    const url = new URL(link.getAttribute('href') ?? '');
    expect(url.searchParams.get('title')).toBe(ROW.subject);
    const body = url.searchParams.get('body') ?? '';
    expect(body).toContain(DETAIL.message);
    expect(body).toContain('/coven/[slug]/grimoire');
    expect(body).toContain('r1');
    expect(link.getAttribute('href')).not.toMatch(/Ada|ada%40|ada@/);
  });

  it('says a pasted address that is not an issue on the project beside its field', async () => {
    mockGraphQLError('SetSupportRequestIssueUrl', {
      code: 'VALIDATION',
      fieldErrors: [
        {
          path: ['issueUrl'],
          message: 'Give the address of an issue on Aurora-Arctic/Sorrel-and-Salt',
        },
      ],
    });
    open(ADMIN);
    const field = within(dialog()).getByRole('textbox', { name: 'Issue Address' });
    const save = within(dialog()).getByRole('button', { name: 'Save Address' });
    expect(save).toBeDisabled();

    fireEvent.change(field, { target: { value: 'https://example.test/issues/4' } });
    fireEvent.click(save);

    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(field).toHaveAccessibleDescription(/issue on Aurora-Arctic\/Sorrel-and-Salt/);
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
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Issue Address' }), {
      target: { value: 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/12' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Address' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent).toEqual([
      { id: 'r1', issueUrl: 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/12' },
    ]);
  });
});

describe('What a viewer is shown', () => {
  it('gives an admin every control', () => {
    open(ADMIN);
    for (const name of ['Assigned To', 'Issue Address', 'Time-Out Until', 'Your Reply']) {
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
    expect(within(dialog()).queryByRole('link', { name: 'Create Issue' })).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: 'Lift' })).toBeNull();
  });

  it('gives a curator reading a request only shared with them no control at all', () => {
    open(CURATOR, { curatorVisible: true, assignee: null });
    expect(within(dialog()).getByText(DETAIL.message)).toBeInTheDocument();
    expect(within(dialog()).queryByLabelText('Your Reply')).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: 'Resolve' })).toBeNull();
    for (const name of ADMIN_ONLY) {
      expect(within(dialog()).queryByLabelText(name)).not.toBeInTheDocument();
    }
  });

  it('gives a curator no reply on a request assigned to someone else', () => {
    open(CURATOR, { assignee: { id: 'admin-1', name: 'Ada' } });
    expect(within(dialog()).queryByLabelText('Your Reply')).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: 'Resolve' })).toBeNull();
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
    const names = screen.getAllByRole('link').map((link) => link.textContent);
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
        { id: 'p1', body: 'Seen.', author: null, createdAt: new Date('2026-10-27T11:05:00Z') },
      ],
    });
    expect(within(dialog()).getAllByText('27 October 2026, 11:05 am')).toHaveLength(2);
  });
});

describe('Unsaved input in the dialog', () => {
  const close = () => fireEvent.click(within(dialog()).getByRole('button', { name: 'Close' }));

  it.each([
    ['Issue Address', 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/9'],
    ['Time-Out Until', FAR],
    ['Time-Out Note', 'Warned twice'],
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
    ['resolve', 'ResolveSupportRequest', 'Request resolved.'],
    ['link', 'SetSupportRequestIssueUrl', 'Issue address saved.'],
    ['time-out', 'TimeOutSupportSender', 'Sender timed out.'],
  ])('announces %s', async (action, operation, message) => {
    mockGraphQLMutation(operation, () => ({ saved: { __typename: 'Saved', id: 'r1' } }));
    open(ADMIN);
    const d = within(dialog());
    if (action === 'assign')
      await userEvent.selectOptions(d.getByLabelText('Assigned To'), 'Curtis');
    if (action === 'share')
      fireEvent.click(d.getByRole('switch', { name: 'Shared With Curators' }));
    if (action === 'resolve') fireEvent.click(d.getByRole('button', { name: 'Resolve' }));
    if (action === 'link') {
      fireEvent.change(d.getByLabelText('Issue Address'), {
        target: { value: 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/9' },
      });
      fireEvent.click(d.getByRole('button', { name: 'Save Address' }));
    }
    if (action === 'time-out') {
      fireEvent.change(d.getByLabelText('Time-Out Until'), { target: { value: FAR } });
      fireEvent.click(d.getByRole('button', { name: 'Time-Out' }));
    }
    await waitFor(() => expect(status()).toHaveTextContent(message));
  });
});
