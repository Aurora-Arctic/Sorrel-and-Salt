import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import type { SupportDialogStateQuery } from '@/gql/graphql';
import { graphqlLink, mockGraphQLQuery } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

const search = vi.fn<() => string>();
const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() };
vi.mock('next/navigation', () => ({
  // The router answers the framework's own route on a 404; the dialog must read the address bar instead.
  usePathname: () => '/_not-found',
  useSearchParams: () => new URLSearchParams(search()),
  useRouter: () => router,
}));

const { default: SupportDialog } = await import('@/components/SupportDialog');

type Answer = SupportDialogStateQuery['supportDialogState'];

function answer(state: Answer): void {
  mockGraphQLQuery<SupportDialogStateQuery>('SupportDialogState', () => ({
    supportDialogState: state,
  }));
}

function open() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SupportDialog />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState(null, '', '/coven/fixture-coven');
  search.mockReturnValue('');
  router.replace.mockClear();
  router.push.mockClear();
  answer({ kind: 'form', until: null });
});

describe('SupportDialog', () => {
  it('is shut, and asks nothing, while the address does not ask for it', () => {
    const asked = vi.fn();
    server.use(
      graphqlLink.query('SupportDialogState', () => {
        asked();
        return HttpResponse.json({ data: {} });
      }),
    );
    open();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(asked).not.toHaveBeenCalled();
  });

  it('shows no form until the state has arrived', async () => {
    search.mockReturnValue('support=bug');
    open();
    const dialog = screen.getByRole('dialog', { name: 'Contact Support' });
    expect(within(dialog).queryByRole('radio')).toBeNull();
    expect(await within(dialog).findByRole('radio', { name: /^Bug/ })).toBeChecked();
  });

  it('opens with what the address names', async () => {
    search.mockReturnValue('support=question');
    open();
    const dialog = screen.getByRole('dialog', { name: 'Contact Support' });
    expect(await within(dialog).findByRole('radio', { name: /^Question/ })).toBeChecked();
  });

  it('opens with the focus inside the form, not on Close or the Page field', async () => {
    search.mockReturnValue('support=');
    open();
    const dialog = screen.getByRole('dialog');
    const first = (await within(dialog).findAllByRole('radio'))[0];
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    expect(first).toBeDefined();
  });

  it('shows the error number and the page for a report from an error page', async () => {
    search.mockReturnValue('support=bug&error=404');
    open();
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByRole('radio', { name: /^Bug/ })).toBeChecked();
    expect(within(dialog).getByRole('textbox', { name: 'Page' })).toHaveAccessibleDescription(
      /Opened from the Error 404 page/,
    );
    expect(within(dialog).getByRole('textbox', { name: 'Page' })).toHaveValue(
      '/coven/fixture-coven',
    );
  });

  it('reports the page named by from over the address it sits on', async () => {
    search.mockReturnValue('support=bug&error=500&from=%2Fcoven%2Fx%2Fbroken');
    open();
    expect(await screen.findByRole('textbox', { name: 'Page' })).toHaveValue('/coven/x/broken');
  });

  it('sends an unverified account to confirm its address instead of showing the form', async () => {
    answer({ kind: 'unverified', until: null });
    search.mockReturnValue('support=bug');
    open();
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByRole('link', { name: /Email/ })).toHaveAttribute(
      'href',
      '/account/email',
    );
    expect(within(dialog).queryByRole('textbox')).toBeNull();
  });

  it('shows a timed-out sender no form', async () => {
    answer({
      kind: 'timedOut',
      until: '2099-01-01T00:00:00.000Z',
    });
    search.mockReturnValue('support=bug');
    open();
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(within(dialog).queryByRole('radio')).toBeNull());
    expect(await within(dialog).findByText(/2099/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox', { name: 'Message' })).toBeNull();
  });

  it('closes without leaving the page when Cancel is pressed', async () => {
    search.mockReturnValue('support=bug&page=2');
    open();
    await screen.findByRole('radio', { name: /^Bug/ });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(router.replace).toHaveBeenCalledWith('/coven/fixture-coven?page=2');
  });
});
