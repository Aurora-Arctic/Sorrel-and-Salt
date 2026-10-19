import type { Route } from 'next';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigationState } from '@/lib/navigation';
import { Navigating } from '../../support/navigating';
import IngredientCard from '@/components/IngredientCard';
import { CATEGORY_CHIP_LIMIT } from '@/components/CategoryChips/constants';
import { StockBadge } from '@/components/StockBadge';

// M8.14 (claude-docs/components/ingredient-card.md): the card is presentational,
// so each case is its props in and what rendered out. The names, forms and
// notes are the test's own data. Marks are found by their exact text and
// asserted by presence or absence, never by what the words say.

// The name link navigates through the shared hook (M12.33), so the App Router is mocked.
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
  it('holds the LinkHint in its name link, leaving the link named by the label alone', () => {
    const { container } = render(<IngredientCard {...BASE} />);
    const link = screen.getByRole('link', { name: 'Fixture Testwort' });
    expect(link.querySelector('.link-hint')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.link-hint')).toHaveLength(1);
  });

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

  it('shows no formal name and no forms for an entry with neither', () => {
    render(<IngredientCard {...BASE} formalName={null} variants={[]} />);

    expect(screen.queryByText('Fixtura testalis')).toBeNull();
    expect(screen.queryByText('Testleaf')).toBeNull();
  });

  describe('the category chips', () => {
    const GROUP = { colorDark: '#112233', colorLight: '#445566' };
    const CATS = [
      { category: { id: 'c1', name: 'Testing' }, group: GROUP },
      { category: { id: 'c2', name: 'Fixturing' }, group: GROUP },
    ];

    it('lists each category as plain text, not a link', () => {
      render(<IngredientCard {...BASE} categories={CATS} />);

      const list = screen.getByRole('list', { name: 'Categories' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
      expect(within(list).getByText('Testing')).toBeInTheDocument();
      expect(within(list).queryByRole('link')).toBeNull();
      expect(within(list).queryByRole('button')).toBeNull();
    });

    it('draws no row for an entry with none', () => {
      render(<IngredientCard {...BASE} categories={[]} />);

      expect(screen.queryByRole('list', { name: 'Categories' })).toBeNull();
    });
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

    it('shows no caution badge for blank or whitespace notes', () => {
      render(
        <IngredientCard
          {...BASE}
          safetyNotes="   "
          variants={[LEAF, { ...ROOT, safetyNotes: '\n ' }]}
        />,
      );

      expect(cautionMark()).toBeNull();
    });

    it('shows Toxic without Caution when nothing has notes, and both when both apply', () => {
      const bare = render(<IngredientCard {...BASE} toxic variants={[LEAF]} />);
      expect(toxicMark()).not.toBeNull();
      expect(cautionMark()).toBeNull();
      bare.unmount();

      render(<IngredientCard {...BASE} toxic variants={[OIL]} />);
      expect(toxicMark()).not.toBeNull();
      expect(cautionMark()).not.toBeNull();
    });

    it('draws no caution block, even when a listed form has notes', () => {
      render(<IngredientCard {...BASE} variants={[OIL]} />);

      expect(screen.queryByRole('region')).toBeNull();
      expect(screen.queryByText('Fixture oil caution.')).toBeNull();
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

    it('shows none on a compendium entry the cupboard does not hold', () => {
      render(<IngredientCard {...BASE} kind="compendium" />);

      expect(localMark()).toBeNull();
      expect(heldMark()).toBeNull();
      expect(retiredMark()).toBeNull();
      expect(toxicMark()).toBeNull();
      expect(screen.queryAllByRole('status')).toHaveLength(0);
    });

    it('shows the held mark, and Annotated in its place once a field is overridden', () => {
      const held = render(<IngredientCard {...BASE} kind="cupboard" />);
      expect(heldMark()).toBeInTheDocument();
      expect(screen.getAllByRole('status')).toHaveLength(1);
      held.unmount();

      render(<IngredientCard {...BASE} kind="cupboard" annotated />);
      expect(screen.getByRole('button', { name: 'Annotated' })).toBeInTheDocument();
      expect(heldMark()).toBeNull();
      expect(screen.queryAllByRole('status')).toHaveLength(0);
    });

    it('shows the retired mark in place of the held one', () => {
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
            <li>
              <StockBadge quantity={0} threshold={10} unit="g" />
            </li>
            <li>
              <StockBadge quantity={50} threshold={10} unit="g" />
            </li>
          </ul>
        </IngredientCard>,
      );

      const jars = screen.getByRole('list', { name: 'Jars' });
      // Low is a button, Out is plain text, and a healthy jar draws nothing.
      expect(within(jars).getAllByRole('button', { name: /^Low Stock/ })).toHaveLength(1);
      expect(within(jars).getAllByText('Out of Stock')).toHaveLength(1);
    });

    it('renders nothing for the slot when the caller passes none', () => {
      render(<IngredientCard {...BASE} />);

      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByText('Out of Stock')).toBeNull();
    });
  });
});

// M8.14: the foot's actions are the caller's own buttons, kept as controls beside
// the card's one link.
describe('IngredientCard actions', () => {
  it('draws the given buttons in the card, beside the name link', () => {
    render(<IngredientCard {...BASE} actions={<button type="button">Fixture Use</button>} />);
    expect(screen.getByRole('button', { name: 'Fixture Use' })).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('draws no foot without actions or jar lines', () => {
    render(<IngredientCard {...BASE} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

// The name link is the card's one way onward, and the page it leads to draws
// its own frame while it loads (M12.33): the card names that page by the address.
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
    expect(target).toEqual({ region: 'main', shape: 'page', frame: 'with-nav' });
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
    expect(target).toEqual({ region: 'coven', shape: 'page', frame: 'with-nav' });
  });
});
