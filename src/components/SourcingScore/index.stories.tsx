import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SourcingScore from '.';

const meta = {
  title: 'Admin / Sourcing Score',
  component: SourcingScore,
} satisfies Meta<typeof SourcingScore>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sourcing: {
      score: 38,
      facts: [
        { fact: 'sources', label: '1 Source', points: 10 },
        { fact: 'bestSource', label: 'Best Source: Book', points: 18 },
        { fact: 'nameBacked', label: 'Formal Name Backed: 1 of 1', points: 15 },
        { fact: 'curatorReviewed', label: 'Curator Review: Not Yet', points: 0 },
        { fact: 'nomenclatureUnknown', label: 'Nomenclature: Settled', points: 0 },
        { fact: 'noLocator', label: 'Citations with No Locator: 0', points: 0 },
        { fact: 'safetyUnsourced', label: 'Safety Note: None', points: 0 },
        { fact: 'formCitesNothing', label: 'Forms Citing Nothing: 1', points: -5 },
      ],
    },
  },
};

export const Negative: Story = {
  args: {
    sourcing: {
      score: -10,
      facts: [
        { fact: 'sources', label: '0 Sources', points: 0 },
        { fact: 'bestSource', label: 'Best Source: None', points: 0 },
        { fact: 'nameBacked', label: 'Formal Name Backed: 0 of 0', points: 0 },
        { fact: 'curatorReviewed', label: 'Curator Review: Not Yet', points: 0 },
        { fact: 'nomenclatureUnknown', label: 'Nomenclature: Unknown', points: -10 },
        { fact: 'noLocator', label: 'Citations with No Locator: 0', points: 0 },
        { fact: 'safetyUnsourced', label: 'Safety Note: None', points: 0 },
        { fact: 'formCitesNothing', label: 'Forms Citing Nothing: 0', points: 0 },
      ],
    },
  },
};

export const GainsOverTheMaximum: Story = {
  args: {
    sourcing: {
      score: 115,
      facts: [
        { fact: 'sources', label: '12 Sources', points: 60 },
        { fact: 'bestSource', label: 'Best Source: Book', points: 40 },
        { fact: 'nameBacked', label: 'Formal Name Backed: 12 of 12', points: 25 },
        { fact: 'formCitesNothing', label: 'Forms Citing Nothing: 2', points: -10 },
      ],
    },
  },
};

export const CostsAgainstFullGains: Story = {
  args: {
    sourcing: {
      score: 70,
      facts: [
        { fact: 'sources', label: '12 Sources', points: 95 },
        { fact: 'noLocator', label: 'Citations with No Locator: 5', points: -15 },
        { fact: 'formCitesNothing', label: 'Forms Citing Nothing: 2', points: -10 },
        { fact: 'curatorReviewed', label: 'Curator Review: Not Yet', points: 0 },
      ],
    },
  },
};

export const OnTheEntryPage: Story = {
  args: {
    headingLevel: 3,
    sourcing: {
      score: 38,
      facts: [
        { fact: 'sources', label: '1 Source', points: 10 },
        { fact: 'bestSource', label: 'Best Source: Book', points: 18 },
        { fact: 'formCitesNothing', label: 'Forms Citing Nothing: 1', points: -5 },
        { fact: 'curatorReviewed', label: 'Curator Review: Not Yet', points: 0 },
      ],
    },
  },
};
