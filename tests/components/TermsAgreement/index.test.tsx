import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TermsAgreement from '@/components/TermsAgreement';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The acceptance page's body: it links the terms, and its one button records agreement to the version it showed, then goes to where
// the account was headed. The server refuses a version no longer in force (tests/modules/identity/services/terms.test.ts).

const assign = vi.fn();

beforeEach(() => {
  assign.mockClear();
  vi.spyOn(window.location, 'assign').mockImplementation(assign);
});

function renderAgreement() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <TermsAgreement version={3} updatedOn="2026-11-02" destination="/coven/hearth" />
    </QueryClientProvider>,
  );
}

describe('TermsAgreement', () => {
  it('links the terms and names the version', () => {
    renderAgreement();

    expect(screen.getByRole('link', { name: 'Read the Terms of Use' })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(screen.getByText(/Version 3\b/)).toBeInTheDocument();
  });

  it('records agreement to the version it showed, then goes to the destination', async () => {
    const sent = vi.fn();
    mockGraphQLMutation('AgreeToTerms', (variables) => {
      sent(variables);
      return { agreeToTerms: { id: 'u1', agreedTermsVersion: 3 } };
    });
    renderAgreement();

    await userEvent.click(screen.getByRole('button', { name: 'Agree & Continue' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/coven/hearth'));
    expect(sent).toHaveBeenCalledWith({ version: 3 });
  });

  it('stays, with the failure shown, when the record is refused', async () => {
    mockGraphQLError('AgreeToTerms', { code: 'FORBIDDEN', message: 'Not allowed' });
    renderAgreement();

    await userEvent.click(screen.getByRole('button', { name: 'Agree & Continue' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});
