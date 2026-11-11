import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HelpFrontShell } from '@/components/HelpFront/shell';

// The frame the help header and the page beneath it stand in, drawn by the help layout and by its skeleton alike, so a
// skeleton's header lands where the page's does. The skeleton's body is static: it must not take part in navigation.

describe('HelpFrontShell', () => {
  it('draws the head above the page beneath it', () => {
    render(
      <HelpFrontShell head={<h1>Help</h1>}>
        <p>Article</p>
      </HelpFrontShell>,
    );
    const heading = screen.getByRole('heading', { level: 1, name: 'Help' });
    expect(heading.compareDocumentPosition(screen.getByText('Article'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('draws a static body by default, with no router to take part in', () => {
    // Rendered with no next/navigation mock: a body that read the router would throw here.
    expect(() =>
      render(
        <HelpFrontShell head={<h1>Help</h1>}>
          <p>Article</p>
        </HelpFrontShell>,
      ),
    ).not.toThrow();
    expect(screen.getByText('Article')).toBeInTheDocument();
  });
});
