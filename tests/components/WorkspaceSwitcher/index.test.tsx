import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { useNavigationState } from '@/lib/navigation';
import { Navigating } from '../../support/navigating';

const pathname = vi.fn<() => string>();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push }),
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
  push.mockClear();
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

    expect(push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle/ingredients');
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

    expect(push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle');
  });

  it('goes to the members page, not a 404, from invitations when the viewer cannot invite there', () => {
    pathname.mockReturnValue('/coven/fixture-coven/invitations');
    const workspaces = [WORKSPACES[0]!, { ...WORKSPACES[1]!, canInvite: false }];

    render(<WorkspaceSwitcher workspaces={workspaces} />);
    fireEvent.click(box());
    fireEvent.click(screen.getByRole('option', { name: 'Testwort Circle' }));

    // Why the members page: they may read it there, only the invite right is missing.
    expect(workspaces[1]!.canReadMembers).toBe(true);
    expect(push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle/members');
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

      expect(push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle/ingredients/some-id');
    });

    it('ignores a registration made for another address', () => {
      // Why it could be used: it names the target coven, only for a different entry.
      renderOn(['fixture-coven', 'testwort-circle'], '/coven/fixture-coven/ingredients/other-id');

      switchTo('Testwort Circle');

      expect(push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle/ingredients');
    });
  });

  it('shows the paused coven as current on its paused page, and goes from there to another coven’s home', () => {
    pathname.mockReturnValue('/coven-paused/fixture-coven');
    const workspaces = [{ ...WORKSPACES[0]!, paused: { until: null } }, WORKSPACES[1]!];
    render(<WorkspaceSwitcher workspaces={workspaces} />);

    expect(box()).toHaveTextContent('Fixture Coven');
    fireEvent.click(box());
    fireEvent.click(screen.getByRole('option', { name: 'Testwort Circle' }));

    expect(push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle');
  });

  it('goes from another coven straight to a paused coven’s paused page, drawing that page’s narrow panel while it loads', async () => {
    let target: unknown;
    function Probe() {
      const state = useNavigationState();
      useEffect(() => {
        target = state.target;
      });
      return null;
    }
    const workspaces = [WORKSPACES[0]!, { ...WORKSPACES[1]!, paused: { until: null } }];
    render(
      <Navigating push={push}>
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

    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0]?.[0]).toBe('/coven-paused/testwort-circle');
    expect(target).toEqual({ region: 'main', shape: 'form', frame: 'narrow' });
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
      expect(push).toHaveBeenCalledExactlyOnceWith('/coven/new');
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
      push.mockReset();
    });

    it('marks the control busy and shows the picked coven as its value until the new coven renders', async () => {
      const arrives = new Promise<void>((resolve) => {
        arrive = resolve;
      });
      render(
        <Navigating push={push} arrives={arrives}>
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

      expect(push).toHaveBeenCalledTimes(1);
      expect(push.mock.calls[0]?.[0]).toBe('/coven/testwort-circle/ingredients');
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
        <Navigating push={push} arrives={arrives}>
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
