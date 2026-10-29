import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpResponse } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import AddIcon from '@/components/AddIcon';
import { HeldMark } from '@/components/CompendiumCards/held-mark';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import type { AddCupboardEntryMutation, AddCupboardEntryMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { expectRefusalUnder } from '../../support/click-feedback';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';
import { ADD, HELD_MARK } from '../../support/cupboard-wording';

// The plus and the held check carry the entry's name in their accessible names, so a screen reader's list of buttons tells one card's plus from the next, as the pencil and the three dots already do.
// The tip a sighted viewer reads stays short and begins the name, so the words on screen are the words to say (WCAG 2.5.3, Label in Name; claude-docs/components/add-icon.md, "Its name").

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const ONE = { id: '00000000-0000-4000-8000-000000000001', name: 'Fixture Coven One' };
const TWO = { id: '00000000-0000-4000-8000-000000000002', name: 'Fixture Coven Two' };
const THREE = { id: '00000000-0000-4000-8000-000000000003', name: 'Fixture Coven Three' };
const NAME = 'Testwort, Formalis testis';

const client = makeQueryClient();

const Plus = ({
  covens,
  holding,
  heldIn = [TWO.id],
}: {
  covens: (typeof ONE)[];
  holding?: string[];
  heldIn?: string[];
}): ReactElement => (
  <StatusRegionProvider>
    <QueryClientProvider client={client}>
      <AddIcon
        name={NAME}
        workspaceId={ONE.id}
        ingredientId="fixture-testwort-id"
        covens={covens}
        heldIn={heldIn}
        holding={holding}
      />
    </QueryClientProvider>
  </StatusRegionProvider>
);

/** The tip opened at the control's focus: in the page, kept from the accessibility tree. */
function tipOf(control: HTMLElement): string | null {
  fireEvent.focus(control);
  return screen.queryByRole('tooltip', { hidden: true })?.textContent ?? null;
}

describe('the plus names its entry', () => {
  it('names and tips the lone plus by its entry', () => {
    render(<Plus covens={[ONE]} />);
    const plus = screen.getByRole('button', { name: `Add to My Ingredients: ${NAME}` });
    expect(tipOf(plus)).toBe(`Add to My Ingredients: ${NAME}`);
  });

  it("names and tips the menu's plus by its entry", () => {
    render(<Plus covens={[ONE, TWO]} />);
    const plus = screen.getByRole('button', { name: `Add to My Ingredients: ${NAME}` });
    expect(tipOf(plus)).toBe(`Add to My Ingredients: ${NAME}`);
  });
});

describe('the held check names its entry', () => {
  it('is named and tipped In Every Cupboard and the entry', () => {
    render(<HeldMark name={NAME} />);
    const check = screen.getByRole('button', { name: `In Every Cupboard: ${NAME}` });
    expect(tipOf(check)).toBe(`In Every Cupboard: ${NAME}`);
  });
});

// The plus and the check say how many of the viewer's covens hold the entry, every
// membership counted, and name them in the tip; nothing at all where none does.
describe('the holding covens (M12.55)', () => {
  /** The badge: the number drawn on the mark, kept from the accessibility tree as its name says it. */
  const badgeOf = (control: HTMLElement) => control.querySelector('.add-icon__count')?.textContent;

  it('counts and names them on the lone plus', () => {
    render(<Plus covens={[ONE]} holding={['Testhollow', 'Testwren']} />);
    const label = `Add to My Ingredients: ${NAME}. In 2 covens: Testhollow, Testwren`;
    const plus = screen.getByRole('button', { name: label });
    expect(tipOf(plus)).toBe(label);
    expect(badgeOf(plus)).toBe('2');
  });

  it("counts and names them on the menu's plus", () => {
    render(<Plus covens={[ONE, TWO]} holding={['Testwren']} />);
    const label = `Add to My Ingredients: ${NAME}. In 1 coven: Testwren`;
    const plus = screen.getByRole('button', { name: label });
    expect(tipOf(plus)).toBe(label);
    expect(badgeOf(plus)).toBe('1');
  });

  it("keeps the menu's covens the writable ones, not the holding ones", () => {
    render(<Plus covens={[ONE, TWO]} holding={['Testwren', 'Testhollow', 'Testmere']} />);
    fireEvent.click(screen.getByRole('button', { name: /^Add to My Ingredients/ }));
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('draws no badge and keeps the tip where no coven holds it', () => {
    render(<Plus covens={[ONE]} holding={[]} />);
    const plus = screen.getByRole('button', { name: `Add to My Ingredients: ${NAME}` });
    expect(tipOf(plus)).toBe(`Add to My Ingredients: ${NAME}`);
    expect(badgeOf(plus)).toBeUndefined();
  });

  it('counts and names them on the held check', () => {
    render(<HeldMark name={NAME} holding={['Testhollow', 'Testwren', 'Testmere']} />);
    const label = `In Every Cupboard: ${NAME}. In 3 covens: Testhollow, Testwren, Testmere`;
    const check = screen.getByRole('button', { name: label });
    expect(tipOf(check)).toBe(label);
    expect(badgeOf(check)).toBe('3');
  });
});

// The plus of someone who may write in several covens asks which in a menu: its items are every coven, one holding the entry disabled, and choosing one adds there at once. With one coven, the plus adds there with no menu.
// A success turns the spinner into a check, which fades back to the plus after a hold unless every coven now holds the entry (claude-docs/components/compendium-cards.md, "The plus").
// These cases render the plus alone; the cards page's choice between the plus and the held check is proved in CompendiumCards/add-icon.test.tsx.

/** The plus, named by its tip and then its entry. */
const PLUS = { name: `${ADD}: ${NAME}` };
const COVENS = [ONE, TWO, THREE];

/** Opens the plus's menu and returns it. */
function openMenu(): HTMLElement {
  fireEvent.click(screen.getByRole('button', PLUS));
  return screen.getByRole('menu', PLUS);
}

/** The menu's items, by their labels (a held one's mark left out), in order. */
const items = (menu: HTMLElement): string[] =>
  within(menu)
    .getAllByRole('menuitem')
    .map((item) => item.firstChild?.textContent ?? '');

/** A held coven's item: its name, then the mark its check stands for. */
const held = (name: string) => `${name}, ${HELD_MARK}`;

function mockAdd() {
  const calls: AddCupboardEntryMutationVariables[] = [];
  mockGraphQLMutation<AddCupboardEntryMutation, AddCupboardEntryMutationVariables>(
    'AddCupboardEntry',
    (variables) => {
      calls.push(variables);
      return { addCupboardEntry: { id: 'fixture' } };
    },
  );
  return calls;
}

describe('the add icon among several covens', () => {
  beforeEach(() => {
    router.push.mockReset();
    router.refresh.mockReset();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });

  it('adds at once where there is one coven, and opens no menu', async () => {
    const calls = mockAdd();
    render(<Plus covens={[ONE]} heldIn={[]} />);

    fireEvent.click(screen.getByRole('button', PLUS));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: ONE.id, ingredientId: 'fixture-testwort-id' }]);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // The cards page passes no coven list to a visitor who has the one workspace to add to.
  it('adds to the workspace it is given where it is given no covens', async () => {
    const calls = mockAdd();
    render(<Plus covens={[]} heldIn={[]} />);

    fireEvent.click(screen.getByRole('button', PLUS));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: ONE.id, ingredientId: 'fixture-testwort-id' }]);
  });

  // The plus adds at once only where there is one coven at all,
  // never because one coven alone is left without the entry.
  it('opens a menu where there are two covens and one holds the entry, the holder disabled', () => {
    const calls = mockAdd();
    // Why it could have added at once: the viewer writes in two covens, and only TWO lacks it.
    render(<Plus covens={[ONE, TWO]} heldIn={[ONE.id]} />);

    const menu = openMenu();

    expect(items(menu)).toEqual([ONE.name, TWO.name]);
    const holder = within(menu).getByRole('menuitem', { name: held(ONE.name) });
    expect(holder).toHaveAttribute('aria-disabled', 'true');
    expect(holder).not.toHaveAccessibleDescription();
    expect(within(menu).getByRole('menuitem', { name: TWO.name })).not.toHaveAttribute(
      'aria-disabled',
    );
    expect(calls).toEqual([]);
  });

  it('sends nothing when the held coven is chosen, and keeps the menu open', async () => {
    const calls = mockAdd();
    render(<Plus covens={[ONE, TWO]} heldIn={[ONE.id]} />);
    const menu = openMenu();

    fireEvent.click(within(menu).getByRole('menuitem', { name: held(ONE.name) }));

    await act(async () => {});
    expect(calls).toEqual([]);
    expect(router.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('menu', PLUS)).toBeVisible();
  });

  it('names its menu by the entry and lists every coven by name, one that holds the entry shown disabled and marked, not left off, with nothing sent on opening it', () => {
    const calls = mockAdd();
    render(<Plus covens={COVENS} heldIn={[TWO.id]} />);

    const menu = openMenu();

    expect(items(menu)).toEqual([ONE, THREE, TWO].map(({ name }) => name));
    const disabled = within(menu)
      .getAllByRole('menuitem')
      .filter((item) => item.getAttribute('aria-disabled') === 'true');
    expect(disabled).toEqual([within(menu).getByRole('menuitem', { name: held(TWO.name) })]);
    expect(disabled[0]).not.toHaveAccessibleDescription();
    expect(calls).toEqual([]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it("adds to the coven chosen, by that coven's id, and reads the page again", async () => {
    const calls = mockAdd();
    render(<Plus covens={COVENS} heldIn={[]} />);

    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: TWO.name }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: TWO.id, ingredientId: 'fixture-testwort-id' }]);
  });

  it('shows the plus busy, Adding, while the add is on its way', async () => {
    let answer: () => void = () => {};
    const gate = new Promise<void>((resolve) => (answer = resolve));
    server.use(
      graphqlLink.mutation('AddCupboardEntry', async () => {
        await gate;
        return HttpResponse.json({ data: { addCupboardEntry: { id: 'fixture' } } });
      }),
    );
    render(<Plus covens={COVENS} heldIn={[]} />);

    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: THREE.name }));

    const busy = await screen.findByRole('button', { name: 'Adding' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toHaveAttribute('aria-disabled', 'true');
    // Not `disabled`, which would drop the focus to the body.
    expect(busy).not.toHaveAttribute('disabled');
    expect(router.refresh).not.toHaveBeenCalled();
    await act(async () => answer());
    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
  });

  it('says a refusal under the plus, which keeps the focus and offers the menu again', async () => {
    mockGraphQLError('AddCupboardEntry', {
      code: 'FORBIDDEN',
      message: 'Viewers cannot add ingredients.',
    });
    render(<Plus covens={COVENS} heldIn={[]} />);

    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: ONE.name }));

    const plus = await screen.findByRole('button', PLUS);
    expect(await expectRefusalUnder(plus, PLUS.name)).toContain('Viewers cannot add ingredients.');
    expect(plus).not.toHaveAttribute('aria-disabled');
    expect(plus).not.toHaveAttribute('aria-busy');
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

// A click on the plus that adds to a coven animates the spinner into a check mark, then fades back to the plus.
// The plus says which it shows in its `data-state`, the attribute its stylesheet draws from: `added` for the check, `returning` while it fades back, and none for the plus itself.
describe('the plus after an add', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    router.refresh.mockReset();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    return () => vi.useRealTimers();
  });

  const plus = (): HTMLElement => screen.getByRole('button', PLUS);
  /** What the page's status region says. */
  const said = (): string[] =>
    screen.getAllByRole('status').map((status) => status.textContent?.trim() ?? '');

  it('shows the check on a success, says so once, and returns to the plus after the hold', async () => {
    mockAdd();
    // Why it could return: two covens, neither holding the entry, so one add leaves one lacking it.
    render(<Plus covens={[ONE, TWO]} heldIn={[]} />);
    expect(plus()).not.toHaveAttribute('data-state');

    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: TWO.name }));

    await waitFor(() => expect(plus()).toHaveAttribute('data-state', 'added'));
    expect(plus()).toHaveAccessibleName(PLUS.name);
    expect(said()).toContain(`Added to ${TWO.name}.`);
    await act(() => vi.advanceTimersByTimeAsync(900));
    expect(plus()).toHaveAttribute('data-state', 'added');

    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(plus()).toHaveAttribute('data-state', 'returning');
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(plus()).not.toHaveAttribute('data-state');
    expect(plus()).toHaveAccessibleName(PLUS.name);
    expect(plus()).toBeEnabled();
    // The coven just added to is held until the page says so, so the menu cannot add it twice.
    expect(within(openMenu()).getByRole('menuitem', { name: held(TWO.name) })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('keeps the check where the add left every coven holding the entry', async () => {
    mockAdd();
    // Two covens, the second already holding it: adding to the first leaves none lacking it.
    render(<Plus covens={[ONE, TWO]} heldIn={[TWO.id]} />);

    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: ONE.name }));

    await waitFor(() => expect(plus()).toHaveAttribute('data-state', 'added'));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(plus()).toHaveAttribute('data-state', 'added');
  });

  it('keeps the check on the lone plus, whose one coven then holds the entry', async () => {
    mockAdd();
    render(<Plus covens={[ONE]} heldIn={[]} />);

    fireEvent.click(plus());

    await waitFor(() => expect(plus()).toHaveAttribute('data-state', 'added'));
    expect(plus()).toHaveAccessibleName(PLUS.name);
    expect(said()).toContain(`Added to ${ONE.name}.`);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(plus()).toHaveAttribute('data-state', 'added');
  });

  it('never shows the check on a refusal, and says nothing in the status region', async () => {
    mockGraphQLError('AddCupboardEntry', {
      code: 'FORBIDDEN',
      message: 'Viewers cannot add ingredients.',
    });
    render(<Plus covens={[ONE]} heldIn={[]} />);

    fireEvent.click(plus());

    expect(await expectRefusalUnder(plus(), PLUS.name)).toContain(
      'Viewers cannot add ingredients.',
    );
    expect(plus()).not.toHaveAttribute('data-state');
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(plus()).not.toHaveAttribute('data-state');
    expect(said().filter((text) => text.startsWith('Added'))).toEqual([]);
  });
});
