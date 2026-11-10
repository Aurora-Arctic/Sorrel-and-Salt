'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, type ReactNode, useEffect, useId, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { HelpArticleInput } from '../../modules/help/validation/help';
import { graphql } from '@/lib/graphql-document';
import { helpPath } from '../../lib/help-paths';
import { graphqlRequest } from '../../lib/graphql-client';
import { placeServerIssues } from '../../lib/graphql-failure';
import { PendingLink, usePendingNavigation } from '../../lib/navigation';
import { slugify } from '../../lib/slugify';
import {
  FieldError,
  FormActions,
  FormErrorSummary,
  Required,
  SelectField,
  TextField,
} from '../Field';
import HelpShownSwitch, { SetHelpArticleShownDocument } from '../HelpOutline/shown-switch';
import { keepersHelpHref } from '../HelpOutline/href';
import { ChoiceChip } from '../FacetPanel/choice-chip';
import { ConfirmQuestion, DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import RichTextEditor, { markdownOf, useRichTextEditor } from '../RichTextEditor';
import { helpFormHeading } from './heading';
import { AUDIENCE_LABELS, NARROWNESS, NOUNS } from './rules';
import { HelpSubPagesField } from './sub-pages-field';
import type {
  HelpArticleFormProps,
  HelpFormAudience,
  HelpFormKind,
  HelpFormValues,
  HelpGuideChoice,
  HelpSubPageChoice,
} from './types';
import './index.scss';

// The keeper's full-page form for a help row: the text in a column on the left, and the row's facts (kind, shown, parent, sub
// pages, audience, position) in a card beside it that stays in view as the body scrolls. The card comes before the Save row in
// the page's order, so the phone and a screen reader meet the facts before saving (claude-docs/components/help-article-form.md).

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

const HelpRenameEffectsDocument = graphql(`
  query HelpRenameEffects($id: ID!, $title: String!) {
    helpRenameEffects(id: $id, title: $title) {
      oldPath
      newPath
      articles {
        id
        title
      }
      quickLinks
    }
  }
`);

const FIELDS: readonly string[] = [
  'kind',
  'title',
  'summary',
  'searchTerms',
  'body',
  'audience',
  'parentId',
  'position',
  'childIds',
];

const KINDS: readonly { value: HelpFormKind; label: string }[] = [
  { value: 'article', label: 'Article' },
  { value: 'guide', label: 'Guide' },
  { value: 'faq', label: 'FAQ' },
  { value: 'term', label: 'Term' },
];

const AUDIENCES: readonly HelpFormAudience[] = ['public', 'staff', 'keeper'];

/** A guide or an article: the two kinds that have a page, a summary, and change into each other. */
const isPage = (kind: HelpFormKind): boolean => kind === 'article' || kind === 'guide';

// The server's own title and body rules, so the form refuses with the same words and the same tidying.
const Schema = HelpArticleInput.pick({ title: true, body: true }).loose();

interface RenameEffects {
  oldPath: string;
  newPath: string;
  articles: readonly { id: string; title: string }[];
  quickLinks: readonly string[];
}

const HelpArticleForm = ({
  article,
  guides,
  candidates,
  presetParentId,
  returnHref,
}: HelpArticleFormProps): ReactElement => {
  const { navigate } = usePendingNavigation();
  const editor = useRichTextEditor(article?.body ?? '');
  // Read back from the editor, not the row: it writes Markdown a little differently from how it was read, so this is what
  // an untouched body sends.
  const [openBody] = useState(() => markdownOf(editor));
  const preset = guides.find(({ id }) => id === presetParentId);
  const methods = useForm<HelpFormValues>({
    mode: 'onTouched',
    shouldFocusError: false,
    defaultValues: {
      kind: article?.kind ?? 'article',
      title: article?.title ?? '',
      summary: article?.summary ?? '',
      searchTerms: article?.searchTerms ?? '',
      body: openBody,
      audience: article?.audience ?? preset?.audience ?? 'public',
      parentId: article?.parentId ?? preset?.id ?? '',
      position:
        article?.position == null
          ? preset
            ? String(preset.subPages + 1)
            : ''
          : String(article.position),
      childIds: article?.subPages.map(({ id }) => id) ?? [],
      shown: article?.shown ?? true,
    },
    resolver: zodResolver(Schema) as never,
  });
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = methods;
  const kind = useWatch({ control, name: 'kind' });
  const title = useWatch({ control, name: 'title' });
  const audience = useWatch({ control, name: 'audience' });
  const parentId = useWatch({ control, name: 'parentId' });
  const position = useWatch({ control, name: 'position' });
  const childIds = useWatch({ control, name: 'childIds' });
  const shown = useWatch({ control, name: 'shown' });

  const [done, setDone] = useState(false);
  const guard = useDiscardGuard(isDirty && !done);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState<{
    effects: RenameEffects;
    values: HelpFormValues;
  }>();
  const [alert, setAlert] = useState<string>();
  const id = useId();
  const bodyErrorId = `${id}-body-error`;
  const addressId = `${id}-address`;
  const detailsId = `${id}-details`;

  // Leaving waits for the guard to see the form saved, so it does not ask about changes that are written.
  useEffect(() => {
    if (done) navigate(returnHref);
  }, [done, navigate, returnHref]);

  const parent = guides.find(({ id }) => id === parentId);
  const savedParent = guides.find(({ id }) => id === article?.parentId);
  const holdsSubPages = kind === 'guide' && childIds.length > 0;
  const isSubPage = kind === 'article' && parentId !== '';
  // Every candidate, with the row's own sub pages among them so their chips can be drawn.
  const choices: HelpSubPageChoice[] = [
    ...(article?.subPages ?? []),
    ...candidates.filter(({ id }) => !article?.subPages.some((sub) => sub.id === id)),
  ];
  const chosen = choices.filter(({ id }) => childIds.includes(id));
  const narrowestChild = Math.min(...chosen.map((choice) => NARROWNESS[choice.audience]));

  const save = useMutation({
    mutationFn: async (values: HelpFormValues): Promise<string> => {
      const summary = values.summary.trim() || null;
      const searchTerms = values.searchTerms.trim() || null;
      const typed = values.position.trim();
      const parent = values.kind === 'article' ? values.parentId || null : null;
      const placed = typed === '' ? null : Number(typed);
      // A top-level page sends no place: Reorder Mode in the Guides bar orders the guides, and the service puts a new one last.
      // A guide turned article sends its emptied list, so the service releases its sub pages in the same save.
      const where = {
        ...(values.kind !== 'term' && { audience: values.audience }),
        ...(parent && { position: placed }),
        ...(isPage(values.kind) && { summary }),
        ...(values.kind === 'article' && { parentId: parent }),
        ...((values.kind === 'guide' || article?.kind === 'guide') && {
          childIds: values.kind === 'guide' ? values.childIds : [],
        }),
      };
      if (!article) {
        const { createHelpArticle } = await graphqlRequest(CreateHelpArticleDocument, {
          input: {
            kind: values.kind,
            title: values.title,
            body: values.body,
            searchTerms,
            ...where,
          },
        });
        // A new row is shown unless the form says otherwise.
        if (!values.shown) {
          await graphqlRequest(SetHelpArticleShownDocument, {
            id: createHelpArticle.id,
            shown: false,
          });
        }
        return createHelpArticle.id;
      }
      await graphqlRequest(UpdateHelpArticleDocument, {
        id: article.id,
        input: {
          title: values.title,
          body: values.body,
          searchTerms,
          ...(isPage(article.kind) && { kind: values.kind }),
          ...where,
        },
      });
      if (values.shown !== article.shown) {
        await graphqlRequest(SetHelpArticleShownDocument, { id: article.id, shown: values.shown });
      }
      return article.id;
    },
  });

  const remove = useMutation({
    mutationFn: async (): Promise<void> => {
      if (article) await graphqlRequest(DeleteHelpArticleDocument, { id: article.id });
    },
  });

  const write = async (values: HelpFormValues): Promise<void> => {
    try {
      await save.mutateAsync(values);
      setDone(true);
    } catch (error) {
      placeServerIssues(error, setError, ({ path: [field, ...rest] }) =>
        rest.length === 0 && FIELDS.includes(String(field))
          ? (field as keyof HelpFormValues)
          : undefined,
      );
    }
  };

  const send = async (values: HelpFormValues): Promise<void> => {
    setAlert(undefined);
    // A new address breaks links that hold the old one: say which first, and save only on a yes.
    if (article && slugify(values.title) !== article.slug) {
      try {
        const { helpRenameEffects } = await graphqlRequest(HelpRenameEffectsDocument, {
          id: article.id,
          title: values.title,
        });
        if (helpRenameEffects.articles.length > 0 || helpRenameEffects.quickLinks.length > 0) {
          setRenaming({ effects: helpRenameEffects, values });
          return;
        }
      } catch (error) {
        placeServerIssues(error, setError, ({ path: [field] }) =>
          field === 'title' ? 'title' : undefined,
        );
        return;
      }
    }
    await write(values);
  };

  const confirmDelete = async (): Promise<void> => {
    setAlert(undefined);
    await remove.mutateAsync();
    setDone(true);
  };

  // A sub page goes last in a new guide, or back where it was in its own; a top-level page holds no place in the form.
  const placeUnder = (guide: HelpGuideChoice | undefined): string => {
    if (guide) {
      return guide.id === article?.parentId
        ? String(article.position ?? guide.subPages)
        : String(guide.subPages + 1);
    }
    return '';
  };

  const changeParent = (next: string) => {
    const guide = guides.find(({ id }) => id === next);
    if (guide && NARROWNESS[audience] < NARROWNESS[guide.audience]) {
      setValue('audience', guide.audience, { shouldDirty: true });
    }
    setValue('position', placeUnder(guide), { shouldDirty: true });
  };

  const slug = slugify(title);
  const address = slug
    ? helpPath({
        kind,
        audience: kind === 'term' ? 'public' : audience,
        slug,
        parentSlug: kind === 'article' ? (parent?.slug ?? null) : null,
      })
    : undefined;
  const noun = NOUNS[kind];
  const rootError = errors.root?.message ?? alert;

  const guideOptions = [
    { value: '', label: 'No Parent' },
    ...guides.map(({ id, title }) => ({ value: id, label: title })),
  ];
  const parentNote = parent
    ? 'Guides only: an article, an FAQ entry or a term is never offered.'
    : 'Choosing a guide makes this one of its sub pages.';

  // An edited FAQ entry or term keeps its kind; an article and a guide change into each other while help stays one level deep.
  const kindOptions = KINDS.map((option) => ({
    ...option,
    disabled:
      (article !== undefined && !isPage(option.value)) ||
      (option.value === 'guide' && isSubPage) ||
      (option.value === 'article' && holdsSubPages),
  }));
  const kindNote = holdsSubPages
    ? 'A guide holding sub pages cannot be an article. Remove its sub pages first.'
    : article && isSubPage
      ? 'A sub page cannot be a guide. Choose No Parent first to make it one.'
      : undefined;

  const audienceOptions = AUDIENCES.map((value) => ({
    value,
    label: AUDIENCE_LABELS[value],
    disabled:
      (parent !== undefined && NARROWNESS[value] < NARROWNESS[parent.audience]) ||
      (holdsSubPages && NARROWNESS[value] > narrowestChild),
  }));
  const audienceNote =
    kind === 'faq' || !parent
      ? undefined
      : parent.audience === 'keeper'
        ? `Its guide, ${parent.title}, is Keeper, so this page is Keeper too.`
        : `Its guide, ${parent.title}, is ${AUDIENCE_LABELS[parent.audience]}, so this page is ${AUDIENCE_LABELS[parent.audience]} or narrower.`;

  const positionField: ReactNode =
    kind === 'article' && parent ? (
      <div className="field">
        <div className="field__label-row">
          <span className="field__label">Position</span>
        </div>
        <p className="help-article-form__fact">
          {position || '–'} of{' '}
          {parent.id === savedParent?.id ? parent.subPages : parent.subPages + 1} in {parent.title}
        </p>
        {article && parent.id === article.parentId && (
          <PendingLink
            className="help-article-form__reorder"
            href={keepersHelpHref(
              { query: '', kind: '', audience: '', shown: 'all' },
              { guide: parent.id },
            )}
          >
            Reorder in the Guide
          </PendingLink>
        )}
      </div>
    ) : null;

  return (
    <FormProvider {...methods}>
      {/* A new row's heading follows the kind chosen, so the form draws it; an edited row's is the page's. */}
      {!article && <PageHeader title={helpFormHeading(kind, false)} />}
      <form className="form help-article-form" onSubmit={handleSubmit(send)} noValidate>
        <div className="help-article-form__main">
          {rootError && <Notice kind="error">{rootError}</Notice>}
          <FormErrorSummary />
          <TextField<HelpFormValues>
            name="title"
            label="Title"
            placeholder="Add Title"
            required
            describedBy={address ? addressId : undefined}
            after={
              address && (
                <p id={addressId} className="field__hint help-article-form__address">
                  Address <code>{address}</code>, made from the title.
                  {article &&
                    ' Changing the title changes it, and breaks any link that holds the old one.'}
                </p>
              )
            }
          />
          {isPage(kind) && (
            <TextField<HelpFormValues> name="summary" label="Summary" placeholder="Add Summary" />
          )}
          <TextField<HelpFormValues>
            name="searchTerms"
            label="Search Terms"
            placeholder="Add terms"
            hint="Other words someone might search for, like login for Sign In"
          />
          <div className="field">
            <div className="field__label-row">
              <span className="field__label" aria-hidden="true">
                Body
                <Required />
              </span>
            </div>
            <RichTextEditor
              editor={editor}
              label="Body"
              required
              invalid={Boolean(errors.body)}
              describedBy={errors.body ? bodyErrorId : undefined}
              onMarkdownChange={(text) => {
                setValue('body', text, { shouldDirty: true });
                if (errors.body && text.trim()) clearErrors('body');
              }}
            />
            <FieldError id={bodyErrorId} message={errors.body?.message} />
          </div>
        </div>
        <aside className="help-article-form__details" aria-labelledby={detailsId}>
          <h2 id={detailsId} className="help-article-form__details-heading">
            Details
          </h2>
          <ChoiceChip<HelpFormKind>
            legend="Kind"
            name="kind"
            spacer={false}
            options={kindOptions}
            value={kind}
            disabled={article !== undefined && !isPage(article.kind)}
            hint={
              article
                ? isPage(article.kind)
                  ? 'An article and a guide change into each other; an FAQ entry or a term keeps its kind.'
                  : 'An FAQ entry or a term keeps its kind once saved.'
                : undefined
            }
            note={kindNote}
            onChange={(value) => {
              setValue('kind', value, { shouldDirty: true });
              if (value !== 'article') setValue('parentId', '');
              if (value !== 'guide') setValue('childIds', []);
              if (value === 'term') setValue('audience', 'public');
            }}
          />
          <div className="field">
            <div className="field__label-row">
              <span className="field__label">Shown to Readers</span>
            </div>
            <HelpShownSwitch
              title={title || 'New Row'}
              shown={shown}
              label="Shown"
              onChange={(next) => setValue('shown', next, { shouldDirty: true })}
            />
          </div>
          {kind === 'article' && (
            <SelectField<HelpFormValues>
              name="parentId"
              label="Parent"
              options={guideOptions}
              note={parentNote}
              onChange={changeParent}
            />
          )}
          {kind === 'guide' && (
            <HelpSubPagesField
              guideId={article?.id ?? null}
              audience={audience}
              value={childIds}
              candidates={choices}
              error={errors.childIds?.message}
              onChange={(next) => setValue('childIds', next, { shouldDirty: true })}
            />
          )}
          {kind !== 'term' && (
            <ChoiceChip<HelpFormAudience>
              legend="Audience"
              name="audience"
              spacer={false}
              options={audienceOptions}
              value={audience}
              note={audienceNote}
              error={errors.audience?.message}
              onChange={(value) => setValue('audience', value, { shouldDirty: true })}
            />
          )}
          {positionField}
        </aside>
        <div className="help-article-form__actions">
          <FormActions
            noun={noun}
            dirty={isDirty}
            submitting={isSubmitting || save.isPending}
            // The navigation provider's leave guard asks this form's question; asking here as well would ask again after Discard Changes.
            onCancel={() => navigate(returnHref)}
            onDelete={
              article
                ? () => {
                    setAlert(undefined);
                    setDeleting(true);
                  }
                : undefined
            }
          />
        </div>
        {guard.asking ? (
          <DiscardQuestion guard={guard} />
        ) : renaming ? (
          <ConfirmQuestion
            tone="solid"
            confirmLabel="Rename"
            busyLabel="Saving"
            busy={save.isPending}
            question={
              <>
                Renaming moves this page from <code>{renaming.effects.oldPath}</code> to{' '}
                <code>{renaming.effects.newPath}</code>. These still hold the old address, and their
                links will break:
              </>
            }
            details={
              <ul className="help-article-form__effects">
                {renaming.effects.articles.map(({ id, title }) => (
                  <li key={id}>{title}</li>
                ))}
                {renaming.effects.quickLinks.map((link) => (
                  <li key={link}>The help front page’s quick link “{link}”</li>
                ))}
              </ul>
            }
            onConfirm={async () => {
              const { values } = renaming;
              setRenaming(undefined);
              await write(values);
            }}
            onKeep={() => setRenaming(undefined)}
          />
        ) : (
          <ConfirmQuestion
            asked={deleting}
            question={<>Delete &quot;{article?.title}&quot;?</>}
            busy={remove.isPending}
            onConfirm={confirmDelete}
            onKeep={() => setDeleting(false)}
            onRefused={(refusal) => {
              setDeleting(false);
              setAlert(refusal);
            }}
          />
        )}
      </form>
    </FormProvider>
  );
};

export default HelpArticleForm;
