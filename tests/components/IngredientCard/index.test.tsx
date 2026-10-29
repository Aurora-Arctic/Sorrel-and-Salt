import type { Route } from 'next';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigationState } from '@/lib/navigation';
import { Navigating } from '../../support/navigating';
import IngredientCard from '@/components/IngredientCard';
import { CATEGORY_CHIP_LIMIT } from '@/components/CategoryChips/constants';
import { StockBadge } from '@/components/StockBadge';

// (claude-docs/components/ingredient-card.md): the card is presentational, so each case is its props in and what rendered out. The names, forms and notes are the test's own data.
// Marks are found by their exact text and asserted by presence or absence, never by what the words say.

// The name link navigates through the shared hook, so the App Router is mocked.
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/here' }));

const HREF = '/compendium/ingredients/testwort-testalis' as Route;
const LEAF = {
  form: 'testleaf',
  formChoice: { group: { icon: 'botanical' as const } },
  safetyNotes: '',
  toxic: false,
};
const OIL = { form: 'testoil', safetyNotes: 'Fixture oil caution.', toxic: false };
const ROOT = { form: 'testroot', safetyNotes: '', toxic: false };
const BASE = { href: HREF, label: 'Fixture Testwort', kind: 'compendium' as const };

const cautionMark = () => screen.queryByText('Caution', { exact: true });
const toxicMark = () => screen.queryByText('Toxic', { exact: true });
const localMark = () => screen.queryByText('Local', { exact: true });
const heldMark = () => screen.queryByText('Compendium', { exact: true });
const retiredMark = () => screen.queryByRole('button', { name: 'Retired' });

describe('IngredientCard', () => {
  it('has one link, the name, to the entry page', () => {
    render(<IngredientCard {...BASE} formalName="Fixtura testalis" variants={[LEAF, OIL]} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Fixture Testwort');
    expect(links[0]).toHaveAttribute('href', HREF);
  });

  it('keeps one link, named by the ingredient, beside the Low badge button', () => {
    render(
      <IngredientCard {...BASE}>
        <StockBadge quantity={6} threshold={10} unit="g" />
      </IngredientCard>,
    );

    const card = screen.getByRole('article');
    expect(within(card).getAllByRole('link')).toHaveLength(1);
    expect(within(card).getByRole('link')).toHaveAccessibleName('Fixture Testwort');
    expect(within(card).getByRole('button', { name: /^Low Stock/ })).toBeInTheDocument();
  });

  it('names the card by the heading holding the link, at the level asked', () => {
    render(<IngredientCard {...BASE} level={3} />);

    expect(screen.getByRole('heading', { level: 3 })).toContainElement(screen.getByRole('link'));
  });

  // The icon before each form is aria-hidden, so the role tree cannot see it;
  // FormIcon's own tests cover which icon draws.
  it('shows the formal name and every form on the secondary line', () => {
    render(<IngredientCard {...BASE} formalName="Fixtura testalis" variants={[LEAF, ROOT]} />);

    expect(screen.getByText('Fixtura testalis')).toBeInTheDocument();
    expect(screen.getByText('Testleaf')).toBeInTheDocument();
    expect(screen.getByText('Testroot')).toBeInTheDocument();
  });

  it('sets the formal name in italics for a binomial nomenclature and upright otherwise', () => {
    const bin = render(
      <IngredientCard {...BASE} formalName="Fixtura testalis" nomenclature="botanical" />,
    );
    expect(screen.getByText('Fixtura testalis').tagName).toBe('I');
    bin.unmount();

    const mineral = render(
      <IngredientCard {...BASE} formalName="Fixtura testite" nomenclature="mineral" />,
    );
    expect(screen.getByText('Fixtura testite').tagName).not.toBe('I');
    mineral.unmount();

    // A nomenclature not passed is not assumed to be a binomial.
    render(<IngredientCard {...BASE} formalName="Fixtura testalis" />);
    expect(screen.getByText('Fixtura testalis').tagName).not.toBe('I');
  });

  it('puts a spoken separator between the forms, and none after the last', () => {
    render(<IngredientCard {...BASE} variants={[LEAF, ROOT, OIL]} />);

    // Three forms, two separators; the dot itself is drawn in CSS, not text.
    expect(screen.getAllByText(',')).toHaveLength(2);
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it('lays the body out as the top row, the categories, the forms, then the jar lines', () => {
    render(
      <IngredientCard
        {...BASE}
        kind="own"
        variants={[LEAF]}
        categories={[
          {
            category: { id: 'c1', name: 'Testing' },
            group: { colorDark: '#112233', colorLight: '#445566' },
          },
        ]}
      >
        <ul aria-label="Jars">
          <li>Testleaf</li>
        </ul>
      </IngredientCard>,
    );

    const follows = (a: HTMLElement, b: HTMLElement) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const name = screen.getByRole('heading');
    const chips = screen.getByRole('list', { name: 'Categories' });
    const form = screen.getByText('Testleaf', { selector: 'span' });
    const jars = screen.getByRole('list', { name: 'Jars' });
    expect(follows(name, chips)).toBe(true);
    expect(follows(chips, form)).toBe(true);
    expect(follows(form, jars)).toBe(true);
  });

  it("leaves the forms line out when asked, keeping the formal name and the forms' cautions", () => {
    render(
      <IngredientCard
        {...BASE}
        formalName="Fixtura testalis"
        variants={[LEAF, OIL]}
        forms={false}
      />,
    );

    expect(screen.getByText('Fixtura testalis')).toBeInTheDocument();
    expect(screen.queryByText('Testleaf')).toBeNull();
    expect(screen.queryByText('Testoil')).toBeNull();
    // A form's notes still mark the card: only the line of names went.
    expect(cautionMark()).toBeInTheDocument();
  });

  it('shows no formal name and no forms for an entry with neither', () => {
    render(<IngredientCard {...BASE} formalName={null} variants={[]} />);

    expect(screen.queryByText('Fixtura testalis')).toBeNull();
    expect(screen.queryByText('Testleaf')).toBeNull();
  });

  // The chip row and its +N toggletip are CategoryChips', tested in
  // tests/components/CategoryChips; the card only has to hand it the categories.
  it('puts the categories past the limit behind a +N button', () => {
    const group = { colorDark: '#112233', colorLight: '#445566' };
    const categories = Array.from({ length: CATEGORY_CHIP_LIMIT + 3 }, (_, i) => ({
      category: { id: `c${i}`, name: `Fixture Category ${i + 1}` },
      group,
    }));
    render(<IngredientCard {...BASE} categories={categories} />);

    expect(screen.getByRole('button', { name: /3 more categories for/i })).toHaveTextContent('+3');
  });

  describe('safety', () => {
    it('shows the caution badge for notes on the entry, and not the notes', () => {
      render(<IngredientCard {...BASE} safetyNotes="Fixture entry caution." />);

      expect(cautionMark()).not.toBeNull();
      expect(screen.queryByText('Fixture entry caution.')).toBeNull();
    });

    it('shows the caution badge for notes on a listed form alone', () => {
      render(<IngredientCard {...BASE} variants={[LEAF, OIL]} />);

      expect(cautionMark()).not.toBeNull();
    });

    // The safety badge sits beside the name and the rest under the formal name
    // . It is read last, after the name, the formal
    // name and the row beneath them: the row the badge joins when it wraps.
    it('reads the name, the formal name, the other marks, then the safety badge', () => {
      render(
        <IngredientCard
          {...BASE}
          kind="own"
          formalName="Fixtura testalis"
          safetyNotes="Fixture entry caution."
        />,
      );
      const order = [
        screen.getByRole('link', { name: /Fixture Testwort/ }),
        screen.getByText('Fixtura testalis'),
        localMark(),
        cautionMark(),
      ];

      for (const [at, mark] of order.slice(1).entries()) {
        expect(
          order[at]!.compareDocumentPosition(mark!) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
    });

    it('shows the toxic mark for the entry or any listed form, and not otherwise', () => {
      const clean = render(<IngredientCard {...BASE} variants={[LEAF]} />);
      expect(toxicMark()).toBeNull();
      clean.unmount();

      const entry = render(<IngredientCard {...BASE} toxic />);
      expect(toxicMark()).toBeInTheDocument();
      entry.unmount();

      render(<IngredientCard {...BASE} variants={[LEAF, { ...OIL, toxic: true }]} />);
      expect(toxicMark()).toBeInTheDocument();
    });
  });

  describe('the cupboard marks', () => {
    it("shows Local on a coven's own entry and no status", () => {
      render(<IngredientCard {...BASE} kind="own" />);

      expect(localMark()).toBeInTheDocument();
      expect(screen.queryAllByRole('status')).toHaveLength(0);
    });

    // A coven's card says nothing of where a held
    // entry came from; the entry page and its head still do (EntryMarks' own tests).
    it('shows neither Compendium nor Annotated on a compendium entry the cupboard holds', () => {
      render(<IngredientCard {...BASE} kind="cupboard" />);

      expect(heldMark()).toBeNull();
      expect(screen.queryByRole('button', { name: 'Annotated' })).toBeNull();
      expect(screen.queryAllByRole('status')).toHaveLength(0);
    });

    it('shows Retired on a held entry the curators retired', () => {
      render(<IngredientCard {...BASE} kind="cupboard" retired />);

      expect(screen.queryAllByRole('status')).toHaveLength(0);
      expect(retiredMark()).toBeInTheDocument();
      expect(heldMark()).toBeNull();
    });
  });

  describe('the jar-line slot', () => {
    it('renders what the caller passes, M9.8 stock badges included, inside the card', () => {
      render(
        <IngredientCard {...BASE} kind="own">
          <ul aria-label="Jars">
            <li>
              <StockBadge quantity={6} threshold={10} unit="g" />
            </li>
          </ul>
        </IngredientCard>,
      );

      const jars = screen.getByRole('list', { name: 'Jars' });
      // Low and Out are each a button named for the state, and a healthy jar draws nothing.
      expect(within(jars).getAllByRole('button', { name: /^Low Stock/ })).toHaveLength(1);
    });
  });
});

// The foot's actions are the caller's own buttons, kept as controls beside
// the card's one link.
describe('IngredientCard actions', () => {
  it('draws the given buttons in the card, beside the name link', () => {
    render(<IngredientCard {...BASE} actions={<button type="button">Fixture Use</button>} />);
    expect(screen.getByRole('button', { name: 'Fixture Use' })).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('draws start controls alone, or beside the actions', () => {
    const { rerender } = render(
      <IngredientCard {...BASE} startActions={<button type="button">Fixture Start</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Fixture Start' })).toBeTruthy();
    rerender(
      <IngredientCard
        {...BASE}
        startActions={<button type="button">Fixture Start</button>}
        actions={<button type="button">Fixture Use</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Fixture Start' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fixture Use' })).toBeTruthy();
  });

  it('draws no foot without actions or jar lines', () => {
    render(<IngredientCard {...BASE} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

// The name link is the card's one way onward, and the page it leads to draws
// its own frame while it loads: the card names that page by the address.
describe('IngredientCard navigation', () => {
  let target: unknown;
  function Probe() {
    const state = useNavigationState();
    useEffect(() => {
      target = state.target;
    });
    return null;
  }
  let arrive = () => {};
  const arrives = () =>
    new Promise<void>((resolve) => {
      arrive = resolve;
    });
  beforeEach(() => {
    router.push.mockReset();
    target = undefined;
  });
  afterEach(async () => {
    await act(async () => arrive());
  });

  it('presses through to a compendium entry as a main page with its jump menu', async () => {
    render(
      <Navigating push={router.push} arrives={arrives()}>
        <IngredientCard {...BASE} />
        <Probe />
      </Navigating>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Fixture Testwort' }), { button: 0 });
    });
    expect(router.push.mock.calls[0]?.[0]).toBe(HREF);
    expect(target).toEqual({ region: 'main', shape: 'page', frame: 'entry', head: 'eyebrow' });
  });

  it("presses through to a coven's entry as a coven page with its jump menu", async () => {
    render(
      <Navigating push={router.push} arrives={arrives()}>
        <IngredientCard
          {...BASE}
          href={'/coven/fixture-coven/ingredients/some-id' as Route}
          kind="own"
        />
        <Probe />
      </Navigating>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Fixture Testwort' }), { button: 0 });
    });
    expect(target).toEqual({ region: 'coven', shape: 'page', frame: 'entry', head: 'eyebrow' });
  });
});

describe('IngredientCard recency (MB.106)', () => {
  it.each([['new', 'New']] as const)('shows %s as text on a compendium entry', (recency, shown) => {
    render(<IngredientCard {...BASE} kind="compendium" recency={recency} />);

    expect(screen.getByText(shown, { exact: true })).toBeInTheDocument();
  });

  // The safety badge is the card's top-right corner and the mark sits just left of it
  // , so it is read after the name block and before it.
  it('reads the mark after the name and the formal name, and before the safety badge', () => {
    render(
      <IngredientCard
        {...BASE}
        kind="compendium"
        recency="new"
        formalName="Fixtura testalis"
        safetyNotes="Fixture entry caution."
      />,
    );
    const order = [
      screen.getByRole('link', { name: /Fixture Testwort/ }),
      screen.getByText('Fixtura testalis'),
      screen.getByText('New', { exact: true }),
      cautionMark(),
    ];

    for (const [at, mark] of order.slice(1).entries()) {
      expect(
        order[at]!.compareDocumentPosition(mark!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it('shows neither with no recency', () => {
    render(<IngredientCard {...BASE} kind="compendium" recency={null} />);

    expect(screen.queryByText('New', { exact: true })).toBeNull();
    expect(screen.queryByText('Updated', { exact: true })).toBeNull();
  });
});

describe('IngredientCard last edit (M6.18)', () => {
  const AT = '2026-09-01T10:30:00.000Z';

  it('shows the latest edit when given one, holding its moment', () => {
    const { container } = render(
      <IngredientCard {...BASE} kind="own" lastEdit={{ by: 'Fixture A', at: AT }}>
        <p>Jar line.</p>
      </IngredientCard>,
    );

    expect(container.querySelector('time')).toHaveAttribute('datetime', AT);
    expect(container).toHaveTextContent('Fixture A');
  });

  it('shows the edit on a card with no jar lines or actions', () => {
    const { container } = render(
      <IngredientCard {...BASE} kind="own" lastEdit={{ by: null, at: AT }} />,
    );

    expect(container.querySelector('time')).toHaveAttribute('datetime', AT);
  });

  it('draws no time with no edit', () => {
    const { container } = render(<IngredientCard {...BASE} kind="own" lastEdit={null} />);

    expect(container.querySelector('time')).toBeNull();
  });
});
