import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModalHeading, RouteModalOpener } from '@/components/Modal/types';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const { RouteModal, RouteModalProvider } = await import('@/components/Modal');
const { RouteModalContext } = await import('@/components/Modal/route-modal-provider');
const { EditLink } = await import('@/components/IconTip');

// A page's one modal place (M9.18): the form its address opens, or, while a
// press's navigation is on its way, the pressed modal's head over a skeleton
// in the same dialog, which the form then fills; and the links that open it
// so (claude-docs/components/modal.md, "Opening at once").

const CLOSE: Route = '/admin/categories';
const EDIT: Route = '/admin/categories?edit=testcraft';
const HEADING: ModalHeading = { eyebrow: 'Edit Category', title: 'Testcraft' };
const NAME = 'Edit Category, Testcraft';

const content = {
  heading: HEADING,
  body: () => (
    <label>
      Name <input />
    </label>
  ),
};

const opener = (loading?: ModalHeading): RouteModalOpener => ({
  loading,
  open: vi.fn(),
  cancel: vi.fn(),
});

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  router.refresh.mockReset();
});

describe('RouteModal', () => {
  it('shows nothing when the address opens nothing and no press is on its way', () => {
    render(
      <RouteModalContext.Provider value={opener()}>
        <RouteModal closeHref={CLOSE} />
      </RouteModalContext.Provider>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a pressed modal at once over a status, then its form in the same dialog, the focus on its first field', async () => {
    const { rerender } = render(
      <RouteModalContext.Provider value={opener(HEADING)}>
        <RouteModal closeHref={CLOSE} />
      </RouteModalContext.Provider>,
    );
    const loading = screen.getByRole('dialog', { name: NAME });
    expect(within(loading).getByRole('status')).toBeInTheDocument();
    expect(within(loading).queryByRole('textbox')).not.toBeInTheDocument();
    await act(async () => {});

    rerender(
      <RouteModalContext.Provider value={opener()}>
        <RouteModal closeHref={CLOSE} content={content} />
      </RouteModalContext.Provider>,
    );

    const arrived = screen.getByRole('dialog', { name: NAME });
    expect(arrived).toBe(loading);
    expect(within(arrived).queryByRole('status')).not.toBeInTheDocument();
    expect(within(arrived).getByRole('textbox', { name: 'Name' })).toHaveFocus();
  });

  it('forgets the press and goes back to its page when closed while loading', () => {
    const loading = opener(HEADING);
    render(
      <RouteModalContext.Provider value={loading}>
        <RouteModal closeHref={CLOSE} />
      </RouteModalContext.Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(loading.cancel).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith(CLOSE);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it('opens its form from the address alone, outside a provider', () => {
    render(<RouteModal closeHref={CLOSE} content={content} />);

    const dialog = screen.getByRole('dialog', { name: NAME });
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('RouteModalProvider', () => {
  const renderPage = () =>
    render(
      <Navigating push={router.push}>
        <RouteModalProvider>
          <EditLink href={EDIT} name="Testcraft" heading={HEADING} />
          <RouteModal closeHref={CLOSE} />
        </RouteModalProvider>
      </Navigating>,
    );
  const link = () => screen.getByRole('link', { name: 'Edit Testcraft' });

  it('opens the modal on a press of Edit, over a status, while its address is on its way', async () => {
    renderPage();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // `false`: the link's own navigation was prevented, the provider's taking its place.
    // Awaited, as the close below is: the navigation it starts suspends.
    let handled = true;
    await act(async () => {
      handled = fireEvent.click(link());
    });
    expect(handled).toBe(false);

    expect(router.push).toHaveBeenCalledWith(EDIT);
    const dialog = screen.getByRole('dialog', { name: NAME });
    expect(within(dialog).getByRole('status')).toBeInTheDocument();
  });

  it('closes the pressed modal on Close while it loads, and goes back to its page', async () => {
    renderPage();
    await act(async () => {
      fireEvent.click(link());
    });

    // Awaited: the close renders beside the suspended navigation, which a
    // synchronous act leaves uncommitted.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledWith(CLOSE);
  });

  it.each([
    ['a modifier', { metaKey: true }],
    ['another button', { button: 1 }],
  ])('leaves a press with %s to the link', (_, init) => {
    renderPage();

    expect(fireEvent.click(link(), init)).toBe(true);

    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('EditLink outside a provider', () => {
  it('is a plain link', () => {
    render(<EditLink href={EDIT} name="Testcraft" heading={HEADING} />);

    // `true`: nothing prevented the link's own navigation.
    expect(fireEvent.click(screen.getByRole('link', { name: 'Edit Testcraft' }))).toBe(true);
  });
});
