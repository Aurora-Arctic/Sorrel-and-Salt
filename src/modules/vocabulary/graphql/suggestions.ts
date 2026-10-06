import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import {
  type Claimant,
  type DeitySuggestion,
  type FormSuggestion,
  type VocabularySuggestion,
  suggestDeities,
  suggestForms,
  suggestPlanets,
  suggestZodiacSigns,
} from '../services/suggestions';

export const CorrespondenceSuggestionRef = builder
  .objectRef<VocabularySuggestion>('CorrespondenceSuggestion')
  .implement({
    fields: (t) => ({
      value: t.exposeString('value'),
      description: t.exposeString('description', { nullable: true }),
      curated: t.exposeBoolean('curated'),
    }),
  });

// One type for both fields: a planet and a sign suggestion carry the same
// three things, and neither carries a group (claude-docs/graphql/schema.md,
// "planetSuggestions and zodiacSuggestions").
const FIELDS = { planetSuggestions: suggestPlanets, zodiacSuggestions: suggestZodiacSigns };

for (const [name, suggest] of Object.entries(FIELDS)) {
  builder.queryField(name, (t) =>
    t.pagedConnection({
      type: CorrespondenceSuggestionRef,
      args: {
        workspaceId: t.arg.id({ required: true }),
        query: t.arg.string({ required: false }),
      },
      resolve: (_root, { workspaceId, query }, page, { session }) => {
        if (!session) throw new Forbidden();
        return suggest(session, workspaceId, query ?? '', page);
      },
    }),
  );
}

/** An in-scope ingredient already holding a suggested value, by label and formal name. */
export const SuggestionClaimantRef = builder.objectRef<Claimant>('SuggestionClaimant').implement({
  fields: (t) => ({
    name: t.exposeString('name'),
    canonicalName: t.exposeString('canonicalName', { nullable: true }),
  }),
});

const FormSuggestionRef = builder.objectRef<FormSuggestion>('FormSuggestion').implement({
  fields: (t) => ({
    value: t.exposeString('value'),
    description: t.exposeString('description', { nullable: true }),
    group: t.exposeString('group', { nullable: true }),
    curated: t.exposeBoolean('curated'),
    claimants: t.field({ type: [SuggestionClaimantRef], resolve: (s) => s.claimants }),
  }),
});

builder.queryField('formSuggestions', (t) =>
  t.pagedConnection({
    type: FormSuggestionRef,
    args: {
      workspaceId: t.arg.id({ required: true }),
      query: t.arg.string({ required: false }),
    },
    resolve: (_root, { workspaceId, query }, page, { session }) => {
      if (!session) throw new Forbidden();
      return suggestForms(session, workspaceId, query ?? '', page);
    },
  }),
);

// A form's shape without the claimants: the tradition tells two same-named
// deities apart as a group does two forms, but a deity is no part of an
// ingredient's identity (claude-docs/graphql/schema.md, "deitySuggestions").
const DeitySuggestionRef = builder.objectRef<DeitySuggestion>('DeitySuggestion').implement({
  fields: (t) => ({
    value: t.exposeString('value'),
    description: t.exposeString('description', { nullable: true }),
    tradition: t.exposeString('tradition', { nullable: true }),
    curated: t.exposeBoolean('curated'),
  }),
});

builder.queryField('deitySuggestions', (t) =>
  t.pagedConnection({
    type: DeitySuggestionRef,
    args: {
      workspaceId: t.arg.id({ required: true }),
      query: t.arg.string({ required: false }),
    },
    resolve: (_root, { workspaceId, query }, page, { session }) => {
      if (!session) throw new Forbidden();
      return suggestDeities(session, workspaceId, query ?? '', page);
    },
  }),
);
