'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { graphql } from '@/lib/graphql-document';
import { helpPath } from '../../lib/help-paths';
import { slugify } from '../../lib/slugify';
import { graphqlRequest } from '../../lib/graphql-client';
import { placeServerIssues, readGraphqlIssues } from '../../lib/graphql-failure';
import { FormActions, SelectField, TextField } from '../Field';
import { renderMarkdown } from '../DocumentPage/markdown';
import { ConfirmQuestion, DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import type { HelpArticleFormProps, HelpFormAudience, HelpFormKind, HelpFormValues } from './types';

// The keeper's form for a help row: an FAQ entry, an article or a glossary term, with the body previewed through the
// standard sanitising renderer (claude-docs/design-decisions/support.md, "Audiences, staff routes and search").

const CreateHelpArticleDocument = graphql(`
  mutation CreateHelpArticle($input: HelpArticleInput!) {
    createHelpArticle(input: $input) {
      id
      slug
    }
  }
`);

const UpdateHelpArticleDocument = graphql(`
  mutation UpdateHelpArticle($id: ID!, $input: HelpArticlePatch!) {
    updateHelpArticle(id: $id, input: $input) {
      id
      slug
    }
  }
`);

const DeleteHelpArticleDocument = graphql(`
  mutation DeleteHelpArticle($id: ID!) {
    deleteHelpArticle(id: $id)
  }
`);

const FIELDS = ['kind', 'title', 'summary', 'body', 'audience', 'parentId', 'position'];

// A whole number, 0 or more, as the service takes it; a blank field clears the position.
const WHOLE_NUMBER = /^\d+$/;

const NOUNS: Record<HelpFormKind, string> = { faq: 'FAQ Entry', article: 'Article', term: 'Term' };

const KINDS = [
  { value: 'faq', label: 'FAQ' },
  { value: 'article', label: 'Article' },
  { value: 'term', label: 'Term' },
];

const AUDIENCES: readonly { value: HelpFormAudience; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'staff', label: 'Staff' },
  { value: 'keeper', label: 'Keeper' },
];

const NARROWNESS: Record<HelpFormAudience, number> = { public: 0, staff: 1, keeper: 2 };

const Schema = z.looseObject({
  title: z.string().trim().min(1, 'Give the article a title'),
  body: z.string().trim().min(1, 'Give the article a body'),
});

const HelpArticleForm = ({ article, parents, onDone }: HelpArticleFormProps): ReactElement => {
  const methods = useForm<HelpFormValues>({
    defaultValues: {
      kind: article?.kind ?? 'article',
      title: article?.title ?? '',
      summary: article?.summary ?? '',
      body: article?.body ?? '',
      audience: article?.audience ?? 'public',
      parentId: article?.parentId ?? '',
      position: article?.position == null ? '' : String(article.position),
    },
    resolver: zodResolver(Schema) as never,
  });
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = methods;
  const kind = useWatch({ control, name: 'kind' });
  const parentId = useWatch({ control, name: 'parentId' });
  const body = useWatch({ control, name: 'body' });
  const title = useWatch({ control, name: 'title' });
  const audience = useWatch({ control, name: 'audience' });
  const discard = useDiscardGuard(isDirty);
  const [asking, setAsking] = useState(false);
  const [alert, setAlert] = useState<string>();

  const save = useMutation({
    mutationFn: async (values: HelpFormValues): Promise<void> => {
      const summary = values.summary.trim() || null;
      const position = values.position.trim() === '' ? null : Number(values.position);
      const parent = values.parentId || null;
      if (!article) {
        await graphqlRequest(CreateHelpArticleDocument, {
          input: {
            kind: values.kind,
            title: values.title,
            body: values.body,
            summary,
            ...(values.kind !== 'term' && { audience: values.audience, position }),
            ...(values.kind === 'article' && { parentId: parent }),
          },
        });
        return;
      }
      await graphqlRequest(UpdateHelpArticleDocument, {
        id: article.id,
        input: {
          title: values.title,
          body: values.body,
          summary,
          ...(article.kind !== 'term' && { audience: values.audience, position }),
          ...(article.kind === 'article' && { parentId: parent }),
        },
      });
    },
  });

  const remove = useMutation({
    mutationFn: async (): Promise<void> => {
      if (article) await graphqlRequest(DeleteHelpArticleDocument, { id: article.id });
    },
  });

  const send = async (values: HelpFormValues): Promise<void> => {
    setAlert(undefined);
    const position = values.position.trim();
    if (values.kind !== 'term' && position !== '' && !WHOLE_NUMBER.test(position)) {
      setError('position', { type: 'client', message: 'Give a whole number, 0 or more' });
      return;
    }
    try {
      await save.mutateAsync(values);
      onDone();
    } catch (error) {
      placeServerIssues(error, setError, ({ path: [field, ...rest] }) =>
        rest.length === 0 && FIELDS.includes(String(field))
          ? (field as keyof HelpFormValues)
          : undefined,
      );
    }
  };

  const confirmDelete = async (): Promise<void> => {
    try {
      await remove.mutateAsync();
      onDone();
    } catch (error) {
      setAsking(false);
      setAlert(
        readGraphqlIssues(error)
          .map(({ message }) => message)
          .join(' '),
      );
    }
  };

  const parent = parents.find(({ id }) => id === parentId);
  const audiences = AUDIENCES.filter(
    ({ value }) => !parent || NARROWNESS[value] >= NARROWNESS[parent.audience],
  );
  const choices = [
    { value: '', label: 'No Parent' },
    ...parents
      .filter(({ id }) => id !== article?.id)
      .map(({ id, title }) => ({
        value: id,
        label: title,
      })),
  ];
  const noun = NOUNS[article?.kind ?? kind];
  const slug = slugify(title);
  const address = slug
    ? helpPath({
        kind: article?.kind ?? kind,
        audience: kind === 'term' ? 'public' : audience,
        slug,
        parentSlug: kind === 'article' ? (parent?.slug ?? null) : null,
      })
    : undefined;
  const rootError = errors.root?.message ?? alert;
  const { content } = renderMarkdown(body);

  return (
    <FormProvider {...methods}>
      <form className="form" onSubmit={handleSubmit(send)} noValidate>
        {rootError && <Notice kind="error">{rootError}</Notice>}
        <SelectField<HelpFormValues>
          name="kind"
          label="Kind"
          options={KINDS}
          disabled={Boolean(article)}
          onChange={(value) => {
            if (value !== 'article') setValue('parentId', '');
            if (value === 'term') setValue('audience', 'public');
          }}
        />
        <TextField<HelpFormValues>
          name="title"
          label="Title"
          placeholder="Add a title"
          required
          note={address && `Address: ${address}`}
        />
        <TextField<HelpFormValues> name="summary" label="Summary" placeholder="Add a summary" />
        <TextField<HelpFormValues>
          name="body"
          label="Body"
          placeholder="Add Markdown"
          multiline
          rows={10}
          required
        />
        <section aria-label="Preview" className="document-page__body">
          {content}
        </section>
        {kind === 'article' && (
          <SelectField<HelpFormValues>
            name="parentId"
            label="Parent"
            options={choices}
            onChange={(value) => {
              const next = parents.find(({ id }) => id === value);
              const current = getValues('audience');
              if (next && NARROWNESS[current] < NARROWNESS[next.audience]) {
                setValue('audience', next.audience, { shouldDirty: true });
              }
            }}
          />
        )}
        {kind !== 'term' && (
          <SelectField<HelpFormValues> name="audience" label="Audience" options={audiences} />
        )}
        {kind !== 'term' && (
          <TextField<HelpFormValues>
            name="position"
            label="Position"
            placeholder="Add a number"
            type="text"
            inputMode="numeric"
          />
        )}
        <FormActions
          noun={noun}
          dirty={isDirty}
          submitting={isSubmitting}
          onCancel={() => discard.request(onDone)}
          onDelete={
            article
              ? () => {
                  setAlert(undefined);
                  setAsking(true);
                }
              : undefined
          }
        />
        {discard.asking ? (
          <DiscardQuestion guard={discard} />
        ) : (
          asking && (
            <ConfirmQuestion
              question={<>Delete &quot;{article?.title}&quot;?</>}
              busy={remove.isPending}
              onConfirm={confirmDelete}
              onKeep={() => setAsking(false)}
            />
          )
        )}
      </form>
    </FormProvider>
  );
};

export default HelpArticleForm;
