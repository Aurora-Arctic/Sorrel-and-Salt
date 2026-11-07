'use client';

import dynamic from 'next/dynamic';
import { DocumentEditorSkeleton } from './skeleton';

// Loaded on the admin documents route alone: the editor library is large and no other page needs it. While
// it loads the editor's own skeleton stands in, at the editor's size, so the page does not jump when it arrives.
const DocumentEditor = dynamic(() => import('./editor'), {
  loading: () => <DocumentEditorSkeleton />,
});

export default DocumentEditor;
