import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ThemeToggle from '.';

// Ported from resume-2026's ThemeToggle test suite. The aria-label changed
// ("...for the paper" was specific to that resume site) and the Tooltip
// wrapper is gone, so queries target the new label and there's no tooltip
// assertion to port — everything else (toggle behaviour, facet class
// choreography, listener cleanup) carries over unchanged.
describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    window.localStorage.clear();
  });

  it('renders an accessible toggle button', () => {
    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Toggle light and dark mode' })).toBeInTheDocument();
  });

  it('switches to light mode on click, setting the attribute and storage', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle light and dark mode' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
  });

  it('switches back to dark mode on a second click, resetting the attribute', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });

  it('updates aria-pressed to reflect the current mode', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });

    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('starts with the light facet resting and the dark facet parked when mounted already in light mode', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });
    const [darkFacet, lightFacet] = document.querySelectorAll('.theme-toggle__facet');

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(darkFacet).toHaveClass('theme-toggle__facet--pre-enter');
    expect(lightFacet).not.toHaveClass('theme-toggle__facet--pre-enter');
  });

  it('parks an outgoing facet back to pre-enter once its exit transition finishes', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });
    const darkFacet = document.querySelector('.theme-toggle__facet--dark') as SVGSVGElement;

    fireEvent.click(button);
    expect(darkFacet).toHaveClass('theme-toggle__facet--out');

    fireEvent.transitionEnd(darkFacet, { propertyName: 'transform' });

    expect(darkFacet).not.toHaveClass('theme-toggle__facet--out');
    expect(darkFacet).toHaveClass('theme-toggle__facet--pre-enter');
  });

  it('leaves an outgoing facet alone when a non-transform property finishes transitioning', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });
    const darkFacet = document.querySelector('.theme-toggle__facet--dark') as SVGSVGElement;

    fireEvent.click(button);
    fireEvent.transitionEnd(darkFacet, { propertyName: 'opacity' });

    expect(darkFacet).toHaveClass('theme-toggle__facet--out');
    expect(darkFacet).not.toHaveClass('theme-toggle__facet--pre-enter');
  });

  it('removes its transitionend listeners on unmount', () => {
    const { unmount } = render(<ThemeToggle />);
    const darkFacet = document.querySelector('.theme-toggle__facet--dark') as SVGSVGElement;
    const removeEventListenerSpy = vi.spyOn(darkFacet, 'removeEventListener');

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('transitionend', expect.any(Function));
  });
});
