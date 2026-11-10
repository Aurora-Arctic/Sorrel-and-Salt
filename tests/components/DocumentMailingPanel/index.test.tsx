import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { router } from '../../support/next-navigation';
import DocumentMailingPanel from '@/components/DocumentMailingPanel';
import type { DocumentMailingPanelProps } from '@/components/DocumentMailingPanel/types';
import { mockGraphQLMutation } from '../../support/msw/graphql';

// The mailing page's panel for emailing every account about every document changed since the last email: a summary box for each
// pending document and one button, its confirmation, each open mailing's progress, Resume for a paused one, and the last sent.
// What the confirm's modal does when asked, busy and refused is ConfirmedAction's (tests/components/ConfirmedAction/index.test.tsx);
// this file proves what the panel shows and sends.

const MAILING_ID = '00000000-0000-4000-8000-0000000000e1';
const PRIVACY_VERSION = '00000000-0000-4000-8000-0000000000a2';
const TERMS_VERSION = '00000000-0000-4000-8000-0000000000b2';

type Overview = DocumentMailingPanelProps['overview'];
type Mailing = Overview['open'][number];

const mailing = (overrides: Partial<Mailing> = {}): Mailing => ({
  id: MAILING_ID,
  documents: [{ key: 'privacy', title: 'Fixture Policy', versionNumber: 2 }],
  state: 'sending',
  reached: 12,
  recipientCount: 30,
  startedAt: new Date('2026-11-02T09:00:00Z'),
  finishedAt: null,
  ...overrides,
});

const PRIVACY = {
  documentId: '00000000-0000-4000-8000-0000000000d1',
  versionId: PRIVACY_VERSION,
  key: 'privacy',
  title: 'Fixture Policy',
  versionNumber: 2,
  inMailing: false,
};
const TERMS = {
  documentId: '00000000-0000-4000-8000-0000000000d2',
  versionId: TERMS_VERSION,
  key: 'terms',
  title: 'Fixture Terms',
  versionNumber: 2,
  inMailing: false,
};

const overview = (overrides: Partial<Overview> = {}): Overview => ({
  pending: [PRIVACY, TERMS],
  accountCount: 1234,
  days: 21,
  canSend: true,
  open: [],
  lastSent: null,
  ...overrides,
});

const wire = (value: Overview) => ({
  ...value,
  open: value.open.map((open) => ({ ...open, startedAt: '2026-11-02T09:00:00Z' })),
});

const emailButton = () => screen.queryByRole('button', { name: 'Email Every Account' });
const asking = () => screen.getByRole('dialog', { name: 'Email Every Account' });
const sendButton = () => within(asking()).getByRole('button', { name: 'Send Emails' });
const summaryOf = (title: string) =>
  screen.getByRole('textbox', { name: `Summary of the ${title}` });
const write = (title: string, value: string) =>
  fireEvent.change(summaryOf(title), { target: { value } });

afterEach(() => {
  router.refresh.mockReset();
});

describe('DocumentMailingPanel, with documents changed since the last email', () => {
  it('offers a summary box for each pending document, and no progress', () => {
    render(<DocumentMailingPanel overview={overview()} />);

    expect(summaryOf('Fixture Policy')).toBeInTheDocument();
    expect(summaryOf('Fixture Terms')).toBeInTheDocument();
    expect(emailButton()).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('keeps Email Every Account disabled until every summary is written', () => {
    render(<DocumentMailingPanel overview={overview()} />);

    expect(emailButton()).toBeDisabled();
    write('Fixture Policy', 'We keep sign-in records for ninety days.');
    expect(emailButton()).toBeDisabled();
    write('Fixture Terms', '   ');
    expect(emailButton()).toBeDisabled();
    write('Fixture Terms', 'We changed how refunds work.');
    expect(emailButton()).toBeEnabled();
  });

  it('asks first, naming each document, how many accounts and how many days', () => {
    render(<DocumentMailingPanel overview={overview()} />);
    write('Fixture Policy', 'Policy changed.');
    write('Fixture Terms', 'Terms changed.');

    fireEvent.click(emailButton()!);

    const text = asking().textContent ?? '';
    expect(text).toContain('Fixture Policy');
    expect(text).toContain('Fixture Terms');
    expect(text).toMatch(/1,?234/);
    expect(text).toMatch(/\b21\b/);
  });

  it('names the open mailing, and how many it has reached, when the new one would replace it', () => {
    render(
      <DocumentMailingPanel
        overview={overview({
          pending: [{ ...PRIVACY, inMailing: true }, TERMS],
          open: [mailing({ reached: 517, recipientCount: 1200 })],
        })}
      />,
    );
    write('Fixture Policy', 'Policy changed.');
    write('Fixture Terms', 'Terms changed.');

    fireEvent.click(emailButton()!);

    expect(asking().textContent).toMatch(/517/);
  });

  it('sends every summary, trimmed, by version, and reads the page again', async () => {
    const sent: unknown[] = [];
    mockGraphQLMutation('EmailDocumentsToEveryAccount', (variables) => {
      sent.push(variables);
      return {
        emailDocumentsToEveryAccount: wire(
          overview({ canSend: false, open: [mailing({ reached: 0 })] }),
        ),
      };
    });
    render(<DocumentMailingPanel overview={overview()} />);
    write('Fixture Policy', '  Policy changed.  ');
    write('Fixture Terms', 'Terms changed.');
    fireEvent.click(emailButton()!);

    fireEvent.click(sendButton());

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent).toEqual([
      {
        summaries: [
          { versionId: PRIVACY_VERSION, summary: 'Policy changed.' },
          { versionId: TERMS_VERSION, summary: 'Terms changed.' },
        ],
      },
    ]);
  });
});

describe('DocumentMailingPanel, with nothing to send', () => {
  it('offers no summary box and no button when no document has changed', () => {
    render(<DocumentMailingPanel overview={overview({ pending: [], canSend: false })} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(emailButton()).not.toBeInTheDocument();
  });

  it.each([['queued'], ['sending'], ['waiting']] as const)(
    'shows a %s mailing’s progress, and offers no second mailing while it covers every pending document',
    (state) => {
      render(
        <DocumentMailingPanel
          overview={overview({
            pending: [{ ...PRIVACY, inMailing: true }],
            canSend: false,
            open: [mailing({ state })],
          })}
        />,
      );

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '12');
      expect(progress).toHaveAttribute('aria-valuemax', '30');
      expect(emailButton()).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Resume Mailing' })).not.toBeInTheDocument();
    },
  );

  it('shows the last sent mailing complete', () => {
    render(
      <DocumentMailingPanel
        overview={overview({
          pending: [],
          canSend: false,
          lastSent: mailing({
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
        resumeDocumentMailing: wire(
          overview({
            pending: [{ ...PRIVACY, inMailing: true }],
            canSend: false,
            open: [mailing()],
          }),
        ),
      };
    });
    render(
      <DocumentMailingPanel
        overview={overview({
          pending: [{ ...PRIVACY, inMailing: true }],
          canSend: false,
          open: [mailing({ state: 'paused' })],
        })}
      />,
    );
    expect(emailButton()).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume Mailing' }));
    const dialog = screen.getByRole('dialog', { name: 'Resume Mailing' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Resume Mailing' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent).toEqual([{ mailingId: MAILING_ID }]);
  });
});
