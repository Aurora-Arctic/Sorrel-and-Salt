import type { Story } from '@ladle/react';
import VocabularyValueList from '.';
import { slugify } from '../../lib/slugify';
import { vocabularyHref } from './href';
import type { FlatVocabulary } from './types';

// Render-only; behaviour is asserted in tests/components/VocabularyValueList.
// The filter reaches the admin pages, which the workshop does not serve.
export default {
  title: 'Admin / Vocabulary Value List',
};

const entry = (vocabulary: FlatVocabulary, name: string, description: string) => {
  const slug = slugify(name);
  return {
    id: slug,
    name,
    slug,
    description,
    editHref: vocabularyHref(vocabulary, {}, { edit: slug }),
  };
};

export const OnePageOfSeveral: Story = () => (
  <VocabularyValueList
    vocabulary="planets"
    values={[
      entry('planets', 'Testwort Star', 'An invented body, for the workshop.'),
      entry('planets', 'Fixture Comet', 'Another, with a longer tail than the first.'),
      entry('planets', 'Fixture Moonlet', 'Invented too.'),
    ]}
    query=""
    previousHref={vocabularyHref('planets', { before: 'cursor' })}
    nextHref={vocabularyHref('planets', { after: 'cursor' })}
    position={{ page: 2, pages: 3 }}
  />
);

export const Signs: Story = () => (
  <VocabularyValueList
    vocabulary="zodiacSigns"
    values={[
      entry('zodiacSigns', 'Fixture Ram', 'An invented sign, for the workshop.'),
      entry('zodiacSigns', 'Testwort Twins', 'Another.'),
    ]}
    query=""
  />
);

export const Filtered: Story = () => (
  <VocabularyValueList
    vocabulary="planets"
    values={[entry('planets', 'Fixture Comet', 'An invented body, for the workshop.')]}
    query="comet"
  />
);

export const NoMatch: Story = () => (
  <VocabularyValueList vocabulary="planets" values={[]} query="nothing" />
);

export const Empty: Story = () => (
  <VocabularyValueList vocabulary="zodiacSigns" values={[]} query="" />
);
