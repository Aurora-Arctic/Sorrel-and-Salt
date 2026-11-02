import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TermsAgreement from '@/components/TermsAgreement';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The acceptance page's body: it links the terms, and its one button records agreement, then goes to where the account was headed.

const assign = vi.fn();

beforeEach(() => {
  assign.mockClear();
  vi.spyOn(window.location, 'assign').mockImplementation(assign);
});

function renderAgreement() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <TermsAgreement version="2026-11-02" updatedOn="2026-11-02" destination="/coven/hearth" />
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
    expect(screen.getByText(/2026-11-02/)).toBeInTheDocument();
  });

  it('goes to the destination once agreement is recorded', async () => {
    mockGraphQLMutation('AgreeToTerms', () => ({
      agreeToTerms: { id: 'u1', termsVersion: '2026-11-02' },
    }));
    renderAgreement();

    await userEvent.click(screen.getByRole('button', { name: 'Agree & Continue' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/coven/hearth'));
  });

  it('stays, with the failure shown, when the record is refused', async () => {
    mockGraphQLError('AgreeToTerms', { code: 'FORBIDDEN', message: 'Not allowed' });
    renderAgreement();

    await userEvent.click(screen.getByRole('button', { name: 'Agree & Continue' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});
