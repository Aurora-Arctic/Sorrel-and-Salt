import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NameField, useDuplicateWarning } from '@/components/IngredientForm/duplicates';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { renderWithClient, duplicateHref } from '../../support/ingredient-form';
import { press, typeIn } from '../../support/interact';
import { mockGraphQLError } from '../../support/msw/graphql';
import {
  WORKSPACE_ID,
  offerCompendiumMatches,
  offerDuplicates,
} from '../../support/msw/ingredient-lookups';
import type { DuplicateNode } from './types';

// Story 16's warning on its own (MB.181): `useDuplicateWarning` and the
// `NameField` that draws it, in a form whose save asks the warning's `check`
// before it sends, as the form's does. What only the whole form does with it
// — the focus on Create Anyway, Save busy while it checks, an error elsewhere
// first — is index.test.tsx's (claude-docs/components/ingredient-form.md,
// "Testing").

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
 * The name field and its warning; a save that the warning does not hold calls
 * `sent` with the name. `opened` is an edited entry's name, as the form opens with it.
 */
function renderName(opened?: string) {
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
    return (
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(async ({ name }) => {
            if (!(await warning.check(name))) sent(name);
          })}
        >
          {/* No ref: moving the focus to Create Anyway is the form's. */}
          <NameField warning={warning} hrefOf={duplicateHref} onUse={used} ref={null} />
          <button type="submit">Save Ingredient</button>
        </form>
      </FormProvider>
    );
  };
  renderWithClient(<Harness />);
  return Object.assign(sent, { used });
}

const name = () => screen.getByRole('textbox', { name: 'Name' });
/** Types into the Name box, the one field here. */
const type = (value: string) => typeIn(name(), value);
const save = () => press('Save Ingredient');
const warning = () => screen.getByRole('status', { name: 'Possible duplicates' });
const createAnyway = () => screen.queryByRole('button', { name: 'Create Anyway' });
/**
 * The region once its last rows have faded: they leave on the slide's net,
 * and the notice with them.
 */
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
    expect(name()).not.toHaveAttribute('aria-busy');

    type('Cats Claw');
    settle();
    await waitFor(() => expect(name()).toHaveAttribute('aria-busy', 'true'));

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

  // MB.115, the owner's call: an edit that leaves the name alone asks nothing.
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
  // does not tell (MB.120): the words say it too.
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
  // so it is not announced twice, held or not (M12.48).
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

  // A list or a button inside a paragraph is invalid, and so is anything but
  // phrasing content inside an `<output>` (M12.48).
  it('draws the warning, its list and Create Anyway, in valid markup', async () => {
    renderName();
    offerDuplicates([TOMENTOSA]);

    type("Cat's Claw");
    settle();
    await within(warning()).findByRole('link');
    save();
    await waitFor(() => expect(createAnyway()).toBeInTheDocument());

    expect(within(warning()).getByRole('list')).toBeInTheDocument();
    expect(
      document.body.querySelector(
        'p ul, p li, p button, p div, p p, output ul, output div, output p',
      ),
    ).toBeNull();
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

  // M12.20: an exact compendium name is a question, a near one a list, Use It on both.
  describe('a compendium entry of the very name typed', () => {
    const CLAW = { ...TOMENTOSA, isGlobal: true };

    it('holds the save on a question, a row per entry with its link and Use It, and Create Anyway', async () => {
      const sent = renderName();
      offerDuplicates([CLAW]);
      offerCompendiumMatches([CLAW]);

      type("Cat's Claw");
      save();

      const row = await within(warning()).findByRole('listitem');
      expect(within(row).getByRole('link')).toHaveAttribute('href', duplicateHref(CLAW));
      expect(within(row).getByRole('button', { name: /^Use It/ })).toBeInTheDocument();
      expect(createAnyway()).toBeInTheDocument();
      expect(sent).not.toHaveBeenCalled();
    });

    it('hands the entry chosen to Use It, and sends nothing itself', async () => {
      const sent = renderName();
      offerDuplicates([CLAW]);
      offerCompendiumMatches([CLAW]);
      type("Cat's Claw");
      save();

      press(await screen.findByRole('button', { name: /^Use It/ }));

      expect(sent.used).toHaveBeenCalledWith(expect.objectContaining({ id: CLAW.id }));
      expect(sent).not.toHaveBeenCalled();
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

    it('offers Open It and no Use It for an entry the cupboard already holds', async () => {
      renderName();
      const held = { ...CLAW, inCupboard: true };
      offerDuplicates([held]);
      offerCompendiumMatches([held]);
      type("Cat's Claw");
      save();

      expect(await screen.findByRole('link', { name: /^Open It/ })).toHaveAttribute(
        'href',
        duplicateHref(held),
      );
      expect(screen.queryByRole('button', { name: /^Use It/ })).not.toBeInTheDocument();
    });

    it('lists a near compendium match as a row with its link and Use It, and asks no question', async () => {
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
      expect(within(row).getByRole('button', { name: /^Use It/ })).toBeInTheDocument();
      expect(name()).not.toBeInvalid();
      expect(await screen.findByRole('button', { name: 'Create Anyway' })).toBeInTheDocument();
    });

    it("offers no Use It beside a coven's own entry", async () => {
      renderName();
      offerDuplicates([MOCKLEAF]);
      type('Mockleaff');
      settle();

      await screen.findByRole('link', { name: /Mockleaf/ });
      expect(screen.queryByRole('button', { name: /^Use It/ })).not.toBeInTheDocument();
    });
  });
});
