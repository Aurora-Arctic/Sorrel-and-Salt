import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectSummaryLinksTo } from '../../support/error-summary';
import { waitFor } from '../../support/ingredient-form';
import { press } from '../../support/interact';
import { pickCategory, renderCategoriesField } from './field-harness';

// The Categories field of a form (claude-docs/components/ingredient-form.md, "The categories").

const box = () => screen.getByRole('combobox', { name: 'Category' });
const removeButton = (name: string) => screen.getByRole('button', { name: `Remove ${name}` });

describe('CategoriesField', () => {
  it('lands an issue on one pick on the picker’s error element, naming the pick, until it is taken out', async () => {
    renderCategoriesField({ issue: { path: 'categoryIds.1', message: 'No such category' } });

    await pickCategory('Testward');
    await pickCategory('Fixture Shield');
    press('Save');

    await waitFor(() => expect(box()).toBeInvalid());
    expect(box()).toHaveAccessibleDescription(/\S/);
    expectSummaryLinksTo(box());
    expect(box()).toHaveAccessibleDescription(expect.stringContaining('Fixture Shield'));
    expect(removeButton('Fixture Shield')).toHaveAccessibleDescription(
      expect.stringContaining('Fixture Shield'),
    );
    expect(removeButton('Testward')).not.toHaveAccessibleDescription(
      expect.stringContaining('Fixture Shield'),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(removeButton('Fixture Shield'));
    await waitFor(() => expect(box()).not.toBeInvalid());
  });
});
