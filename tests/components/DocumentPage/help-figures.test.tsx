import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '@/components/DocumentPage/markdown';
import { helpTerms } from '@/lib/help-marks';

// A help body's screenshot: a paragraph that is one image becomes a figure, its title the caption beneath, drawn in a
// light and a dark picture of which the stylesheet shows the theme's. An image whose address the site does not serve
// becomes its alt text, as a link to one becomes its text.

function draw(body: string, help = true) {
  const { content } = renderMarkdown(body, {}, [], false, help ? helpTerms([]) : undefined);
  return render(<div>{content}</div>);
}

describe('renderMarkdown screenshots in a help body', () => {
  it('draws an image paragraph as a figure with its alt text and its title as the caption', () => {
    draw('![The Testwort entry page](/help/screens/testwort.png "An entry page, signed out.")');

    // jsdom names no figure from its figcaption, as a browser does, so the caption is found inside it.
    const figure = screen.getByRole('figure');
    expect(within(figure).getByText('An entry page, signed out.').tagName).toBe('FIGCAPTION');
    expect(within(figure).getByRole('img', { name: 'The Testwort entry page' })).toBeVisible();
    expect(figure).toHaveClass('figure');
  });

  it('draws the screenshot as one image to assistive tech, holding a light and a dark picture beside it', () => {
    draw('![The Testwort entry page](/help/screens/testwort.png "An entry page, signed out.")');

    // Both pictures are in the page, so a theme switch needs no request, and the alt text is read once in either theme.
    const images = within(screen.getByRole('figure')).getAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAccessibleName('The Testwort entry page');
    const pictures = within(images[0]).getAllByRole('presentation');
    expect(pictures.map((picture) => picture.getAttribute('src'))).toEqual([
      '/help/screens/testwort.png',
      '/help/screens/testwort.dark.png',
    ]);
    expect(pictures.map((picture) => picture.getAttribute('alt'))).toEqual(['', '']);
  });

  it('draws an image with no title as a figure with no caption', () => {
    draw('![The Testwort entry page](/help/screens/testwort.png)');

    const figure = screen.getByRole('figure');
    expect(within(figure).getByRole('img', { name: 'The Testwort entry page' })).toBeVisible();
    expect(figure.querySelector('figcaption')).toBeNull();
  });

  it('keeps an image inside a sentence where it stands, outside any figure', () => {
    draw('See ![the mark](/help/screens/mark.png) here.');

    expect(screen.queryByRole('figure')).toBeNull();
    expect(screen.getByRole('img', { name: 'the mark' })).toBeInTheDocument();
  });

  it('draws an image from another site as its alt text', () => {
    draw('![A Testwort elsewhere](https://elsewhere.example/testwort.png)');

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('figure')).toBeNull();
    expect(screen.getByText('A Testwort elsewhere')).toBeInTheDocument();
  });

  it('leaves a site document image paragraph as it is written', () => {
    draw('![The Testwort entry page](/help/screens/testwort.png)', false);

    expect(screen.queryByRole('figure')).toBeNull();
    expect(screen.getByRole('img', { name: 'The Testwort entry page' })).toBeInTheDocument();
  });
});
