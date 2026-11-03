import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DocumentMailingPanel from '@/components/DocumentMailingPanel';
import type { DocumentMailingPanelProps } from '@/components/DocumentMailingPanel/types';
import { mockGraphQLMutation } from '../../support/msw/graphql';

const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The edit page's panel for emailing every account about the published version: the button and its confirmation while the version
// has not been emailed, the mailing's progress once it has, and Resume for a paused one. What the confirm's modal does when asked,
// busy and refused is ConfirmedAction's (tests/components/UserList/confirmed-action.test.tsx); this file proves what the panel
// shows and sends.

const DOCUMENT_ID = '00000000-0000-4000-8000-0000000000d1';
const MAILING_ID = '00000000-0000-4000-8000-0000000000e1';

type Mailing = NonNullable<DocumentMailingPanelProps['overview']['current']>;

const mailing = (overrides: Partial<Mailing> = {}): Mailing => ({
  id: MAILING_ID,
  versionNumber: 2,
  state: 'sending',
  reached: 12,
  recipientCount: 30,
  startedAt: new Date('2026-11-02T09:00:00Z'),
  finishedAt: null,
  ...overrides,
});

const props = (
  overview: Partial<DocumentMailingPanelProps['overview']> = {},
): DocumentMailingPanelProps => ({
  documentId: DOCUMENT_ID,
  documentKey: 'privacy',
  title: 'Fixture Policy',
  overview: {
    versionNumber: 2,
    accountCount: 1234,
    days: 21,
    current: null,
    inProgress: null,
    ...overview,
  },
});

const emailButton = () => screen.queryByRole('button', { name: 'Email Every Account' });
const asking = () => screen.getByRole('dialog', { name: 'Email Every Account' });
const sendButton = () => within(asking()).getByRole('button', { name: 'Send Emails' });

afterEach(() => {
  router.refresh.mockReset();
});

describe('DocumentMailingPanel, before the published version is emailed', () => {
  it('offers Email Every Account, and no progress', () => {
    render(<DocumentMailingPanel {...props()} />);

    expect(emailButton()).toBeEnabled();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('asks first, naming the document, the version, how many accounts and how many days', () => {
    render(<DocumentMailingPanel {...props()} />);

    fireEvent.click(emailButton()!);

    const text = asking().textContent ?? '';
    expect(text).toContain('Fixture Policy');
    expect(text).toMatch(/\b2\b/);
    expect(text).toMatch(/1,?234/);
    expect(text).toMatch(/\b21\b/);
  });

  it('names the mailing in progress, and how many it has reached, when the new one would replace it', () => {
    render(
      <DocumentMailingPanel
        {...props({
          inProgress: mailing({ versionNumber: 1, reached: 517, recipientCount: 1200 }),
        })}
      />,
    );

    fireEvent.click(emailButton()!);

    expect(asking().textContent).toMatch(/517/);
  });

  it('keeps Send Emails disabled until a summary is written', () => {
    render(<DocumentMailingPanel {...props()} />);
    fireEvent.click(emailButton()!);

    expect(sendButton()).toBeDisabled();
    fireEvent.change(within(asking()).getByRole('textbox', { name: 'Summary' }), {
      target: { value: '   ' },
    });
    expect(sendButton()).toBeDisabled();
    fireEvent.change(within(asking()).getByRole('textbox', { name: 'Summary' }), {
      target: { value: 'We keep sign-in records for ninety days.' },
    });
    expect(sendButton()).toBeEnabled();
  });

  it('sends the document and the summary, trimmed, and reads the page again', async () => {
    const sent: unknown[] = [];
    mockGraphQLMutation('EmailDocumentToEveryAccount', (variables) => {
      sent.push(variables);
      return {
        emailDocumentToEveryAccount: {
          versionNumber: 2,
          accountCount: 1234,
          days: 21,
          current: { ...mailing({ reached: 0 }), startedAt: '2026-11-02T09:00:00Z' },
          inProgress: null,
        },
      };
    });
    render(<DocumentMailingPanel {...props()} />);
    fireEvent.click(emailButton()!);
    fireEvent.change(within(asking()).getByRole('textbox', { name: 'Summary' }), {
      target: { value: '  We keep sign-in records for ninety days.  ' },
    });

    fireEvent.click(sendButton());

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent).toEqual([
      { documentId: DOCUMENT_ID, summary: 'We keep sign-in records for ninety days.' },
    ]);
  });
});

describe('DocumentMailingPanel, once the published version is emailed', () => {
  it.each([['queued'], ['sending'], ['waiting']] as const)(
    'shows a %s mailing’s progress, and offers no second mailing',
    (state) => {
      render(<DocumentMailingPanel {...props({ current: mailing({ state }) })} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '12');
      expect(progress).toHaveAttribute('aria-valuemax', '30');
      expect(emailButton()).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Resume Mailing' })).not.toBeInTheDocument();
    },
  );

  it('shows a sent mailing complete, and offers no second mailing', () => {
    render(
      <DocumentMailingPanel
        {...props({
          current: mailing({
            state: 'sent',
            reached: 30,
            finishedAt: new Date('2026-11-03T10:00:00Z'),
          }),
        })}
      />,
    );

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '30');
    expect(progress).toHaveAttribute('aria-valuemax', '30');
    expect(emailButton()).not.toBeInTheDocument();
  });

  it('offers Resume Mailing for a paused mailing, which resumes it by id and reads the page again', async () => {
    const sent: unknown[] = [];
    mockGraphQLMutation('ResumeDocumentMailing', (variables) => {
      sent.push(variables);
      return {
        resumeDocumentMailing: {
          versionNumber: 2,
          accountCount: 1234,
          days: 21,
          current: { ...mailing(), startedAt: '2026-11-02T09:00:00Z' },
          inProgress: null,
        },
      };
    });
    render(<DocumentMailingPanel {...props({ current: mailing({ state: 'paused' }) })} />);
    expect(emailButton()).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume Mailing' }));
    const dialog = screen.getByRole('dialog', { name: 'Resume Mailing' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Resume Mailing' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent).toEqual([{ mailingId: MAILING_ID }]);
  });
});
