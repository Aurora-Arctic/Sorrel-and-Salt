import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '@/components/DocumentPage/markdown';
import { helpTerms } from '@/lib/help-marks';

// A help body's widget tags: a paragraph that is one `::widget[name]` tag draws the widget the page hands the renderer
// for that name. A caller that hands none (the form's preview, a site document) keeps the tag as the text it is.

const widgets = {
  'unit-converter': <section aria-label="Testwort Converter" />,
};

function draw(body: string, given: typeof widgets | null = widgets) {
  const { content } = renderMarkdown(body, {}, [], false, helpTerms([]), given ?? undefined);
  return render(<div>{content}</div>);
}

describe('renderMarkdown widget tags in a help body', () => {
  it('draws the widget a paragraph of its own names, in place of the tag', () => {
    draw('Before.\n\n::widget[unit-converter]\n\nAfter.');

    expect(screen.getByRole('region', { name: 'Testwort Converter' })).toBeInTheDocument();
    expect(screen.queryByText('::widget[unit-converter]')).toBeNull();
    expect(screen.getByText('Before.')).toBeInTheDocument();
    expect(screen.getByText('After.')).toBeInTheDocument();
  });

  it('keeps a tag inside a sentence as text', () => {
    draw('Type ::widget[unit-converter] here.');

    expect(screen.queryByRole('region', { name: 'Testwort Converter' })).toBeNull();
    expect(screen.getByText('Type ::widget[unit-converter] here.')).toBeInTheDocument();
  });

  it('keeps a tag naming a widget the page did not hand over as text', () => {
    draw('::widget[role-permission-table]');

    expect(screen.getByText('::widget[role-permission-table]')).toBeInTheDocument();
  });

  it('keeps every tag as text when the caller hands no widgets', () => {
    draw('::widget[unit-converter]', null);

    expect(screen.queryByRole('region', { name: 'Testwort Converter' })).toBeNull();
    expect(screen.getByText('::widget[unit-converter]')).toBeInTheDocument();
  });
});
