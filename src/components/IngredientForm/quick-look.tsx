'use client';

import { useQuery } from '@tanstack/react-query';
import type { Route } from 'next';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import type { DuplicateQuickLookQuery } from '../../gql/graphql';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlQuery } from '../../lib/graphql-client';
import { headingOf } from '../IngredientEntry/details-dialog';
import { detailsHeading, detailsMarks } from '../IngredientEntry/details';
import IngredientSummary from '../IngredientEntry/summary';
import type { SummaryJar } from '../IngredientEntry/types';
import Modal from '../Modal';
import Skeleton from '../Skeleton';
import ModalLoading from '../Modal/loading';
import type { Duplicate } from './types';
import { applyCupboardEntry } from '@/modules/ingredients/validation/cupboard-merge';
import type { IngredientDetail } from '@/modules/ingredients';

// The Quick Look a duplicate row the coven already holds opens (M12.48, the
// owner's call): the entry's details modal over the Add Ingredient form, read in
// the page through /api/graphql, so nothing typed into the form is lost to a
// navigation. One read of the `ingredient` query, which serves an entry by id in a
// coven's own tier and the compendium's and never another coven's, under the
// service's own check; nothing new on the server. Not the list's DetailsDialog,
// which is a route modal its server page fills: this one has no route to change.
// claude-docs/components/ingredient-form.md, "The duplicate warning".

const DuplicateQuickLookDocument = graphql(`
  query DuplicateQuickLook($id: ID!, $workspaceId: ID!) {
    ingredient(id: $id, workspaceId: $workspaceId) {
      id
      name
      canonicalName
      nomenclature
      description
      safetyNotes
      toxic
      isGlobal
      retired
      reviewedAt
      elements
      celestialBodies
      zodiacSigns
      colors
      audit {
        createdAt
        updatedAt
      }
      cupboardEntry(workspaceId: $workspaceId) {
        label
        description
        safetyNotes
        elements
        celestialBodies
        zodiacSigns
        colors
      }
      folkNames {
        name
      }
      categories {
        id
        name
        slug
        group {
          id
          name
          colorDark
          colorLight
        }
      }
      deities {
        name
        deity {
          otherNames
          tradition {
            name
          }
        }
      }
      variants {
        id
        form
        safetyNotes
        toxic
        formChoice {
          group {
            icon
          }
        }
      }
      stock(workspaceId: $workspaceId) {
        id
        variant {
          id
        }
        quantityOnHand
        unit
        lowStockThreshold
      }
    }
  }
`);

type Looked = DuplicateQuickLookQuery['ingredient'];

/**
 * The answer as the entry page's own shape, so the modal's head and body are the
 * details modal's own components. The rows are cast: the summary and its marks read
 * only the fields asked for above, and the rest of each row (its audit ids, its
 * slugs) is nothing they draw. Substitutes and references are the page's alone.
 */
export function detailOf(looked: Looked, workspaceId: string): IngredientDetail {
  const tier = looked.isGlobal ? null : workspaceId;
  return {
    entry: {
      ...looked,
      workspaceId: tier,
      curatorReviewedAt: looked.reviewedAt,
      createdAt: looked.audit.createdAt,
      updatedAt: looked.audit.updatedAt,
    } as unknown as IngredientDetail['entry'],
    retired: looked.retired,
    cupboardEntry: looked.cupboardEntry as unknown as IngredientDetail['cupboardEntry'],
    folkNames: looked.folkNames.map(({ name }) => name),
    categories: looked.categories.map(({ group, ...category }) => ({
      category,
      group,
    })) as unknown as IngredientDetail['categories'],
    deities: looked.deities.map(({ name, deity }) => ({
      name,
      tradition: deity?.tradition?.name ?? null,
      otherNames: deity?.otherNames ?? [],
    })),
    substitutes: [],
    references: [],
    variants: looked.variants.map(({ formChoice, ...variant }) => ({
      variant: {
        ...variant,
        workspaceId: tier,
      } as unknown as IngredientDetail['variants'][number]['variant'],
      icon: formChoice?.group.icon ?? null,
      categories: [],
      substitutes: [],
      references: [],
    })),
  };
}

/** The coven's jars, as `stockDialogOf` reads them: amounts as numbers, null kept. */
export const jarsOf = (looked: Looked): SummaryJar[] =>
  looked.stock.map((jar) => ({
    variantId: jar.variant.id,
    quantity: jar.quantityOnHand === null ? null : Number(jar.quantityOnHand),
    unit: jar.unit,
    threshold: jar.lowStockThreshold === null ? null : Number(jar.lowStockThreshold),
  }));

/** The names a Quick Look's head shows before the entry arrives; the formal name's two fields come together or not at all. */
type QuickLookNames = Pick<Duplicate, 'name'> &
  (
    | Pick<Duplicate, 'canonicalName' | 'nomenclature'>
    | { canonicalName?: never; nomenclature?: never }
  );

/**
 * The head before the entry arrives. With the formal name known it is the details' own head; with
 * it unknown, a line skeleton stands where the formal name goes (while the read is out), or
 * nothing does (after a failed read): never "Not yet looked up", which would say the entry has none.
 */
function pendingHeading(entry: QuickLookNames, loading = true): ReturnType<typeof detailsHeading> {
  if (entry.canonicalName !== undefined && entry.nomenclature !== undefined) {
    return detailsHeading({
      ...entry,
      canonicalName: entry.canonicalName,
      nomenclature: entry.nomenclature,
    });
  }
  return { title: entry.name, formalName: loading ? <Skeleton shape="line" /> : undefined };
}

/**
 * The modal itself: open at once under the row's name, loading by the standard's
 * skeleton (M12.33), then the entry; a failed read says so, with Try Again.
 */
export function DuplicateQuickLook({
  id,
  entry,
  workspaceId,
  pageHref,
  onClose,
  returnTo,
}: {
  id: string;
  /**
   * The row's names, for the head while the read is out: the details' own head, as
   * the list's Quick Look opens under, so nothing in it jumps when they arrive. A caller
   * that does not know the formal name leaves `canonicalName` and `nomenclature` out: the
   * head then draws a one-line skeleton where the formal name goes, until the entry arrives.
   */
  entry: QuickLookNames;
  workspaceId: string;
  /** The entry's page, opened in a new tab so the form stays as it is. */
  pageHref: string;
  onClose: () => void;
  returnTo: () => HTMLElement | null;
}): ReactElement {
  const { data, error, isPending, refetch, isRefetching } = useQuery({
    ...graphqlQuery(DuplicateQuickLookDocument, { id, workspaceId }),
    // A failed read says so in the modal; it never takes the form down.
    throwOnError: false,
  });

  if (isPending || (error && isRefetching)) {
    return (
      <Modal {...pendingHeading(entry)} onClose={onClose} returnTo={returnTo} loading>
        <ModalLoading />
      </Modal>
    );
  }
  if (error) {
    return (
      <Modal {...pendingHeading(entry, false)} onClose={onClose} returnTo={returnTo}>
        {/* The server's sentence, "No such ingredient" for one deleted since,
            or else "That didn't work. Please try again." */}
        <p role="alert">{readGraphqlFailure(error).alert}</p>
        <button type="button" className="btn btn--small" onClick={() => void refetch()}>
          Try Again
        </button>
      </Modal>
    );
  }

  const detail = detailOf(data.ingredient, workspaceId);
  const shown = applyCupboardEntry(detail.entry, detail.cupboardEntry);
  return (
    <Modal
      {...headingOf({
        heading: detailsHeading(shown),
        marks: detailsMarks(detail, true),
        // The form's own link to the entry, a string as its warning's rows take it.
        pageHref: pageHref as Route,
      })}
      onClose={onClose}
      returnTo={returnTo}
      readingBody
      foot={
        // A plain link rather than the details modal's PendingLink, which would
        // navigate this tab and lose the form.
        <div className="ingredient-details-foot">
          <a className="btn" href={pageHref} target="_blank" rel="noopener noreferrer">
            See in Your Cupboard<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </div>
      }
    >
      <IngredientSummary detail={detail} jars={jarsOf(data.ingredient)} />
    </Modal>
  );
}
