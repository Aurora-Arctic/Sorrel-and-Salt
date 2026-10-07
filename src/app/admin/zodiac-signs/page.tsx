import type { Metadata } from 'next';
import { VocabularyPage } from '../vocabulary-page';
import type { AdminVocabularyPageProps } from '../types';

export const metadata: Metadata = {
  title: 'Zodiac signs — Admin — Sorrel & Salt',
};

// The curated zodiac signs (MB.95), in the page shape the planets share.
export default function AdminZodiacSignsPage({ searchParams }: AdminVocabularyPageProps) {
  return VocabularyPage({ vocabulary: 'zodiacSigns', searchParams });
}
