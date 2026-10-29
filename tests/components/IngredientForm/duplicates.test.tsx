import type { Route } from 'next';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Modal, { RouteModal, RouteModalProvider } from '@/components/Modal';
import { DETAILS_PLACE } from '@/components/IngredientEntry/details';
import { NameField, useDuplicateWarning } from '@/components/IngredientForm/duplicates';
import type { DuplicateQuickLookQuery, DuplicateQuickLookQueryVariables } from '@/gql/graphql';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { ADDED_HOLD_MS } from '@/components/AddIcon';
import { renderWithClient, duplicateHref } from '../../support/ingredient-form';
import { Navigating } from '../../support/navigating';
import { press, typeIn } from '../../support/interact';
import { graphqlLink, mockGraphQLError, mockGraphQLQuery } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';
import {
  WORKSPACE_ID,
  offerCompendiumMatches,
  offerDuplicates,
} from '../../support/msw/ingredient-lookups';
import type { DuplicateNode } from './types';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The duplicate warning on its own: `useDuplicateWarning` and the `NameField` that draws it, in a form whose save asks the warning's `check` before it sends, as the form's does.
// What only the whole form does with it (the focus on Create Anyway, Save busy while it checks, an error elsewhere first) is index.test.tsx's (claude-docs/components/ingredient-form.md, "Testing").

const TOMENTOSA: DuplicateNode = {
  id: 'claw-1',
  name: "Cat's Claw",
  canonicalName: 'Uncaria tomentosa',
  slug: 'cats-claw-uncaria-tomentosa',
};
const FELIS: DuplicateNode = {
  id: 'claw-2',
  name: "Cat's Claw",
  canonicalName: 'Felis catus',
  slug: 'cats-claw-felis-catus',
};
const MOCKLEAF: DuplicateNode = {
  id: 'mock-1',
  name: 'Mockleaf',
  canonicalName: null,
  slug: 'mockleaf',
};

/**
 * The name field and its warning; a save the warning does not hold calls `sent` with the name. `opened` is an edited entry's name.
 * `cupboard: false` is the admin's form; `look` gives each match a Quick Look; `inModal` stands the form in a dialog, as the Add Ingredient modal holds it.
 */
function renderName(
  opened?: string,
  {
    cupboard = true,
    look = false,
    inModal = false,
    routed = false,
  }: { cupboard?: boolean; look?: boolean; inModal?: boolean; routed?: boolean } = {},
) {
  const sent = vi.fn();
  const used = vi.fn();
  const Harness = () => {
    const methods = useForm<IngredientFormValues>({
      defaultValues: { ...EMPTY_VALUES, name: opened ?? '' },
    });
    const warning = useDuplicateWarning(
      WORKSPACE_ID,
      useWatch({ control: methods.control, name: 'name' }),
      undefined,
      opened,
    );
    const form = (
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(async ({ name }) => {
            if (!(await warning.check(name))) sent(name);
          })}
        >
          {/* No ref: moving the focus to Create Anyway is the form's. */}
          <NameField
            warning={warning}
            hrefOf={duplicateHref}
            onUse={cupboard ? used : undefined}
            workspaceId={cupboard ? WORKSPACE_ID : undefined}
            quickLookOf={look ? quickLookOf : undefined}
            ref={null}
          />
          <button type="submit">Save Ingredient</button>
        </form>
      </FormProvider>
    );
    return inModal ? (
      <Modal title="Add Ingredient" onClose={closedForm}>
        {form}
      </Modal>
    ) : (
      form
    );
  };
  renderWithClient(
    routed ? (
      // The admin page's: the details' own place beneath the form's modal.
      <Navigating push={router.push}>
        <RouteModalProvider>
          <RouteModal
            place={DETAILS_PLACE}
            closeHref="/admin/compendium?new=ingredient-compendium"
          />
          <Harness />
        </RouteModalProvider>
      </Navigating>
    ) : (
      <Harness />
    ),
  );
  return Object.assign(sent, { used });
}

/** The Add Ingredient dialog's own close, which a Quick Look's Escape must never ask. */
const closedForm = vi.fn();

/** A match's Quick Look, as the admin form's caller builds it: its details over the list. */
const quickLookOf = (match: { slug: string; name: string }) => ({
  href: `/admin/compendium?entry=${match.slug}&new` as Route,
  heading: { title: match.name },
});

/** A compendium match's +, named as the card's plus is. */
const ADD = /^Add to My Ingredients: /;

const name = () => screen.getByRole('textbox', { name: 'Name' });
/** Types into the Name box, the one field here. */
const type = (value: string) => typeIn(name(), value);
const save = () => press('Save Ingredient');
const warning = () => screen.getByRole('status', { name: 'Possible duplicates' });
const createAnyway = () => screen.queryByRole('button', { name: 'Create Anyway' });
/** The region once its last rows have faded: they leave on the slide's net, and the notice with them. */
const emptied = async () => {
  await act(() => vi.advanceTimersByTimeAsync(600));
  expect(warning()).toHaveTextContent('');
};
/** Lets a save that may have started reach its end. */
const settleSave = () => act(() => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});
const settle = () => act(() => vi.advanceTimersByTime(DEBOUNCE_MS));

describe('NameField, with useDuplicateWarning', () => {
  it('asks once the name settles, with the whole name trimmed, about this coven', async () => {
    renderName();
    const calls = offerDuplicates([]);

    type('C');
    type('Cats Claw ');
    act(() => vi.advanceTimersByTime(DEBOUNCE_MS - 1));
    expect(calls).toHaveLength(0);

    settle();
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ workspaceId: WORKSPACE_ID, name: 'Cats Claw', first: 3 });
  });

  it('marks the name busy while its answer is out, and no longer once it lands', async () => {
    renderName();
    offerDuplicates([TOMENTOSA]);
    // The answer held until the busy name is seen: it otherwise lands with the
    // check, and its rows mount outside any act().
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    server.use(graphqlLink.query('PossibleDuplicates', () => answered));
    expect(name()).not.toHaveAttribute('aria-busy');

    type('Cats Claw');
    settle();
    await waitFor(() => expect(name()).toHaveAttribute('aria-busy', 'true'));

    answer();
    await within(warning()).findByRole('link');
    expect(name()).not.toHaveAttribute('aria-busy');
  });

  it('asks nothing for a blank name, and drops the warning the last name had', async () => {
    renderName();
    const calls = offerDuplicates([TOMENTOSA]);
    type('Cats Claw');
    settle();
    await within(warning()).findByRole('link');

    type('   ');
    settle();

    await emptied();
    await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
    expect(calls).toHaveLength(1);
  });

  it('asks nothing for a single letter, and asks once a second is typed', async () => {
    renderName();
    const calls = offerDuplicates([TOMENTOSA]);
    type('C');
    settle();
    await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
    expect(calls).toHaveLength(0);
    await emptied();

    type('Ca');
    settle();
    await within(warning()).findByRole('link');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ workspaceId: WORKSPACE_ID, name: 'Ca', first: 3 });
  });

  // An edit that leaves the name alone asks nothing.
  it('asks nothing about the name an edit opened with, and lets its save through', async () => {
    // Answered before the form renders: an edit that asked on opening would ask at once.
    const calls = offerDuplicates([TOMENTOSA]);
    const sent = renderName("Cat's Claw");

    settle();
    save();
    await settleSave();

    expect(calls).toHaveLength(0);
    await emptied();
    expect(sent).toHaveBeenCalledWith("Cat's Claw");
  });

  it('warns once an edit changes the name', async () => {
    const calls = offerDuplicates([TOMENTOSA]);
    renderName('Mockleaf');

    type('Cats Claw');
    settle();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(await screen.findByRole('button', { name: 'Create Anyway' })).toBeInTheDocument();
  });

  it('warns at the opened name again once the name has been typed in', async () => {
    const calls = offerDuplicates([TOMENTOSA]);
    renderName("Cat's Claw");

    type("Cat's Cla");
    type("Cat's Claw");
    settle();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(await screen.findByRole('button', { name: 'Create Anyway' })).toBeInTheDocument();
  });

  // Each in a new tab, so the form and what is typed in it stay where they are.
  it('names each near match by its label and formal name, linked to the entry in a new tab', async () => {
    renderName();
    offerDuplicates([TOMENTOSA, FELIS, MOCKLEAF]);

    type('Cats Claw');
    settle();

    const tomentosa = await within(warning()).findByRole('link', {
      name: /^Cat's Claw \(Uncaria tomentosa\)/,
    });
    expect(tomentosa).toHaveAttribute('href', '/fixture/ingredients/claw-1');
    expect(tomentosa).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /^Cat's Claw \(Felis catus\)/ })).toHaveAttribute(
      'href',
      '/fixture/ingredients/claw-2',
    );
    expect(screen.getByRole('link', { name: /^Mockleaf/ })).toHaveAttribute(
      'href',
      '/fixture/ingredients/mock-1',
    );
    // Read with the field, as its hint is, and not an error until a save meets it.
    expect(name().getAttribute('aria-describedby')).toContain(warning().id);
    expect(name()).not.toBeInvalid();
  });

  it('warns of nothing when nothing is close, and lets the save through', async () => {
    const sent = renderName();
    const calls = offerDuplicates([]);

    type('Fixture Nothingalike');
    settle();
    await waitFor(() => expect(calls).toHaveLength(1));

    await emptied();
    expect(createAnyway()).not.toBeInTheDocument();
    save();
    await waitFor(() => expect(sent).toHaveBeenCalledWith('Fixture Nothingalike'));
  });

  it('holds a save while a match shows, as an error on the name, read with Create Anyway', async () => {
    const sent = renderName();
    offerDuplicates([TOMENTOSA]);

    type("Cat's Claw");
    settle();
    await within(warning()).findByRole('link');
    save();

    await waitFor(() => expect(name()).toBeInvalid());
    expect(name().getAttribute('aria-describedby')).toContain(warning().id);
    // The warning is read with the button, so the focus the form moves there says why.
    expect(createAnyway()).toHaveAccessibleDescription(
      expect.stringContaining("Cat's Claw (Uncaria tomentosa)"),
    );
    expect(sent).not.toHaveBeenCalled();

    // Again, and it holds again.
    save();
    await settleSave();
    expect(sent).not.toHaveBeenCalled();
  });

  // The notice turns from ochre to red when a save is held, which colour alone
  // does not tell: the words say it too.
  it('says in words that the save is on hold once it is, where a near match only asked a question', async () => {
    renderName();
    offerDuplicates([TOMENTOSA]);

    type("Cat's Claw");
    settle();
    await within(warning()).findByRole('link');
    expect(within(warning()).getByText('Did you mean one of these?')).toBeInTheDocument();
    expect(within(warning()).queryByText(/on hold/)).not.toBeInTheDocument();

    save();
    await waitFor(() => expect(name()).toBeInvalid());

    expect(within(warning()).queryByText('Did you mean one of these?')).not.toBeInTheDocument();
    expect(within(warning()).getByText(/save is on hold/)).toBeInTheDocument();
    // The same words are what the name and Create Anyway are described by.
    expect(createAnyway()).toHaveAccessibleDescription(expect.stringMatching(/save is on hold/));
  });

  // The region is in the page before the warning, as a live region must be to
  // be heard, and announces it; the notice inside takes no role of its own,
  // so it is not announced twice, held or not.
  it('announces the warning once, through a region in the page before it arrives', async () => {
    renderName();
    offerDuplicates([TOMENTOSA]);
    const region = warning();
    expect(region).toHaveTextContent('');
    const announcers = () => [
      ...screen.queryAllByRole('alert'),
      ...screen.queryAllByRole('status'),
    ];

    type("Cat's Claw");
    settle();
    await within(region).findByRole('link');
    expect(announcers()).toEqual([region]);

    save();
    await waitFor(() => expect(name()).toBeInvalid());
    expect(within(region).getByText(/save is on hold/)).toBeInTheDocument();
    expect(announcers()).toEqual([region]);
  });

  it('checks a name saved before its typing settles, and holds on what it finds', async () => {
    const sent = renderName();
    const calls = offerDuplicates([TOMENTOSA]);

    type("Cat's Claw ");
    save();

    // No wait for the debounce: the save asks about the name it is sending.
    await waitFor(() => expect(name()).toBeInvalid());
    expect(calls).toEqual([{ workspaceId: WORKSPACE_ID, name: "Cat's Claw", first: 3 }]);
    expect(within(warning()).getByRole('link')).toHaveAccessibleName(
      /^Cat's Claw \(Uncaria tomentosa\)/,
    );
    expect(sent).not.toHaveBeenCalled();
  });

  it('lifts the hold when the name changes, a new match only warning', async () => {
    const sent = renderName();
    offerDuplicates([TOMENTOSA]);
    type("Cat's Claw");
    settle();
    await within(warning()).findByRole('link');
    save();
    await waitFor(() => expect(name()).toBeInvalid());

    offerDuplicates([TOMENTOSA, FELIS]);
    type("Cat's Claws");
    settle();
    await within(warning()).findByRole('link', {
      name: /^Cat's Claw \(Felis catus\)/,
    });

    expect(name()).not.toBeInvalid();
    expect(sent).not.toHaveBeenCalled();
  });

  it('goes on Create Anyway, handing the focus back to the name, and the next save goes', async () => {
    const sent = renderName();
    offerDuplicates([TOMENTOSA]);

    type("Cat's Claw");
    settle();
    await within(warning()).findByRole('link');
    save();
    await waitFor(() => expect(name()).toBeInvalid());
    fireEvent.click(createAnyway() as HTMLElement);

    await emptied();
    expect(name()).toHaveFocus();
    expect(name()).not.toBeInvalid();
    save();
    await waitFor(() => expect(sent).toHaveBeenCalledWith("Cat's Claw"));
  });

  it('stays gone for the matches set aside, and returns for a new one', async () => {
    renderName();
    offerDuplicates([TOMENTOSA]);

    type("Cat's Claw");
    settle();
    await within(warning()).findByRole('link');
    fireEvent.click(createAnyway() as HTMLElement);

    // A longer name finding the same entry: already answered.
    const again = offerDuplicates([TOMENTOSA]);
    type("Cat's Claws");
    settle();
    await waitFor(() => expect(again).toHaveLength(1));
    await emptied();

    // One it has not been asked about.
    offerDuplicates([TOMENTOSA, FELIS]);
    type("Cat's Clawe");
    settle();
    const felis = await within(warning()).findByRole('link', {
      name: /^Cat's Claw \(Felis catus\)/,
    });
    expect(felis).toBeInTheDocument();
    expect(within(warning()).queryByRole('link', { name: /tomentosa/ })).not.toBeInTheDocument();
  });

  it('shows nothing, and lets the save through, when the lookup fails', async () => {
    const sent = renderName();
    mockGraphQLError('PossibleDuplicates', { code: 'FORBIDDEN' });

    type("Cat's Claw");
    settle();
    save();

    await waitFor(() => expect(sent).toHaveBeenCalledWith("Cat's Claw"));
    await emptied();
  });

  // An exact compendium name is a question, a near one a list, the + on both.
  describe('a compendium entry of the very name typed', () => {
    const CLAW = { ...TOMENTOSA, isGlobal: true };

    it('holds the save on a question, a row per entry with its link and its +, and Create Anyway', async () => {
      const sent = renderName();
      offerDuplicates([CLAW]);
      offerCompendiumMatches([CLAW]);

      type("Cat's Claw");
      save();

      const row = await within(warning()).findByRole('listitem');
      expect(within(row).getByRole('link')).toHaveAttribute('href', duplicateHref(CLAW));
      // The +, named as the card's plus is, and the row's only button.
      expect(within(row).getByRole('button')).toHaveAccessibleName(
        "Add to My Ingredients: Cat's Claw, Uncaria tomentosa",
      );
      expect(within(row).queryByRole('button', { name: /^Use It/ })).not.toBeInTheDocument();
      expect(createAnyway()).toBeInTheDocument();
      expect(sent).not.toHaveBeenCalled();
    });

    it('hands the entry whose + was pressed to the form, and sends nothing itself', async () => {
      const sent = renderName();
      offerDuplicates([CLAW]);
      offerCompendiumMatches([CLAW]);
      type("Cat's Claw");
      save();

      const plus = await screen.findByRole('button', { name: ADD });
      press(plus);

      expect(sent.used).toHaveBeenCalledWith(expect.objectContaining({ id: CLAW.id }));
      expect(sent).not.toHaveBeenCalled();
      // The form answered no add, so the + is back, with no check.
      await waitFor(() => expect(plus).not.toHaveAttribute('aria-busy'));
      expect(plus).not.toHaveAttribute('data-state');
    });

    it("lets the next save go once the question's Create Anyway is pressed", async () => {
      const sent = renderName();
      offerDuplicates([CLAW]);
      offerCompendiumMatches([CLAW]);
      type("Cat's Claw");
      save();
      press(await screen.findByRole('button', { name: 'Create Anyway' }));

      save();
      await settleSave();

      expect(sent).toHaveBeenCalledWith("Cat's Claw");
    });

    it('offers its Quick Look and no + for an entry the cupboard already holds', async () => {
      renderName();
      const held = { ...CLAW, inCupboard: true };
      offerDuplicates([held]);
      offerCompendiumMatches([held]);
      type("Cat's Claw");
      save();

      expect(
        await screen.findByRole('button', { name: "Quick Look Cat's Claw, Uncaria tomentosa" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^Open It/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: ADD })).not.toBeInTheDocument();
    });

    it('lists a near compendium match as a row with its link and its +, and asks no question', async () => {
      renderName();
      offerDuplicates([CLAW]);
      offerCompendiumMatches([]);
      type('Cats Claw');
      settle();

      const row = await within(warning()).findByRole('listitem');
      expect(within(row).getByRole('link', { name: /^Cat/ })).toHaveAttribute(
        'href',
        duplicateHref(CLAW),
      );
      expect(within(row).getByRole('button', { name: ADD })).toBeInTheDocument();
      expect(name()).not.toBeInvalid();
      expect(await screen.findByRole('button', { name: 'Create Anyway' })).toBeInTheDocument();
    });

    it("offers no + beside a coven's own entry", async () => {
      renderName();
      offerDuplicates([MOCKLEAF]);
      type('Mockleaff');
      settle();

      await screen.findByRole('link', { name: /Mockleaf/ });
      expect(screen.queryByRole('button', { name: ADD })).not.toBeInTheDocument();
    });
  });

  // Which matches the coven already holds, its own and the
  // compendium entries it has used, and which are in the compendium alone.
  describe('grouped by where each match is', () => {
    const UNUSED = { ...TOMENTOSA, isGlobal: true, inCupboard: false };
    const USED = { ...FELIS, isGlobal: true, inCupboard: true };
    const group = (heading: string) => within(warning()).queryByRole('list', { name: heading });
    const titlesIn = (list: HTMLElement) =>
      within(list)
        .getAllByRole('link', { name: /new tab/ })
        .map((link) => link.textContent?.replace(' (opens in a new tab)', ''));

    it('lists what the coven holds under In This Coven, then the rest under In the Compendium', async () => {
      renderName();
      offerDuplicates([UNUSED, MOCKLEAF, USED]);

      type('Cats Claw');
      settle();
      await within(warning()).findAllByRole('listitem');

      const coven = group('In This Coven');
      const compendium = group('In the Compendium');
      expect(coven).not.toBeNull();
      expect(compendium).not.toBeNull();
      // Its own entry and the compendium entry it has used, in the answer's order.
      expect(titlesIn(coven!)).toEqual(['Mockleaf', "Cat's Claw (Felis catus)"]);
      expect(titlesIn(compendium!)).toEqual(["Cat's Claw (Uncaria tomentosa)"]);
      expect(within(compendium!).getByRole('button', { name: ADD })).toBeInTheDocument();
      expect(within(coven!).getAllByRole('button', { name: /^Quick Look / })).toHaveLength(2);
      // The coven's first, each named by a heading beneath the form's section headings.
      expect(
        coven!.compareDocumentPosition(compendium!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'In This Coven', level: 4 })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'In the Compendium', level: 4 }),
      ).toBeInTheDocument();
    });

    it('keeps the heading of the one group there is, and draws no empty one', async () => {
      renderName();
      offerDuplicates([UNUSED]);

      type('Cats Claw');
      settle();
      await within(warning()).findByRole('listitem');

      expect(group('In the Compendium')).not.toBeNull();
      expect(group('In This Coven')).toBeNull();
      expect(screen.queryByRole('heading', { name: 'In This Coven' })).not.toBeInTheDocument();
    });

    it('groups the exact-name question the same way', async () => {
      renderName();
      offerDuplicates([UNUSED, USED]);
      offerCompendiumMatches([UNUSED, USED]);

      type("Cat's Claw");
      save();
      await within(warning()).findByText(/already has entries/);

      expect(titlesIn(group('In This Coven')!)).toEqual(["Cat's Claw (Felis catus)"]);
      expect(titlesIn(group('In the Compendium')!)).toEqual(["Cat's Claw (Uncaria tomentosa)"]);
    });

    // The admin's form has no coven: every match is the compendium's, and a
    // heading saying so would say nothing.
    it('draws one list with no heading where there is no cupboard', async () => {
      renderName(undefined, { cupboard: false });
      offerDuplicates([UNUSED, USED]);

      type('Cats Claw');
      settle();
      await within(warning()).findAllByRole('listitem');

      expect(within(warning()).getAllByRole('list')).toHaveLength(1);
      expect(within(warning()).queryByRole('heading')).not.toBeInTheDocument();
    });

    // In the admin's form every match, being the
    // compendium's, has its Quick Look, the details the admin's list opens.
    it('gives every match its Quick Look where the form has one, beside its linked name, and nothing to add it with', async () => {
      renderName(undefined, { cupboard: false, look: true });
      offerDuplicates([UNUSED, USED]);

      type('Cats Claw');
      settle();
      const rows = await within(warning()).findAllByRole('listitem');

      expect(rows).toHaveLength(2);
      expect(
        within(rows[0]!).getByRole('link', { name: "Quick Look Cat's Claw, Uncaria tomentosa" }),
      ).toHaveAttribute('href', quickLookOf(UNUSED).href);
      expect(
        within(rows[1]!).getByRole('link', { name: "Quick Look Cat's Claw, Felis catus" }),
      ).toHaveAttribute('href', quickLookOf(USED).href);
      // The name still links to the entry.
      expect(within(rows[0]!).getByRole('link', { name: /new tab/ })).toHaveAttribute(
        'href',
        duplicateHref(UNUSED),
      );
      expect(within(warning()).queryByRole('link', { name: /^Open It/ })).not.toBeInTheDocument();
      expect(
        within(warning())
          .getAllByRole('button')
          .map((button) => button.textContent),
      ).toEqual(['Create Anyway']);
    });

    // The form's eye opened its details without the loading state the
    // list's eye shows. A press opens them at once, over the form, under the entry's name and
    // loading, as the list's does, while the navigation is on its way.
    it("opens the details at once over the form, loading, as the list's Quick Look does", async () => {
      router.push.mockReset();
      renderName(undefined, { cupboard: false, look: true, inModal: true, routed: true });
      offerDuplicates([UNUSED]);

      type('Cats Claw');
      settle();
      const eye = await within(warning()).findByRole('link', {
        name: "Quick Look Cat's Claw, Uncaria tomentosa",
      });
      await act(async () => {
        fireEvent.click(eye);
      });

      expect(router.push).toHaveBeenCalledWith(quickLookOf(UNUSED).href);
      const details = screen.getByRole('dialog', { name: "Cat's Claw" });
      expect(details).toHaveAttribute('open');
      expect(details.querySelector('[aria-busy="true"]')).not.toBeNull();
      // The form stays open beneath.
      expect(screen.getByRole('dialog', { name: 'Add Ingredient', hidden: true })).toHaveAttribute(
        'open',
      );
    });
  });

  // The eye on every row the coven holds opens the entry's details over the form, read in the page, so nothing the form holds is lost to a navigation.
  // A compendium match's + once its add has worked shows AddIcon's check, held ADDED_HOLD_MS, then the eye on the same button, then the row moves under In This Coven.
  // What the form sends, its status-region words and a refusal are index.test.tsx's.
  describe('after the + has added', () => {
    const UNUSED = { ...TOMENTOSA, isGlobal: true, inCupboard: false };
    const QUICK_LOOK = /^Quick Look Cat's Claw, Uncaria tomentosa/;
    const heldRow = () =>
      within(screen.getByRole('list', { name: 'In This Coven' })).getByRole('link', {
        name: /^Cat's Claw \(Uncaria tomentosa\)/,
      });

    /** Finds Cat's Claw and presses its +, the add working and the server holding it from then on. */
    const addClaw = async () => {
      renderName().used.mockResolvedValue(true);
      offerDuplicates([UNUSED]);
      type('Cats Claw');
      settle();
      const plus = await screen.findByRole('button', { name: ADD });
      offerDuplicates([{ ...UNUSED, inCupboard: true }]);
      act(() => plus.focus());
      // The add answers at once: its updates land inside the act.
      await act(async () => {
        fireEvent.click(plus);
      });
      return plus;
    };

    // The test environment reports prefers-reduced-motion (tests/support/setup-dom.ts).
    it('under reduced motion, still shows the check for a moment, then the eye at once, with no fade between', async () => {
      const plus = await addClaw();

      await waitFor(() => expect(plus).toHaveAttribute('data-state', 'added'));
      // Still the +, named as it was, and pressing it now does nothing.
      expect(plus).toHaveAccessibleName(/^Add to My Ingredients: Cat's Claw/);
      expect(plus).toHaveAttribute('aria-disabled', 'true');
      act(() => vi.advanceTimersByTime(ADDED_HOLD_MS - 100));
      expect(plus).toHaveAttribute('data-state', 'added');

      act(() => vi.advanceTimersByTime(100));
      // The same button, so the focus stays on it: the eye, with no fade from the check.
      expect(plus).toHaveAccessibleName(QUICK_LOOK);
      expect(plus).not.toHaveAttribute('data-state');
      expect(plus).not.toHaveAttribute('aria-disabled');
    });

    describe('with motion', () => {
      beforeEach(() => {
        const media = window.matchMedia;
        vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
          ...media(query),
          matches: false,
        }));
      });
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('fades the check into the eye', async () => {
        const plus = await addClaw();

        await waitFor(() => expect(plus).toHaveAttribute('data-state', 'added'));
        act(() => vi.advanceTimersByTime(ADDED_HOLD_MS));
        expect(plus).toHaveAccessibleName(QUICK_LOOK);
        expect(plus).toHaveAttribute('data-state', 'returning');
        // The fade's end, or its net when no end is reported.
        act(() => vi.advanceTimersByTime(500));
        expect(plus).not.toHaveAttribute('data-state');
      });
    });

    it('moves the row under In This Coven only once the eye shows, the focus going to its eye, the duplicates busy meanwhile', async () => {
      const plus = await addClaw();

      await waitFor(() => expect(plus).toHaveAttribute('data-state', 'added'));
      // Not asked again while the check shows: the row stays under In the Compendium.
      await act(async () => {});
      expect(screen.queryByRole('list', { name: 'In This Coven' })).not.toBeInTheDocument();
      expect(warning()).not.toHaveAttribute('aria-busy');

      act(() => vi.advanceTimersByTime(ADDED_HOLD_MS));
      expect(warning()).toHaveAttribute('aria-busy', 'true');
      await waitFor(() => expect(heldRow()).toBeInTheDocument());
      const eye = within(screen.getByRole('list', { name: 'In This Coven' })).getByRole('button', {
        name: QUICK_LOOK,
      });
      expect(eye).not.toBe(plus);
      expect(eye).toHaveFocus();
      await waitFor(() => expect(warning()).not.toHaveAttribute('aria-busy'));
    });

    it('leaves the focus where it was moved to while the check showed', async () => {
      const plus = await addClaw();

      await waitFor(() => expect(plus).toHaveAttribute('data-state', 'added'));
      act(() => name().focus());
      act(() => vi.advanceTimersByTime(ADDED_HOLD_MS));
      await waitFor(() => expect(heldRow()).toBeInTheDocument());
      expect(name()).toHaveFocus();
    });
  });

  describe("a held match's Quick Look", () => {
    const UNUSED = { ...TOMENTOSA, isGlobal: true, inCupboard: false };
    const USED = { ...FELIS, isGlobal: true, inCupboard: true };
    const LOOKED: DuplicateQuickLookQuery['ingredient'] = {
      id: USED.id,
      name: "Cat's Claw",
      canonicalName: 'Felis catus',
      nomenclature: 'zoological',
      description: 'An invented claw, for the tests.',
      safetyNotes: null,
      toxic: false,
      isGlobal: true,
      retired: false,
      reviewedAt: null,
      elements: ['fire'],
      celestialBodies: [],
      zodiacSigns: [],
      colors: [],
      audit: { createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z' },
      // The coven's own say, laid over the compendium's as its page lays it.
      cupboardEntry: {
        label: null,
        description: "The coven's own note on it.",
        safetyNotes: null,
        elements: null,
        celestialBodies: null,
        zodiacSigns: null,
        colors: null,
      },
      folkNames: [{ name: 'Whiskerroot' }],
      categories: [],
      deities: [],
      variants: [
        {
          id: 'claw-2-dried',
          form: 'dried',
          safetyNotes: null,
          toxic: false,
          formChoice: null,
        },
      ],
      stock: [
        {
          id: 'jar-1',
          variant: { id: 'claw-2-dried' },
          quantityOnHand: 3,
          unit: 'g',
          lowStockThreshold: null,
        },
      ],
    };
    /** Answers the Quick Look's read with `LOOKED`, recording each ask. */
    const offerLook = () => {
      const calls: DuplicateQuickLookQueryVariables[] = [];
      mockGraphQLQuery<DuplicateQuickLookQuery, DuplicateQuickLookQueryVariables>(
        'DuplicateQuickLook',
        (variables) => {
          calls.push(variables);
          return { ingredient: LOOKED };
        },
      );
      return calls;
    };
    const eye = () => screen.getByRole('button', { name: "Quick Look Cat's Claw, Felis catus" });
    const look = () => screen.getByRole('dialog', { name: "Cat's Claw" });
    /** Types a near name and waits for its rows. */
    const warned = async () => {
      offerDuplicates([UNUSED, MOCKLEAF, USED]);
      type('Cats Claw');
      settle();
      await within(warning()).findAllByRole('listitem');
    };

    it('gives each row the coven holds its eye in place of Open It, its own entries too, and the rest none', async () => {
      renderName();
      await warned();

      const coven = within(warning()).getByRole('list', { name: 'In This Coven' });
      const compendium = within(warning()).getByRole('list', { name: 'In the Compendium' });
      expect(within(coven).getAllByRole('button')).toEqual([
        within(coven).getByRole('button', { name: 'Quick Look Mockleaf' }),
        within(coven).getByRole('button', { name: "Quick Look Cat's Claw, Felis catus" }),
      ]);
      expect(within(compendium).queryByRole('button', { name: /^Quick Look/ })).toBeNull();
      expect(within(warning()).queryByRole('link', { name: /^Open It/ })).toBeNull();
      // The name still links to the entry.
      expect(within(coven).getByRole('link', { name: /Felis catus/ })).toHaveAttribute(
        'href',
        duplicateHref(USED),
      );
    });

    it('opens the details over the form at once, loading, then reads them in the coven', async () => {
      const calls = offerLook();
      renderName();
      await warned();

      press(eye());

      // Open on the press, under the row's name, while the read is out.
      expect(look()).toHaveAttribute('open');
      expect(within(look()).queryByText("The coven's own note on it.")).toBeNull();
      expect(look().querySelector('[aria-busy="true"]')).not.toBeNull();
      // Under the head the details will have, its formal name over the name, as the
      // list's own Quick Look opens, so nothing jumps when they arrive.
      expect(within(look()).getByText(/^Felis catus/)).toBeInTheDocument();

      expect(await within(look()).findByText("The coven's own note on it.")).toBeInTheDocument();
      expect(calls).toEqual([{ id: USED.id, workspaceId: WORKSPACE_ID }]);
      expect(look().querySelector('[aria-busy="true"]')).toBeNull();
      expect(within(look()).getByText('Whiskerroot')).toBeInTheDocument();
      // The page's link, in a new tab, so the form stays as it is.
      const page = within(look()).getByRole('link', { name: /^See in Your Cupboard/ });
      expect(page).toHaveAttribute('href', duplicateHref(USED));
      expect(page).toHaveAttribute('target', '_blank');
      // Outside the live region, which would otherwise read the details out as a status.
      expect(warning()).not.toContainElement(look());
    });

    // The curators' review mark shows to everyone.
    it('says in its head whether a curator has reviewed the entry, and when', async () => {
      mockGraphQLQuery<DuplicateQuickLookQuery, DuplicateQuickLookQueryVariables>(
        'DuplicateQuickLook',
        () => ({ ingredient: { ...LOOKED, reviewedAt: '2026-10-01T09:30:00.000Z' } }),
      );
      renderName();
      await warned();
      press(eye());

      const badge = await within(look()).findByText(/Reviewed By Curator/);
      expect(badge.querySelector('time')).toHaveAttribute('datetime', '2026-10-01T09:30:00.000Z');
      expect(within(look()).queryByText('Needs Review')).toBeNull();
    });

    it('says so when the read fails, and reads again on Try Again', async () => {
      mockGraphQLError('DuplicateQuickLook', { code: 'NOT_FOUND', message: 'No such ingredient' });
      renderName();
      await warned();
      press(eye());

      expect(await within(look()).findByRole('alert')).toHaveTextContent('No such ingredient');

      offerLook();
      press(within(look()).getByRole('button', { name: 'Try Again' }));

      expect(await within(look()).findByText("The coven's own note on it.")).toBeInTheDocument();
      expect(within(look()).queryByRole('alert')).toBeNull();
    });

    it("closes alone on Escape, over the form's dialog, the focus back on its eye and the name as typed", async () => {
      offerLook();
      closedForm.mockClear();
      renderName(undefined, { inModal: true });
      await warned();
      press(eye());
      await within(look()).findByText("The coven's own note on it.");

      fireEvent(look(), new Event('cancel', { cancelable: true }));

      await waitFor(() => expect(screen.queryByRole('dialog', { name: "Cat's Claw" })).toBeNull());
      expect(closedForm).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog', { name: 'Add Ingredient' })).toHaveAttribute('open');
      expect(eye()).toHaveFocus();
      expect(name()).toHaveValue('Cats Claw');
    });
  });
});
