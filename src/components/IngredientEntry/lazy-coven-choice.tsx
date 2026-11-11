'use client';

import { lazyComponent, lazyModule } from '../../lib/use-lazy-module';

// The coven choice brings the form packages' SelectField in, so it loads apart from the pages' first-load
// scripts and starts early from the three dots (claude-docs/components/ingredient-entry.md, "The coven choice").

/** One import of the coven choice, shared by every dialog that asks which coven and started early by the cards' More. */
export const covenChoiceModule = lazyModule(() => import('./coven-choice'));

const LazyCovenChoice = lazyComponent(covenChoiceModule);

export default LazyCovenChoice;
