import { render } from '@testing-library/react';
import { compile } from 'sass';
import { afterEach, describe, expect, it } from 'vitest';
import LinkHint from '@/components/LinkHint';
import { heldPage } from '@/components/SkeletonFade';
import { fromRoot } from '../../support/paths';

// A card clicked in the ingredients list is held, unseen, beneath the loading skeleton. Its
// pending dot must be unseen with it: a dot that sets its own `visibility` shows through the
// held page and floats over the skeleton. jsdom resolves `visibility` down the tree, so the
// compiled stylesheets of the two components decide it here.

const style = document.createElement('style');
style.textContent = ['LinkHint', 'SkeletonFade']
  .map((name) => compile(fromRoot(`src/components/${name}/index.scss`)).css)
  .join('\n');

afterEach(() => style.remove());

describe('the pending dot under a held page', () => {
  it('is unseen with the page, while the page is held', () => {
    document.head.append(style);
    const { container } = render(
      <div {...heldPage(true)}>
        <a href="/coven/x/ingredients/y">
          Testwort <LinkHint />
        </a>
      </div>,
    );
    const hint = container.querySelector('.link-hint') as HTMLElement;
    // Preconditions: the page is held, and the dot has its own pending class.
    expect(container.querySelector('.skeleton-held')).not.toBeNull();
    hint.classList.add('is-pending');
    expect(hint).toHaveClass('is-pending');
    expect(getComputedStyle(hint).visibility).toBe('hidden');
  });

  it('is seen when the page is not held', () => {
    document.head.append(style);
    const { container } = render(
      <div {...heldPage(false)}>
        <a href="/x">
          Testwort <LinkHint />
        </a>
      </div>,
    );
    const hint = container.querySelector('.link-hint') as HTMLElement;
    hint.classList.add('is-pending');
    expect(getComputedStyle(hint).visibility).not.toBe('hidden');
  });
});
