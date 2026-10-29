import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FormIcon from '@/components/FormIcon';
import { FORM_GROUP_ICONS, type FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

// The mark beside a form (claude-docs/components/form-icon.md): one
// icon per form-group icon name, and the generic salt spoon where a form has
// none — a group without an icon, an uncurated form, or a name the component
// does not know. Decorative, since the form's name always stands beside it.

/** What one render draws: the SVG's markup, which is the one thing an icon can be told apart by. */
const drawing = (name: Parameters<typeof FormIcon>[0]['name']): string => {
  const { container, unmount } = render(<FormIcon name={name} />);
  const svg = container.querySelector('svg');
  expect(svg).not.toBeNull();
  expect(svg).toHaveAttribute('aria-hidden', 'true');
  const markup = svg!.innerHTML;
  unmount();
  return markup;
};

describe('FormIcon', () => {
  it('draws a different icon for each of the six names', () => {
    const drawings = FORM_GROUP_ICONS.map(drawing);

    expect(new Set(drawings).size).toBe(FORM_GROUP_ICONS.length);
    expect(drawings.every((markup) => markup.length > 0)).toBe(true);
  });

  it('draws the generic spoon for null and for a name it does not know, and for nothing else', () => {
    const spoon = drawing(null);
    // Cast: a name outside the six is what an older client, or a value the
    // enum gained after this build, could hand over.
    const unknown = drawing('ectoplasm' as FormGroupIcon);

    expect(spoon.length).toBeGreaterThan(0);
    expect(unknown).toBe(spoon);
    for (const name of FORM_GROUP_ICONS) {
      expect(drawing(name)).not.toBe(spoon);
    }
  });
});
