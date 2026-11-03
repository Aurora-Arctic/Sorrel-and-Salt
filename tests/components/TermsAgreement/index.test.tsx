import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TermsAgreement from '@/components/TermsAgreement';
import type { TermsAgreementProps } from '@/components/TermsAgreement/types';
import { makeQueryClient } from '@/lib/graphql-client';
import { HttpResponse } from 'msw/http';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

// The acceptance page's body: it links the terms, and its one button records agreement to the version it showed, then goes to where
// the account was headed. The server refuses a version no longer in force (tests/modules/identity/services/terms.test.ts).

// Terms 3, disclaimer 1, code of ethics 2.
const IN_FORCE = { terms: 3, disclaimer: 1, ethics: 2 };

const AGREED = {
  id: 'u1',
  agreedTermsVersion: 3,
  agreedDisclaimerVersion: 1,
  agreedEthicsVersion: 2,
};

const assign = vi.fn();

beforeEach(() => {
  assign.mockClear();
  vi.spyOn(window.location, 'assign').mockImplementation(assign);
});

function renderAgreement(changed: TermsAgreementProps['changed'] = ['terms']) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <TermsAgreement
        version={IN_FORCE}
        changed={changed}
        updatedOn="2026-11-02"
        destination="/coven/hearth"
      />
    </QueryClientProvider>,
  );
}

/** Where each link in the list of changed documents goes, in order. */
const changedHrefs = () =>
  within(screen.getByRole('list'))
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));

describe('TermsAgreement', () => {
  it('links the terms and names the version', () => {
    renderAgreement();

    expect(screen.getByRole('link', { name: 'Read the Terms of Use' })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(screen.getByText(/Version 3\.1\.2\b/)).toBeInTheDocument();
  });

  it('links each document that changed since the account last agreed, and no other', () => {
    renderAgreement(['disclaimer', 'code-of-ethics']);

    expect(changedHrefs()).toEqual(['/disclaimer', '/code-of-ethics']);
  });

  it('links all three documents for an account agreeing for the first time', () => {
    renderAgreement(['terms', 'disclaimer', 'code-of-ethics']);

    expect(changedHrefs()).toEqual(['/terms', '/disclaimer', '/code-of-ethics']);
  });

  it('records agreement to the version it showed, then goes to the destination', async () => {
    const sent = vi.fn();
    mockGraphQLMutation('AgreeToTerms', (variables) => {
      sent(variables);
      return { agreeToTerms: AGREED };
    });
    renderAgreement();

    await userEvent.click(screen.getByRole('button', { name: 'Agree & Continue' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/coven/hearth'));
    expect(sent).toHaveBeenCalledWith({ version: IN_FORCE });
  });

  // Regression: Agree showed no loading state while it saved, and took a second press once saved.
  describe('while the agreement is being recorded', () => {
    // A test that stops early still lets its held answer go, so it holds up no later test.
    const releases: (() => void)[] = [];
    afterEach(() => releases.splice(0).forEach((release) => release()));

    /** Answers AgreeToTerms once released, counting every ask. */
    function holdAgreement() {
      const calls: unknown[] = [];
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        graphqlLink.mutation('AgreeToTerms', async ({ variables }) => {
          calls.push(variables);
          await held;
          return HttpResponse.json({
            data: { agreeToTerms: AGREED },
          });
        }),
      );
      releases.push(release);
      return { calls, release };
    }

    // The page's one button, by role alone: its name changes while it works.
    const agree = () => screen.getByRole('button');

    it('marks Agree busy and shut while the request is out, and a second press sends nothing', async () => {
      const { calls, release } = holdAgreement();
      renderAgreement();
      expect(agree()).toHaveAccessibleName('Agree & Continue');
      expect(agree()).not.toHaveAttribute('aria-busy');

      await userEvent.click(agree());
      await waitFor(() => expect(calls).toHaveLength(1));

      expect(agree()).toHaveAttribute('aria-busy', 'true');
      expect(agree()).toBeDisabled();
      fireEvent.click(agree());
      release();
      await waitFor(() => expect(assign).toHaveBeenCalledWith('/coven/hearth'));
      expect(calls).toHaveLength(1);
    });

    it('stays busy and shut once recorded, while the next page loads, so a press then sends nothing', async () => {
      const { calls, release } = holdAgreement();
      renderAgreement();

      await userEvent.click(agree());
      release();
      await waitFor(() => expect(assign).toHaveBeenCalledWith('/coven/hearth'));

      expect(agree()).toHaveAttribute('aria-busy', 'true');
      expect(agree()).toBeDisabled();
      fireEvent.click(agree());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(calls).toHaveLength(1);
      expect(assign).toHaveBeenCalledOnce();
    });
  });

  it('stays, with the failure shown, when the record is refused', async () => {
    mockGraphQLError('AgreeToTerms', { code: 'FORBIDDEN', message: 'Not allowed' });
    renderAgreement();

    await userEvent.click(screen.getByRole('button', { name: 'Agree & Continue' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});
