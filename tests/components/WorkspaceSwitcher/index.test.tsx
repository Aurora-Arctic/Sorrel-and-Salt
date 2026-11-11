import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { useNavigationState } from '@/lib/navigation';
import { Navigating } from '../../support/navigating';
import { router } from '../../support/next-navigation';

const pathname = vi.fn<() => string>();
vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
  usePathname: () => pathname(),
}));

const { default: WorkspaceSwitcher } = await import('@/components/WorkspaceSwitcher');
const { default: CovenSwitchTargets } = await import('@/components/CovenSwitchTargets');
const { CovenSwitchProvider } = await import('@/components/CovenSwitchTargets/context');

const WORKSPACES = [
  {
    slug: 'fixture-coven',
    name: 'Fixture Coven',
    canReadMembers: true,
    canInvite: true,
    paused: null,
  },
  {
    slug: 'testwort-circle',
    name: 'Testwort Circle',
    canReadMembers: true,
    canInvite: true,
    paused: null,
  },
];

const box = () => screen.getByRole('combobox', { name: 'Coven' });

beforeEach(() => {
  router.push.mockClear();
  pathname.mockReturnValue('/coven/fixture-coven/ingredients');
});

describe('WorkspaceSwitcher', () => {
  it('lists every workspace the viewer belongs to', () => {
    render(<WorkspaceSwitcher workspaces={WORKSPACES} />);

    fireEvent.click(box());

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Fixture Coven',
      'Testwort Circle',
    ]);
  });

  it("shows each coven's address beside a name two of the member's covens share, and none beside a unique one", () => {
    const workspaces = [
      WORKSPACES[0]!,
      { ...WORKSPACES[0]!, slug: 'fixture-coven-2' },
      WORKSPACES[1]!,
    ];
    render(<WorkspaceSwitcher workspaces={workspaces} />);

    fireEvent.click(box());

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveAccessibleName(/^Fixture Coven\b.*fixture-coven(?!-)/);
    expect(options[1]).toHaveAccessibleName(/^Fixture Coven\b.*fixture-coven-2/);
    expect(options[2]).toHaveAccessibleName('Testwort Circle');
  });

  it('shows no address when every name is unique', () => {
    render(<WorkspaceSwitcher workspaces={WORKSPACES} />);

    fireEvent.click(box());

    expect(screen.getByRole('option', { name: /Fixture Coven/ })).toHaveAccessibleName(
      'Fixture Coven',
    );
    expect(screen.queryByRole('option', { name: /fixture-coven/ })).toBeNull();
  });

  it('goes to the coven chosen by address, of two with one name', () => {
    const workspaces = [WORKSPACES[0]!, { ...WORKSPACES[0]!, slug: 'fixture-coven-2' }];
    render(<WorkspaceSwitcher workspaces={workspaces} />);

    fireEvent.click(box());
    fireEvent.click(screen.getByRole('option', { name: /fixture-coven-2/ }));

    expect(router.push).toHaveBeenCalledExactlyOnceWith('/coven/fixture-coven-2/ingredients');
  });

  it('marks a coven whose access is paused, with when the pause ends', () => {
    const workspaces = [
      { ...WORKSPACES[0]!, paused: { until: new Date('2099-01-01T00:00:00Z') } },
      { ...WORKSPACES[1]!, paused: { until: null } },
      { ...WORKSPACES[1]!, slug: 'third-circle', name: 'Third Circle' },
    ];
    render(<WorkspaceSwitcher workspaces={workspaces} />);

    fireEvent.click(box());

    expect(screen.getByRole('option', { name: /Fixture Coven/ })).toHaveAccessibleName(
      'Fixture Coven Paused until 1 January 2099, 00:00 UTC',
    );
    expect(screen.getByRole('option', { name: /Testwort Circle/ })).toHaveAccessibleName(
      'Testwort Circle Paused, with no end date',
    );
    expect(screen.getByRole('option', { name: /Third Circle/ })).toHaveAccessibleName(
      'Third Circle',
    );
  });

  it('goes to the same section in the chosen workspace', () => {
    render(<WorkspaceSwitcher workspaces={WORKSPACES} />);

    fireEvent.click(box());
    fireEvent.click(screen.getByRole('option', { name: 'Testwort Circle' }));

    expect(router.push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle/ingredients');
  });

  it('goes to the coven index when the viewer cannot read members there', () => {
    pathname.mockReturnValue('/coven/fixture-coven/members');
    const workspaces = [
      WORKSPACES[0]!,
      { ...WORKSPACES[1]!, canReadMembers: false, canInvite: false },
    ];

    render(<WorkspaceSwitcher workspaces={workspaces} />);
    fireEvent.click(box());
    fireEvent.click(screen.getByRole('option', { name: 'Testwort Circle' }));

    expect(router.push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle');
  });

  it('goes to the members page, not a 404, from invitations when the viewer cannot invite there', () => {
    pathname.mockReturnValue('/coven/fixture-coven/invitations');
    const workspaces = [WORKSPACES[0]!, { ...WORKSPACES[1]!, canInvite: false }];

    render(<WorkspaceSwitcher workspaces={workspaces} />);
    fireEvent.click(box());
    fireEvent.click(screen.getByRole('option', { name: 'Testwort Circle' }));

    // Why the members page: they may read it there, only the invite right is missing.
    expect(workspaces[1]!.canReadMembers).toBe(true);
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle/members');
  });

  describe('from a page that says which covens it opens in', () => {
    const ENTRY = '/coven/fixture-coven/ingredients/some-id';
    const switchTo = (name: string) => {
      fireEvent.click(box());
      fireEvent.click(screen.getByRole('option', { name }));
    };
    const renderOn = (slugs: readonly string[] | null, path = ENTRY) =>
      render(
        <CovenSwitchProvider>
          {slugs && <CovenSwitchTargets path={path} slugs={slugs} />}
          <WorkspaceSwitcher workspaces={WORKSPACES} />
        </CovenSwitchProvider>,
      );

    beforeEach(() => pathname.mockReturnValue(ENTRY));

    it('stays on the page in a coven it opens in', () => {
      renderOn(['fixture-coven', 'testwort-circle']);

      switchTo('Testwort Circle');

      expect(router.push).toHaveBeenCalledExactlyOnceWith(
        '/coven/testwort-circle/ingredients/some-id',
      );
    });

    it('ignores a registration made for another address', () => {
      // Why it could be used: it names the target coven, only for a different entry.
      renderOn(['fixture-coven', 'testwort-circle'], '/coven/fixture-coven/ingredients/other-id');

      switchTo('Testwort Circle');

      expect(router.push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle/ingredients');
    });
  });

  it('shows the paused coven as current on its paused page, and goes from there to another coven’s home', () => {
    pathname.mockReturnValue('/coven-paused/fixture-coven');
    const workspaces = [{ ...WORKSPACES[0]!, paused: { until: null } }, WORKSPACES[1]!];
    render(<WorkspaceSwitcher workspaces={workspaces} />);

    expect(box()).toHaveTextContent('Fixture Coven');
    fireEvent.click(box());
    fireEvent.click(screen.getByRole('option', { name: 'Testwort Circle' }));

    expect(router.push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle');
  });

  it('goes from another coven straight to a paused coven’s paused page, naming that page while it loads', async () => {
    let target: unknown;
    function Probe() {
      const state = useNavigationState();
      useEffect(() => {
        target = state.href;
      });
      return null;
    }
    const workspaces = [WORKSPACES[0]!, { ...WORKSPACES[1]!, paused: { until: null } }];
    render(
      <Navigating push={router.push}>
        <WorkspaceSwitcher workspaces={workspaces} />
        <Probe />
      </Navigating>,
    );
    // Why the guard's hop could have been taken: the address is a page of another coven, which has the same section.
    expect(box()).toHaveTextContent('Fixture Coven');

    fireEvent.click(box());
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: /Testwort Circle/ }));
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push.mock.calls[0]?.[0]).toBe('/coven-paused/testwort-circle');
    expect(target).toBe('/coven-paused/testwort-circle');
  });

  it('keeps the current workspace from the address, so a re-render in another tab’s workspace does not change it', () => {
    const { rerender } = render(<WorkspaceSwitcher workspaces={WORKSPACES} />);
    pathname.mockReturnValue('/coven/testwort-circle/ingredients');

    rerender(<WorkspaceSwitcher workspaces={WORKSPACES} />);

    expect(box()).toHaveTextContent('Testwort Circle');
  });

  describe('the create entry', () => {
    it('is offered after the workspaces only to a viewer holding creation rights', () => {
      const { unmount } = render(<WorkspaceSwitcher workspaces={WORKSPACES} canCreate />);
      fireEvent.click(box());
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'Fixture Coven',
        'Testwort Circle',
        'Create Coven',
      ]);
      unmount();

      render(<WorkspaceSwitcher workspaces={WORKSPACES} canCreate={false} />);
      fireEvent.click(box());
      expect(screen.queryByRole('option', { name: 'Create Coven' })).not.toBeInTheDocument();
    });

    it('goes to the create page', () => {
      render(<WorkspaceSwitcher workspaces={WORKSPACES} canCreate />);

      fireEvent.click(box());
      fireEvent.click(screen.getByRole('option', { name: 'Create Coven' }));
      expect(router.push).toHaveBeenCalledExactlyOnceWith('/coven/new');
    });

    it('shows no workspace as chosen on the create page itself', () => {
      pathname.mockReturnValue('/coven/new');

      render(<WorkspaceSwitcher workspaces={WORKSPACES} canCreate />);

      for (const { name } of WORKSPACES) expect(box()).not.toHaveTextContent(name);
    });
  });

  describe('while the switch is on its way', () => {
    let arrive = () => {};
    afterEach(async () => {
      await act(async () => arrive());
      router.push.mockReset();
    });

    it('marks the control busy and shows the picked coven as its value until the new coven renders', async () => {
      const arrives = new Promise<void>((resolve) => {
        arrive = resolve;
      });
      render(
        <Navigating push={router.push} arrives={arrives}>
          <WorkspaceSwitcher workspaces={WORKSPACES} />
        </Navigating>,
      );
      // Why the value below is the pick's: the address is still the old coven's.
      expect(box()).toHaveTextContent('Fixture Coven');
      expect(box()).not.toHaveAttribute('aria-busy', 'true');

      fireEvent.click(box());
      await act(async () => {
        fireEvent.click(screen.getByRole('option', { name: 'Testwort Circle' }));
      });

      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push.mock.calls[0]?.[0]).toBe('/coven/testwort-circle/ingredients');
      expect(box()).toHaveAttribute('aria-busy', 'true');
      expect(box()).toHaveTextContent('Testwort Circle');

      pathname.mockReturnValue('/coven/testwort-circle/ingredients');
      await act(async () => arrive());

      expect(box()).not.toHaveAttribute('aria-busy', 'true');
      expect(box()).toHaveTextContent('Testwort Circle');
    });

    it('takes focus on arriving at the picked coven, but not on a mount elsewhere after a superseded switch', async () => {
      const arrives = new Promise<void>((resolve) => {
        arrive = resolve;
      });
      const first = render(
        <Navigating push={router.push} arrives={arrives}>
          <WorkspaceSwitcher workspaces={WORKSPACES} />
        </Navigating>,
      );
      fireEvent.click(box());
      await act(async () => {
        fireEvent.click(screen.getByRole('option', { name: 'Testwort Circle' }));
      });
      // Superseded: the page moves on to a place that is not the picked coven,
      // and the switcher that started the switch goes away.
      first.unmount();
      pathname.mockReturnValue('/compendium');
      render(<WorkspaceSwitcher workspaces={WORKSPACES} />);
      expect(box()).not.toHaveFocus();
    });
  });
});
