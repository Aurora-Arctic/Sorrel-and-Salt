import { compile } from 'sass';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../../support/paths';

// The smouldering edge flickers for a few rounds and then holds still, so a card that keeps the
// pointer or the focus does not move for ever (claude-docs/components/spell-card.md, "The smouldering edge").

const css = compile(fromRoot('src/components/SpellCard/index.scss'), { style: 'expanded' }).css;

/** Every `animation` value that runs one of the card's own keyframes. */
const cardAnimations = [...css.matchAll(/animation:\s*([^;]*spell-card-[^;]*);/g)].map(
  ([, value]) => value,
);

describe('the smouldering edge', () => {
  it('runs each of its animations three rounds and holds the last frame, never without end', () => {
    expect(cardAnimations.length).toBeGreaterThanOrEqual(4);
    for (const value of cardAnimations) {
      expect(value).not.toMatch(/\binfinite\b/);
      expect(value).toMatch(/\s3\s+forwards$/);
    }
  });
});
