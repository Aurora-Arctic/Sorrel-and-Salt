import type { Route } from 'next';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import type { ReactElement, ReactNode } from 'react';
import LastEdit from '../LastEdit';
import EntryMarks, { RecencyMark } from '../EntryMarks';
import { SafetyMark } from '../SafetyNote';
import FormIcon from '../FormIcon';
import HeldMark from './held-mark';
import BackLink from './back-link';
// From its own client file: the Modal index re-exports modules a server component cannot import.
import { RouteModalProvider } from '../Modal/route-modal-provider';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import InfoTip from '../InfoTip';
import FormalName from './formal-name';
import LinkHint, { LinkIconHint } from '../LinkHint';
import SafetyNote, { ToxicMark } from '../SafetyNote';
import { slugify } from '../../lib/slugify';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import type { SubstituteDetail, VariantDetail } from '@/modules/ingredients';
import { applyCupboardEntry, isAnnotated } from '@/modules/ingredients/validation/cupboard-merge';
import CupboardActions from './cupboard-actions';
import { cupboardFormValues } from '../CupboardEntryForm/entry-values';
import { EditPencil } from './edit-pencil';
import { editEyebrow } from './edit-heading';
import {
  BIBLIOGRAPHY_ID,
  DETAILS,
  NOTES_ID,
  NoteMarks,
  ReferencesSection,
  referenceNotes,
} from './references';
import { entryRecency } from '@/lib/entry-recency';
import EntryDialog from './entry-dialog';
import OwnEntryActions from './own-actions';
import StockSection from './stock-section';
import { reviewedAtOf } from './review-date';
import { cardName } from '../IngredientCard/card-name';
import type { IngredientEntryProps } from './types';
import {
  blockOf,
  categoryItems,
  CorrespondenceBlock,
  correspondences,
  ListBlock,
  said,
} from './blocks';
import './index.scss';

// An ingredient's page body, the same on the public compendium and a coven's: its fields, then a section
// per form. No hook, so a server page renders it; ids come from the entry's data, not `useId`
// (claude-docs/components/ingredient-entry.md).

const substituteLabel = ({ name, form }: SubstituteDetail): string =>
  form ? `${name} (${formLabel(form)})` : name;

function substituteItems(
  substitutes: readonly SubstituteDetail[],
  hrefOf: IngredientEntryProps['hrefOf'],
): ReactNode[] {
  return substitutes.map((substitute, at) => {
    // A typed name, or a link whose ingredient was deleted, reads as text under its last name; so
    // does one the caller has no page for.
    const href = substitute.ingredient ? hrefOf(substitute.ingredient) : undefined;
    const label = substituteLabel(substitute);
    return (
      // A typed name may repeat, so its place keys it.
      <li key={`${at}-${label}`}>
        {href ? (
          <PendingLink href={href} navigationTarget={ingredientLinkTarget(href)}>
            {label} <LinkHint />
          </PendingLink>
        ) : (
          label
        )}
      </li>
    );
  });
}

/** Each form's anchor: its name through `slugify` (`#form-oil`); names that still slug alike ("oil", "oil.") take a count. */
function formAnchors(variants: readonly VariantDetail[]): string[] {
  const seen = new Map<string, number>();
  return variants.map(({ variant }) => {
    const slug = slugify(variant.form);
    const count = (seen.get(slug) ?? 0) + 1;
    seen.set(slug, count);
    return count === 1 ? `form-${slug}` : `form-${slug}-${count}`;
  });
}

function FormSection({
  detail,
  anchor,
  numbers,
  hrefOf,
}: {
  detail: VariantDetail;
  anchor: string;
  /** The note numbers its own sources take, which end its text. */
  numbers: readonly number[];
  hrefOf: IngredientEntryProps['hrefOf'];
}): ReactElement {
  const { variant, icon, categories, substitutes } = detail;
  const nameId = `${anchor}-name`;
  // Only what the form adds: the ingredient's own fields stand above, and a form inherits them
  // (DESIGN.md §5).
  const rows = correspondences(variant).filter((row) => row.values.length > 0);
  const hasLists = rows.length > 0 || categories.length > 0 || substitutes.length > 0;
  const addsNothing =
    !said(variant.description) && !said(variant.safetyNotes) && !hasLists && numbers.length === 0;

  return (
    <section id={anchor} className="ingredient-entry__section" aria-labelledby={nameId}>
      <h3 className="ingredient-entry__form-heading">
        <FormIcon name={icon} /> <span id={nameId}>{formLabel(variant.form)}</span>{' '}
        <ToxicMark toxic={variant.toxic} />
      </h3>
      <div className="ingredient-entry__text">
        {said(variant.description) && (
          <p className="ingredient-entry__description">{variant.description}</p>
        )}
        <SafetyNote safetyNotes={variant.safetyNotes} level={4} />
        {addsNothing && (
          <p className="ingredient-entry__empty">
            {variant.toxic
              ? 'This form adds only its Toxic mark to what the ingredient says.'
              : 'This form adds nothing to what the ingredient says.'}
          </p>
        )}
        <NoteMarks section={anchor} numbers={numbers} />
      </div>
      {hasLists && (
        <div className="ingredient-entry__side">
          {rows.length > 0 && (
            <CorrespondenceBlock
              block={blockOf(anchor, 'correspondences', nameId)}
              rows={rows}
              level={4}
            />
          )}
          {categories.length > 0 && (
            <ListBlock
              block={blockOf(anchor, 'categories', nameId)}
              title="Categories"
              level={4}
              className="ingredient-entry__chips"
            >
              {categoryItems(categories)}
            </ListBlock>
          )}
          {substitutes.length > 0 && (
            <ListBlock block={blockOf(anchor, 'substitutes', nameId)} title="Substitutes" level={4}>
              {substituteItems(substitutes, hrefOf)}
            </ListBlock>
          )}
        </div>
      )}
    </section>
  );
}

// The side column's links to the compendium entries this entry replaces, or to itself once; the
// page chooses the ⓘ sentence, so this does not branch on tier
// (claude-docs/components/ingredient-entry.md, "Component notes").
function ReplacesBlock({
  replaces,
  heading = 'In the Compendium',
}: {
  replaces: {
    tip: string;
    entries: { title: string; href: Route }[];
    total: number;
    allHref?: Route;
  };
  heading?: string;
}): ReactElement {
  const block = blockOf('details', heading === 'In the Compendium' ? 'compendium' : 'similar');
  const whyId = `${block.id}-why`;
  // Directly under the list, in both blocks.
  const seeAll = replaces.allHref && replaces.total > replaces.entries.length && (
    <p className="ingredient-entry__see-all">
      <PendingLink
        href={replaces.allHref}
        navigationTarget={ingredientLinkTarget(replaces.allHref)}
      >
        See All {replaces.total}
        <LinkHint />
      </PendingLink>
    </p>
  );
  return (
    <div className="ingredient-entry__block ingredient-entry__replaces">
      <div className="ingredient-entry__heading-row">
        <h3 id={block.id}>{heading}</h3>
        <InfoTip id={whyId} label={heading}>
          {replaces.tip}
        </InfoTip>
      </div>
      <ul
        className="ingredient-entry__list ingredient-entry__replaced"
        aria-labelledby={block.id}
        aria-describedby={whyId}
      >
        {replaces.entries.map(({ title, href }) => (
          <li key={href}>
            <PendingLink href={href} navigationTarget={ingredientLinkTarget(href)}>
              <span className="ingredient-entry__entry-title">{title}</span>
              <LinkIconHint />
            </PendingLink>
          </li>
        ))}
      </ul>
      {seeAll}
    </div>
  );
}

const IngredientEntry = ({
  lastEdit,
  detail,
  hrefOf,
  edit,
  movedAway,
  back,
  replaces,
  similar,
  cupboard,
  covens,
  heldInCovens = false,
  stock,
}: IngredientEntryProps): ReactElement => {
  const { cupboardEntry, folkNames, categories, deities, substitutes, variants, retired } = detail;
  // `entry` is the row as the compendium has it, which edit and identity use; `shown` lays the
  // coven's cupboard entry over it for what the page says. Three kinds: ours (a coven's row,
  // Local), the compendium's held here (marked), and the compendium's not held (neither).
  const { entry } = detail;
  const shown = applyCupboardEntry(entry, cupboardEntry);
  const local = entry.workspaceId !== null;
  const held = !local && cupboardEntry != null;
  // The curators' review mark, shown to everyone on a compendium entry.
  const reviewedAt = reviewedAtOf(detail);
  // Either page's cupboard choices, which take the curator's Edit into their menu.
  const choices = cupboard ?? covens;
  // New or Updated reads off the compendium entry's own stamps; a coven's own entry has none.
  const recency = local ? null : entryRecency(entry.createdAt, entry.updatedAt);
  const toxic = entry.toxic || variants.some(({ variant }) => variant.toxic);
  // Caution as the card counts it: notes on the entry as this coven reads them, or on any form.
  const caution = [shown.safetyNotes, ...variants.map(({ variant }) => variant.safetyNotes)].some(
    (notes) => said(notes),
  );
  const anchors = formAnchors(variants);
  const notes = referenceNotes(
    detail,
    anchors,
    variants.map(({ variant }) => formLabel(variant.form)),
  );

  // Only the fields the client parts use cross to them, not the whole row.
  const editable = {
    id: entry.id,
    name: entry.name,
    canonicalName: entry.canonicalName,
    nomenclature: entry.nomenclature,
  };

  const page = (
    <article
      className={
        variants.length > 0 ? 'ingredient-entry ingredient-entry--with-nav' : 'ingredient-entry'
      }
    >
      <header className="ingredient-entry__head">
        {(back || recency || toxic || caution) && (
          // One row for the way back (left, first for a screen reader), the New / Updated marker
          // (top right) and the one safety badge beside the marker or in its place; the badge alone
          // where neither else shows.
          <div className="ingredient-entry__bar">
            {back && (
              <BackLink href={back.href}>
                Back to {back.label} <LinkHint />
              </BackLink>
            )}
            <RecencyMark recency={recency} />
            <SafetyMark
              toxic={entry.toxic}
              safetyNotes={shown.safetyNotes}
              variants={variants.map(({ variant }) => variant)}
            />
          </div>
        )}
        {/* Above the names, left-aligned; Quick Look draws it in the same place. */}
        {lastEdit && <LastEdit by={lastEdit.by} at={lastEdit.at} />}
        {/* The formal name and the name together, so the Edit pencil can stand at the end of the formal name's line (index.scss). */}
        <div className="ingredient-entry__naming">
          <FormalName entry={entry} />
          <PageHeader
            title={shown.name}
            lead={(local || held || heldInCovens) && <HeldMark />}
            action={
              (edit || cupboard || covens) && (
                <>
                  {edit && !(choices && !local) && edit.coven ? (
                    // A coven's own entry: Edit and Delete in one menu.
                    <OwnEntryActions edit={edit} entry={editable} />
                  ) : (
                    edit &&
                    !(choices && !local) && (
                      // Edit alone, as for a curator in no coven: a link straight into the dialog.
                      <EditPencil href={edit.href} entry={editable} eyebrow={editEyebrow(edit)} />
                    )
                  )}
                  {cupboard && !local && (
                    <CupboardActions
                      {...cupboard}
                      edit={edit ? { href: edit.href, entry: editable } : undefined}
                      ingredientId={entry.id}
                      held={held}
                      {...cupboardFormValues(entry, cupboardEntry)}
                    />
                  )}
                  {/* The public page's buttons across the viewer's covens, the curator's Edit among them, and none of the marks. */}
                  {covens && !cupboard && !local && (
                    <CupboardActions
                      {...covens}
                      edit={edit ? { href: edit.href, entry: editable } : undefined}
                      ingredientId={entry.id}
                      compendium={cupboardFormValues(entry, null).compendium}
                    />
                  )}
                </>
              )
            }
          />
        </div>
        {(local || held || cupboard || retired || reviewedAt !== undefined) && (
          <div className="badges">
            <EntryMarks
              kind={local ? 'own' : held ? 'cupboard' : 'compendium'}
              inCoven={cupboard !== undefined}
              annotated={held && isAnnotated(cupboardEntry)}
              retired={retired}
              reviewedAt={reviewedAt}
              safety={false}
            />
          </div>
        )}
        {movedAway && (
          // Quiet: on the page from the start, so a status, never an alert.
          <Notice kind="warn" quiet>
            The ingredient that was at this address has been moved to{' '}
            <PendingLink
              href={movedAway.href}
              navigationTarget={ingredientLinkTarget(movedAway.href)}
            >
              {movedAway.name} <LinkHint />
            </PendingLink>
          </Notice>
        )}
      </header>

      {variants.length > 0 && (
        <PageNav
          label="On This Page"
          entries={[
            ...(stock ? [{ href: '#stock' as const, label: 'Stock' }] : []),
            { href: '#details', label: 'Details' },
            ...variants.map(({ variant }, at) => ({
              href: `#${anchors[at]}` as const,
              label: formLabel(variant.form),
              group: 'Forms',
              // The forms take the line References takes, so the menu opens each the same way.
              apart: at === 0,
            })),
            // With notes the section lists two blocks; with none it is one link.
            ...(notes.notes.length > 0
              ? [
                  {
                    href: `#${NOTES_ID}` as const,
                    label: 'Notes',
                    group: 'References',
                    apart: true,
                  },
                  {
                    href: `#${BIBLIOGRAPHY_ID}` as const,
                    label: 'Bibliography',
                    group: 'References',
                  },
                ]
              : [{ href: '#references' as const, label: 'References', apart: true }]),
          ]}
        />
      )}

      {/* One box round the sections, so past a tablet's width text and side columns run as two independent columns (`entry-body`). */}
      <div className="ingredient-entry__body">
        {/* What the coven has of it, first, ahead of what the entry is. */}
        {stock && (
          <StockSection
            stock={stock}
            variants={variants}
            ingredientId={entry.id}
            name={cardName(shown.name, shown.canonicalName)}
            formalName={entry.canonicalName}
          />
        )}

        <section
          id="details"
          className="ingredient-entry__section"
          aria-labelledby="details-heading"
        >
          <h2 id="details-heading">Details</h2>
          <div className="ingredient-entry__text">
            {said(shown.description) ? (
              <p className="ingredient-entry__description">{shown.description}</p>
            ) : (
              <p className="ingredient-entry__empty">No description recorded.</p>
            )}
            <SafetyNote safetyNotes={shown.safetyNotes} level={3} />
            <NoteMarks section={DETAILS} numbers={notes.numbersOf(DETAILS)} />
          </div>
        </section>
        {/* A plain div, not an aside: one complementary landmark per section would be noise. */}
        <div className="ingredient-entry__side">
          {replaces && <ReplacesBlock replaces={replaces} />}
          {similar && <ReplacesBlock replaces={similar} heading="Similar in the Compendium" />}
          <CorrespondenceBlock
            block={blockOf('details', 'correspondences')}
            rows={correspondences(shown, deities)}
            level={3}
          />
          <ListBlock
            block={blockOf('details', 'folk-names')}
            title="Folk Names"
            level={3}
            empty="No folk names recorded."
          >
            {folkNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ListBlock>
          <ListBlock
            block={blockOf('details', 'categories')}
            title="Categories"
            level={3}
            empty="No categories recorded."
            className="ingredient-entry__chips"
          >
            {categoryItems(categories)}
          </ListBlock>
          <ListBlock
            block={blockOf('details', 'substitutes')}
            title="Substitutes"
            level={3}
            empty="No substitutes recorded."
          >
            {substituteItems(substitutes, hrefOf)}
          </ListBlock>
        </div>

        {/* The forms, headed so they read as one part of the page, each form a level beneath. */}
        {variants.length > 0 && (
          <section id="forms" className="ingredient-entry__forms" aria-labelledby="forms-heading">
            <h2 id="forms-heading">Forms</h2>
            {variants.map((variant, at) => (
              <FormSection
                key={variant.variant.id}
                detail={variant}
                anchor={anchors[at]!}
                numbers={notes.numbersOf(anchors[at]!)}
                hrefOf={hrefOf}
              />
            ))}
          </section>
        )}

        {/* Last, so v2's notes section, appended beneath it, moves nothing. */}
        <ReferencesSection model={notes} />
      </div>
    </article>
  );

  // The provider holds a pressed Edit on its way, shared by the link and the dialog. The admin
  // layout has one above its pages, these two routes have none, and a provider already above is
  // kept.
  return edit || cupboard || covens ? (
    <RouteModalProvider>
      {page}
      {edit && <EntryDialog entry={editable} edit={edit} />}
    </RouteModalProvider>
  ) : (
    page
  );
};

export default IngredientEntry;
