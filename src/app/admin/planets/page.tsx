import type { Metadata } from 'next';
import { VocabularyPage } from '../vocabulary-page';
import type { AdminVocabularyPageProps } from '../types';

export const metadata: Metadata = {
  title: 'Planets — Admin — Sorrel & Salt',
};

// The curated planets (MB.95), in the page shape the signs share.
export default function AdminPlanetsPage({ searchParams }: AdminVocabularyPageProps) {
  return VocabularyPage({ vocabulary: 'planets', searchParams });
}
