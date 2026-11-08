'use client';

import dynamic from 'next/dynamic';
import { HelpArticleFormSkeleton } from './skeleton';

// Loaded on the keepers' help edit pages alone: the body's editor library is large and no other page needs it. While it
// loads the form's own skeleton stands in, at the form's size, so the page does not jump when it arrives.
const HelpArticleForm = dynamic(() => import('./form'), {
  loading: () => <HelpArticleFormSkeleton />,
});

export default HelpArticleForm;

/** The form for a new row, whose stand-in draws the page's heading, as the form does. */
export const NewHelpArticleForm = dynamic(() => import('./form'), {
  loading: () => <HelpArticleFormSkeleton heading="Add Article" />,
});
