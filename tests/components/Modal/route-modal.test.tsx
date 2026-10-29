import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModalHeading, RouteModalOpener } from '@/components/Modal/types';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const { RouteModal, RouteModalProvider, useOpenModalClick } = await import('@/components/Modal');
const { RouteModalContext } = await import('@/components/Modal/route-modal-provider');
const { EditLink } = await import('@/components/IconTip');
const { default: MenuButton } = await import('@/components/MenuButton');

// A page's one modal place: the form its address opens, or, while a
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
    expect(router.refresh).toHaveBeenCalledTimes(1);
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

// The focus goes back to the link that opened it (Modal's own), or, once that
// is drawn afresh or was never there, to a link to the address it opened, or
// to the page's heading (claude-docs/components/modal.md, "Giving the focus
// back"). The page here is drawn again by hand,
// as the close's navigation would draw it.
describe('RouteModal giving the focus back', () => {
  function Page({ open, drawn }: { open: boolean; drawn: number }) {
    return (
      <main>
        <h1>Categories</h1>
        {/* Keyed, so a new drawing is a new element, as a list read again may be. */}
        <EditLink key={drawn} href={EDIT} name="Testcraft" heading={HEADING} />
        <RouteModal closeHref={CLOSE} content={open ? content : undefined} />
      </main>
    );
  }
  const link = () => screen.getByRole('link', { name: 'Edit Testcraft' });

  it('goes to a link to the address the provider opened, once the link pressed is gone', async () => {
    let arrive = () => {};
    const arrives = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    const page = (open: boolean, drawn: number) => (
      <Navigating push={router.push} arrives={arrives}>
        <RouteModalProvider>
          <Page open={open} drawn={drawn} />
        </RouteModalProvider>
      </Navigating>
    );
    const view = render(page(false, 1));
    // A press that leaves the focus where it was, as a click in WebKit does:
    // only the provider knows which link it was.
    await act(async () => {
      fireEvent.click(link());
    });
    expect(link()).not.toHaveFocus();
    await act(async () => {
      arrive();
      await arrives;
    });
    view.rerender(page(true, 1));
    expect(screen.getByRole('dialog', { name: NAME })).toBeInTheDocument();

    const pressed = link();
    view.rerender(page(false, 2));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(link()).not.toBe(pressed);
    expect(link()).toHaveFocus();
  });

  it('goes to a link to the address the focused link opened, once that link is gone, outside a provider', async () => {
    const view = render(<Page open={false} drawn={1} />);
    act(() => link().focus());
    view.rerender(<Page open drawn={1} />);
    await act(async () => {});

    const pressed = link();
    view.rerender(<Page open={false} drawn={2} />);

    expect(link()).not.toBe(pressed);
    expect(link()).toHaveFocus();
  });

  // A menu's item (the entry page's Edit menu): the item goes with its
  // closed menu, and the button that opened the menu is where the press began.
  it('goes to the button of the menu whose item opened it, once that menu has closed', async () => {
    function MenuPage({ open }: { open: boolean }) {
      const onClick = useOpenModalClick(EDIT, HEADING);
      return (
        <main>
          <h1>Categories</h1>
          <MenuButton
            label="Edit"
            className="btn"
            items={[{ key: 'edit', label: 'Edit Category', href: EDIT, onClick }]}
          />
          <RouteModal closeHref={CLOSE} content={open ? content : undefined} />
        </main>
      );
    }
    const page = (open: boolean) => (
      <RouteModalProvider>
        <MenuPage open={open} />
      </RouteModalProvider>
    );
    const view = render(page(false));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const item = screen.getByRole('menuitem', { name: 'Edit Category' });
    act(() => item.focus());
    await act(async () => {
      fireEvent.click(item);
    });
    view.rerender(page(true));
    expect(screen.getByRole('dialog', { name: NAME })).toBeInTheDocument();
    await act(async () => {});

    view.rerender(page(false));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus();
  });

  // A pasted address or a reload: nothing opened it.
  it("goes to the page's heading when nothing opened it", async () => {
    const view = render(
      <main>
        <h1>Categories</h1>
        <RouteModal closeHref={CLOSE} content={content} />
      </main>,
    );
    await act(async () => {});

    view.rerender(
      <main>
        <h1>Categories</h1>
        <RouteModal closeHref={CLOSE} />
      </main>,
    );

    const heading = screen.getByRole('heading', { level: 1, name: 'Categories' });
    expect(heading).toHaveFocus();
    // Focusable by script alone, so Tab never stops on it.
    expect(heading).toHaveAttribute('tabindex', '-1');
  });
});

describe('EditLink outside a provider', () => {
  it('is a plain link', () => {
    render(<EditLink href={EDIT} name="Testcraft" heading={HEADING} />);

    // `true`: nothing prevented the link's own navigation.
    expect(fireEvent.click(screen.getByRole('link', { name: 'Edit Testcraft' }))).toBe(true);
  });
});

describe('two modal places on one page', () => {
  // A list whose names open a details modal and whose Edit opens the edit
  // modal over it: each place shows only the press meant for it.
  const DETAILS: Route = '/admin/categories?entry=testcraft';
  const DETAILS_HEADING: ModalHeading = { eyebrow: 'Ingredient', title: 'Testcraft' };
  const NameLink = () => {
    const onClick = useOpenModalClick(DETAILS, DETAILS_HEADING, 'details');
    return (
      <a href="/compendium/ingredients/testcraft" onClick={onClick}>
        Testcraft
      </a>
    );
  };
  const renderPage = () =>
    render(
      <Navigating push={router.push}>
        <RouteModalProvider>
          <NameLink />
          <EditLink href={EDIT} name="Testcraft" heading={HEADING} />
          <RouteModal place="details" closeHref={CLOSE} />
          <RouteModal closeHref={CLOSE} />
        </RouteModalProvider>
      </Navigating>,
    );

  it('shows a press of the name in the details place alone', async () => {
    renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Testcraft' }));
    });

    expect(router.push).toHaveBeenCalledWith(DETAILS);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Ingredient, Testcraft' })).toBeInTheDocument();
  });

  it('shows a press of Edit in the unnamed place alone, as before', async () => {
    renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Edit Testcraft' }));
    });

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: NAME })).toBeInTheDocument();
  });
});
