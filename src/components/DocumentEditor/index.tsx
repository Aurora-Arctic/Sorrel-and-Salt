'use client';

import dynamic from 'next/dynamic';

// Loaded on the admin documents route alone: the editor library is large and no other page needs it.
const DocumentEditor = dynamic(() => import('./editor'), {
  loading: () => <p role="status">Loading the editor.</p>,
});

export default DocumentEditor;
