import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const search = vi.fn<() => string>();
const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() };
vi.mock('next/navigation', () => ({
  usePathname: () => '/coven/fixture-coven',
  useSearchParams: () => new URLSearchParams(search()),
  useRouter: () => router,
}));

const { default: SupportDialog } = await import('@/components/SupportDialog');

beforeEach(() => {
  search.mockReturnValue('');
  router.replace.mockClear();
  router.push.mockClear();
});

describe('SupportDialog', () => {
  it('is shut while the address does not ask for it', () => {
    render(<SupportDialog verified />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens with what the address names', () => {
    search.mockReturnValue('support=question');
    render(<SupportDialog verified />);
    const dialog = screen.getByRole('dialog', { name: 'Contact Support' });
    expect(within(dialog).getByRole('radio', { name: /^Question/ })).toBeChecked();
  });

  it('opens with the focus inside the form, not on Close or the Page field', async () => {
    search.mockReturnValue('support=');
    render(<SupportDialog verified />);
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    expect(document.activeElement).toBe(within(dialog).getAllByRole('radio')[0]);
  });

  it('shows the error number and the page for a report from an error page', () => {
    search.mockReturnValue('support=bug&error=404');
    render(<SupportDialog verified />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('radio', { name: /^Bug/ })).toBeChecked();
    expect(within(dialog).getByText(/Error 404/)).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Page' })).toHaveValue(
      '/coven/fixture-coven',
    );
  });

  it('reports the page named by from over the address it sits on', () => {
    search.mockReturnValue('support=bug&error=500&from=%2Fcoven%2Fx%2Fbroken');
    render(<SupportDialog verified />);
    expect(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Page' })).toHaveValue(
      '/coven/x/broken',
    );
  });

  it('sends an unverified account to confirm its address instead of showing the form', () => {
    search.mockReturnValue('support=bug');
    render(<SupportDialog verified={false} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('textbox')).toBeNull();
    expect(within(dialog).getByRole('link', { name: /Email/ })).toHaveAttribute(
      'href',
      '/account/email',
    );
  });

  it('closes without leaving the page when Cancel is pressed', () => {
    search.mockReturnValue('support=bug&page=2');
    render(<SupportDialog verified />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(router.replace).toHaveBeenCalledWith('/coven/fixture-coven?page=2');
  });
});
