'use client';

import dynamic from 'next/dynamic';

const DocumentEditor = dynamic(() => import('./editor'), {
  loading: () => <p role="status">Loading the editor.</p>,
});

export default DocumentEditor;
