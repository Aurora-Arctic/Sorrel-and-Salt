import type { Metadata } from 'next';
import { SITE_NAME, siteUrl } from '../../../lib/site';
import { currentDocumentPage } from '../_documents';
import { ABOUT_PLACEHOLDERS } from './placeholders';

export const metadata: Metadata = {
  title: 'About Us',
  description: `Why ${SITE_NAME} exists, what it is, who it is for, who runs it, and how the Compendium is sourced.`,
  alternates: { canonical: siteUrl('/about') },
};

// Read from the database per request, so the page is never frozen at build time.
export const dynamic = 'force-dynamic';

export default function Page() {
  return currentDocumentPage('about', ABOUT_PLACEHOLDERS, 'about');
}
