import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAdminSession } from '../../../../support/request-session';

// The `/keepers/documents` page: the admin guard first, then the mailing overview, handed to the panel. What the guard and the
// service decide is tests/lib/request-session.test.ts's and tests/modules/documents/services/document-mailing.test.ts's.

vi.mock('@/lib/request-session', () => import('../../../../support/request-session'));

const readDocumentMailings = vi.fn();
vi.mock('@/modules/documents', () => ({ readDocumentMailings }));

const { default: MailingPage } = await import('@/app/(shell)/keepers/documents/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  readDocumentMailings.mockReset();
});

describe('/keepers/documents', () => {
  it('is refused to anyone the admin guard refuses, before any read', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(MailingPage()).rejects.toThrow('forbidden');
    expect(readDocumentMailings).not.toHaveBeenCalled();
  });

  it('reads the overview as the keeper, and offers a summary box for each pending document', async () => {
    readDocumentMailings.mockResolvedValue({
      pending: [
        {
          documentId: 'd1',
          versionId: 'v1',
          key: 'privacy',
          title: 'Fixture Policy',
          versionNumber: 2,
          inMailing: false,
        },
      ],
      accountCount: 3,
      days: 1,
      canSend: true,
      open: [],
      lastSent: null,
    });

    render(await MailingPage());

    expect(readDocumentMailings).toHaveBeenCalledWith(ADMIN);
    expect(
      screen.getByRole('textbox', { name: 'Summary of the Fixture Policy' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email Every Account' })).toBeDisabled();
  });
});
