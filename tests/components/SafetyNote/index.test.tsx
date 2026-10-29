import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SafetyNote, { CautionMark, SafetyMark, ToxicMark } from '@/components/SafetyNote';
import { capitalise } from '@/lib/text';

// The one presentation of an ingredient's caution (
// claude-docs/components/safety-note.md): a region of its own, labelled by
// its Caution heading, holding the ingredient's notes and then each shown
// form's under that form's name; and the Toxic mark beside it. Both are text
// to read, never controls. The notes and form names are the test's own data,
// so finding them proves what rendered, not what the copy says.

const INGREDIENT_NOTES = 'Fixture ingredient caution.';
const LEAF = {
  form: 'testleaf',
  formChoice: { group: { icon: 'botanical' as const } },
  safetyNotes: 'Fixture leaf caution.',
  toxic: false,
};
const OIL = { form: 'testoil', safetyNotes: 'Fixture oil caution.', toxic: true };
const ROOT = { form: 'testroot', safetyNotes: '', toxic: false };

// What can take focus without a tabindex, plus anything given one. Real tab
// order is a browser question; here it is enough that nothing in the note is
// a stop at all.
const FOCUSABLE =
  'a[href], button, input, select, textarea, summary, [contenteditable], [tabindex]';

/** The element and everything in it that could take focus. */
const stops = (element: Element): Element[] => [
  ...(element.matches(FOCUSABLE) ? [element] : []),
  ...element.querySelectorAll(FOCUSABLE),
];

describe('SafetyNote', () => {
  it.each([
    ['null', null],
    ['blank', '  \n '],
  ])('renders nothing when the notes are %s and no shown form has any', (_, safetyNotes) => {
    const { container } = render(
      <SafetyNote safetyNotes={safetyNotes} variants={[ROOT, { form: 'testbark' }]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('is a region labelled by its own heading, holding the notes', () => {
    render(<SafetyNote safetyNotes={INGREDIENT_NOTES} />);

    const region = screen.getByRole('region', { name: 'Caution' });
    const heading = within(region).getByRole('heading', { name: 'Caution' });
    expect(region).toHaveAttribute('aria-labelledby', heading.id);
    expect(within(region).getByText(INGREDIENT_NOTES)).toBeInTheDocument();
  });

  it('takes the heading level its consumer gives it', () => {
    render(<SafetyNote safetyNotes={INGREDIENT_NOTES} level={4} />);

    expect(screen.getByRole('heading', { name: 'Caution', level: 4 })).toBeInTheDocument();
  });

  it("lists each shown form's notes under its capitalised name, after the ingredient's own", () => {
    render(<SafetyNote safetyNotes={INGREDIENT_NOTES} variants={[LEAF, ROOT, OIL]} />);

    const region = screen.getByRole('region', { name: 'Caution' });
    // A form with no notes takes no line, so two terms for three forms.
    const terms = within(region).getAllByRole('term');
    const definitions = within(region).getAllByRole('definition');
    expect(terms.map((term) => term.textContent?.trim())).toEqual([
      capitalise(LEAF.form),
      capitalise(OIL.form),
    ]);
    expect(definitions.map((definition) => definition.textContent)).toEqual([
      LEAF.safetyNotes,
      OIL.safetyNotes,
    ]);

    const own = within(region).getByText(INGREDIENT_NOTES);
    expect(own.compareDocumentPosition(terms[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders for a form alone when the ingredient has no notes of its own', () => {
    render(<SafetyNote safetyNotes="" variants={[OIL]} />);

    const region = screen.getByRole('region', { name: 'Caution' });
    expect(within(region).getByRole('term')).toHaveTextContent(capitalise(OIL.form));
    expect(within(region).getByRole('definition')).toHaveTextContent(OIL.safetyNotes);
  });

  it("holds its consumer's footnote after the notes, and shows for a footnote alone", () => {
    const { unmount } = render(
      <SafetyNote safetyNotes={INGREDIENT_NOTES} footnote={<p>Fixture footnote.</p>} />,
    );
    const region = screen.getByRole('region', { name: 'Caution' });
    const own = within(region).getByText(INGREDIENT_NOTES);
    const footnote = within(region).getByText('Fixture footnote.');
    expect(own.compareDocumentPosition(footnote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    unmount();

    render(<SafetyNote safetyNotes="" footnote={<p>Fixture footnote.</p>} />);
    expect(
      within(screen.getByRole('region', { name: 'Caution' })).getByText('Fixture footnote.'),
    ).toBeInTheDocument();
  });

  it('is never focusable', () => {
    render(<SafetyNote safetyNotes={INGREDIENT_NOTES} variants={[LEAF]} />);

    expect(stops(screen.getByRole('region', { name: 'Caution' }))).toEqual([]);
  });
});

describe('ToxicMark', () => {
  it.each([
    ['the ingredient alone', true, []],
    ['a shown form alone', false, [LEAF, OIL]],
  ])('shows its word when %s is flagged toxic', (_, toxic, variants) => {
    render(<ToxicMark toxic={toxic} variants={variants} />);

    expect(screen.getByText('Toxic')).toBeInTheDocument();
  });

  it.each([
    ['nothing is flagged', false, [LEAF, ROOT]],
    ['the flag is absent', undefined, undefined],
  ])('renders nothing when %s', (_, toxic, variants) => {
    const { container } = render(<ToxicMark toxic={toxic} variants={variants} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('is never focusable', () => {
    render(<ToxicMark toxic />);

    expect(stops(screen.getByText('Toxic'))).toEqual([]);
  });
});

describe('CautionMark', () => {
  it('shows for notes on the ingredient or on any form, and not for blank ones', () => {
    const own = render(<CautionMark safetyNotes="Fixture caution." />);
    expect(screen.queryByText('Caution')).not.toBeNull();
    own.unmount();

    const form = render(<CautionMark variants={[{ form: 'testoil', safetyNotes: 'Fixture.' }]} />);
    expect(screen.queryByText('Caution')).not.toBeNull();
    form.unmount();

    render(<CautionMark safetyNotes=" " variants={[{ form: 'testoil', safetyNotes: '' }]} />);
    expect(screen.queryByText('Caution')).toBeNull();
  });

  it('takes no focus', () => {
    render(<CautionMark safetyNotes="Fixture caution." />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

// One safety badge wherever a row shows one: Toxic
// says more than Caution, so it stands alone when both apply.
describe('SafetyMark', () => {
  const caution = () => screen.queryByText('Caution', { exact: true });
  const toxic = () => screen.queryByText('Toxic', { exact: true });

  it.each([
    ['the ingredient is toxic and has notes', { toxic: true, safetyNotes: 'Fixture caution.' }],
    ['a form is toxic and has notes', { variants: [OIL] }],
  ])('shows Toxic alone when %s', (_, props) => {
    render(<SafetyMark {...props} />);

    expect(toxic()).toBeInTheDocument();
    expect(caution()).toBeNull();
  });

  it('shows Caution for notes with no toxic flag', () => {
    render(<SafetyMark safetyNotes="Fixture caution." variants={[ROOT]} />);

    expect(caution()).toBeInTheDocument();
    expect(toxic()).toBeNull();
  });

  it('renders nothing with neither', () => {
    const { container } = render(<SafetyMark safetyNotes=" " variants={[ROOT]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
