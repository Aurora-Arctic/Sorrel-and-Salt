/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type AgreementVersionInput = {
  disclaimer: number;
  ethics: number;
  terms: number;
};

export type CategoryGroupInput = {
  colorDark: string;
  colorLight: string;
  description: string;
  name: string;
};

export type CategoryInput = {
  description: string;
  groupId: string | number;
  name: string;
};

/** How a search combines the categories it is given: all (the default), an entry must carry every one; or any, at least one. A category counts when it is filed on the entry or on any live form. */
export type CategoryMode =
  | 'all'
  | 'any';

export type CelestialBodyInput = {
  description: string;
  name: string;
};

export type CompendiumIngredientInput = {
  canonicalName?: string | null | undefined;
  /** The categories it is filed under. */
  categoryIds?: Array<string | number> | null | undefined;
  celestialBodies?: Array<string> | null | undefined;
  colors?: Array<string> | null | undefined;
  deities?: Array<IngredientDeityInput> | null | undefined;
  description?: string | null | undefined;
  elements?: Array<IngredientElement> | null | undefined;
  folkNames?: Array<string> | null | undefined;
  name: string;
  nomenclature: Nomenclature;
  references?: Array<ReferenceLinkInput> | null | undefined;
  safetyNotes?: string | null | undefined;
  /** Whether the public compendium lists the entry. Left out, a create is shown and an update leaves the flag as it is. */
  shown?: boolean | null | undefined;
  substitutes?: Array<SubstituteInput> | null | undefined;
  /** Whether the ingredient is toxic, off when left out; each form's flag is its own. */
  toxic?: boolean | null | undefined;
  /** Its forms, each replacing the one it names; a form not listed is removed, and [] is none. */
  variants: Array<IngredientVariantInput>;
  zodiacSigns?: Array<string> | null | undefined;
};

/** The whole entry, replacing the row. Every field is sent, and "" or [] clears one. */
export type CompendiumIngredientUpdateInput = {
  canonicalName: string;
  /** The categories it is filed under; [] when none. */
  categoryIds: Array<string | number>;
  celestialBodies: Array<string>;
  colors: Array<string>;
  deities: Array<IngredientDeityInput>;
  description: string;
  elements: Array<IngredientElement>;
  folkNames: Array<string>;
  name: string;
  nomenclature: Nomenclature;
  references: Array<ReferenceLinkInput>;
  safetyNotes: string;
  /** Whether the public compendium lists the entry. Left out, a create is shown and an update leaves the flag as it is. */
  shown?: boolean | null | undefined;
  substitutes: Array<SubstituteInput>;
  /** Whether the ingredient is toxic; each form's flag is its own. */
  toxic: boolean;
  /** Its forms, each replacing the one it names; a form not listed is removed, and [] is none. */
  variants: Array<IngredientVariantInput>;
  zodiacSigns: Array<string>;
};

/** Which compendium entries a search reads: shown (the default), hidden, or all. Hidden and all are a curator or admin's alone. */
export type CompendiumListing =
  | 'all'
  | 'hidden'
  | 'shown';

/** A jar to start, on a form the coven does not hold. */
export type CreateJarInput = {
  input: StockInput;
  variantId: string | number;
};

/** The coven's overrides of a compendium entry. On an add, a field left out is no override. On an annotate, a field left out keeps its value, null hands it back to the compendium, and a list, even an empty one, is the coven's own. */
export type CupboardEntryInput = {
  celestialBodies?: Array<string> | null | undefined;
  colors?: Array<string> | null | undefined;
  description?: string | null | undefined;
  elements?: Array<IngredientElement> | null | undefined;
  /** What the coven calls the entry; unique in the coven. */
  label?: string | null | undefined;
  safetyNotes?: string | null | undefined;
  zodiacSigns?: Array<string> | null | undefined;
};

export type DeityInput = {
  description: string;
  name: string;
  otherNames?: Array<string> | null | undefined;
  traditionId: string | number;
};

export type DeityTraditionInput = {
  description: string;
  name: string;
};

/** What changed in one pending document, in the keeper’s words. */
export type DocumentMailingSummaryInput = {
  summary: string;
  versionId: string | number;
};

export type FormGroupIcon =
  | 'animal'
  | 'botanical'
  | 'curio'
  | 'fluid'
  | 'mineral'
  | 'substance';

export type HelpArticleInput = {
  audience?: HelpAudience | null | undefined;
  body: string;
  /** The sub pages a guide holds, in order, each placed by its place in the list. */
  childIds?: Array<string | number> | null | undefined;
  kind: HelpArticleKind;
  parentId?: string | number | null | undefined;
  /** A whole number, 0 or more. */
  position?: number | null | undefined;
  /** Words that make the row findable by a reader’s own word; the search reads them as it reads the summary. */
  searchTerms?: string | null | undefined;
  summary?: string | null | undefined;
  title: string;
};

/** A question and answer, a page (`article`), a top-level page holding sub pages (`guide`), or a glossary term. */
export type HelpArticleKind =
  | 'article'
  | 'faq'
  | 'guide'
  | 'term';

/** Fields to change; one left out stays. A null `summary`, `searchTerms`, `position` or `parentId` clears it. A new title moves the slug, which is always derived from the title. A `childIds` list sets the children in its order and releases a child it leaves out to the top level. */
export type HelpArticlePatch = {
  audience?: HelpAudience | null | undefined;
  body?: string | null | undefined;
  childIds?: Array<string | number> | null | undefined;
  /** A top-level article becomes a guide, and a guide holding no sub page an article; any other change is refused. */
  kind?: HelpArticleKind | null | undefined;
  parentId?: string | number | null | undefined;
  /** A whole number, 0 or more. */
  position?: number | null | undefined;
  /** Words that make the row findable by a reader’s own word; the search reads them as it reads the summary. */
  searchTerms?: string | null | undefined;
  summary?: string | null | undefined;
  title?: string | null | undefined;
};

/** Who reads a help row: everyone (`public`), curators and keepers (`staff`), or keepers alone (`keeper`). */
export type HelpAudience =
  | 'keeper'
  | 'public'
  | 'staff';

/** A curated deity picked, or a name typed: exactly one of the two. */
export type IngredientDeityInput = {
  deityId?: string | number | null | undefined;
  name?: string | null | undefined;
};

export type IngredientElement =
  | 'air'
  | 'earth'
  | 'fire'
  | 'spirit'
  | 'water';

export type IngredientFormGroupInput = {
  description: string;
  icon?: FormGroupIcon | null | undefined;
  name: string;
};

export type IngredientFormValueInput = {
  description: string;
  groupId: string | number;
  name: string;
};

export type IngredientInput = {
  canonicalName?: string | null | undefined;
  /** The categories it is filed under. */
  categoryIds?: Array<string | number> | null | undefined;
  celestialBodies?: Array<string> | null | undefined;
  colors?: Array<string> | null | undefined;
  deities?: Array<IngredientDeityInput> | null | undefined;
  description?: string | null | undefined;
  elements?: Array<IngredientElement> | null | undefined;
  folkNames?: Array<string> | null | undefined;
  name: string;
  nomenclature?: Nomenclature | null | undefined;
  references?: Array<ReferenceLinkInput> | null | undefined;
  safetyNotes?: string | null | undefined;
  substitutes?: Array<SubstituteInput> | null | undefined;
  /** Whether the ingredient is toxic, off when left out; each form's flag is its own. */
  toxic?: boolean | null | undefined;
  /** Its forms, each replacing the one it names; a form not listed is removed, and [] is none. */
  variants: Array<IngredientVariantInput>;
  zodiacSigns?: Array<string> | null | undefined;
};

/** Where a coven's list reads from: local, the coven's own entries; or compendium, the compendium entries it holds. Leaving it out lists both. */
export type IngredientSource =
  | 'compendium'
  | 'local';

/** The whole ingredient, replacing the row. Every field is sent, and "" or [] clears one. */
export type IngredientUpdateInput = {
  canonicalName: string;
  /** The categories it is filed under; [] when none. */
  categoryIds: Array<string | number>;
  celestialBodies: Array<string>;
  colors: Array<string>;
  deities: Array<IngredientDeityInput>;
  description: string;
  elements: Array<IngredientElement>;
  folkNames: Array<string>;
  name: string;
  nomenclature: Nomenclature;
  references: Array<ReferenceLinkInput>;
  safetyNotes: string;
  substitutes: Array<SubstituteInput>;
  /** Whether the ingredient is toxic; each form's flag is its own. */
  toxic: boolean;
  /** Its forms, each replacing the one it names; a form not listed is removed, and [] is none. */
  variants: Array<IngredientVariantInput>;
  zodiacSigns: Array<string>;
};

/** One form of the ingredient, replacing the form it names. Every field but id is sent, and "" or [] clears one. */
export type IngredientVariantInput = {
  /** The categories this form is filed under. */
  categoryIds: Array<string | number>;
  celestialBodies: Array<string>;
  colors: Array<string>;
  description: string;
  elements: Array<IngredientElement>;
  form: string;
  /** The curated form picked for `form`; "" when it was typed. */
  formId: string | number;
  /** The form this entry keeps, so its text can be respelt; without one, the form whose text folds alike is kept, or a new one added. */
  id?: string | number | null | undefined;
  references: Array<ReferenceLinkInput>;
  safetyNotes: string;
  substitutes: Array<SubstituteInput>;
  /** Whether this form is toxic: its own flag, whatever the ingredient's says. */
  toxic: boolean;
  zodiacSigns: Array<string>;
};

export type InventoryUnit =
  | 'cup'
  | 'drop'
  | 'fl_oz_uk'
  | 'fl_oz_us'
  | 'g'
  | 'kg'
  | 'l'
  | 'lb'
  | 'mg'
  | 'ml'
  | 'oz'
  | 'piece'
  | 'pinch'
  | 'tbsp'
  | 'tsp';

export type InvitableRole =
  | 'member'
  | 'viewer';

/** A site role an invitation may grant: never `user`, which every account holds. */
export type InvitableSiteRole =
  | 'admin'
  | 'curator';

/** Why a card link was refused: withdrawn, past its date, or used by another account. */
export type InvitationCardAttemptReason =
  | 'accepted'
  | 'expired'
  | 'revoked';

/** How a citation names the ingredient: prints the formal name (stated), heads a common name a cited authority maps to it (resolved), leaves doubt (unresolved), or was not checked (unaudited). */
export type NameBasis =
  | 'resolved'
  | 'stated'
  | 'unaudited'
  | 'unresolved';

export type Nomenclature =
  | 'botanical'
  | 'chemical'
  | 'fungal'
  | 'mineral'
  | 'none'
  | 'unknown'
  | 'zoological';

/** Why a step takes nothing from the jars: CUSTOM, a typed-name step; UNSTOCKED, a form the coven holds no jar of; NO_QUANTITY, a step with no amount; UNITS_DIFFER, a unit the jar cannot be measured in; JAR_NOT_MEASURED, a jar kept without an amount. */
export type NotDeductedReason =
  | 'CUSTOM'
  | 'JAR_NOT_MEASURED'
  | 'NO_QUANTITY'
  | 'UNITS_DIFFER'
  | 'UNSTOCKED';

/** A reference, whole. On an update, a field left out or null is cleared. */
export type ReferenceInput = {
  accessed?: string | null | undefined;
  authors?: string | null | undefined;
  container?: string | null | undefined;
  contributors?: string | null | undefined;
  edition?: string | null | undefined;
  host?: string | null | undefined;
  issue?: string | null | undefined;
  kind: ReferenceKind;
  modified?: string | null | undefined;
  note?: string | null | undefined;
  pages?: string | null | undefined;
  place?: string | null | undefined;
  published?: string | null | undefined;
  publisher?: string | null | undefined;
  /** Edited or reviewed by scholars, in print or online: a peer-reviewed journal; a university, its press or its museum; an academic press; a learned society's edition or series; a reference work edited by scholars with signed articles; left out is false. Refused on a coven's source. */
  scholarly?: boolean | null | undefined;
  series?: string | null | undefined;
  title: string;
  url?: string | null | undefined;
  volume?: string | null | undefined;
};

export type ReferenceKind =
  | 'article'
  | 'book'
  | 'chapter'
  | 'entry'
  | 'web_page';

export type ReferenceLinkInput = {
  locator?: string | null | undefined;
  /** The compendium's alone: refused on a coven's citation. */
  nameBasis?: NameBasis | null | undefined;
  referenceId: string | number;
  /** The fields of the entry, or of the form, this source backs. The compendium's alone: refused on a coven's citation. */
  supports?: Array<string> | null | undefined;
};

/** One ingredient's stock edited together: jars to start, change and delete. */
export type SaveStockInput = {
  create: Array<CreateJarInput>;
  delete: Array<string | number>;
  update: Array<UpdateJarInput>;
};

/** A support request from a visitor who is not signed in. */
export type SignedOutSupportRequestInput = {
  /** Only ACCESSIBILITY, ACCOUNT, BUG, PRIVACY and QUESTION are accepted. */
  about: SupportAbout;
  /** Where the reply is mailed. */
  email: string;
  errorCode?: number | null | undefined;
  errorReference?: string | null | undefined;
  /** 1 to 4000 characters. */
  message: string;
  path?: string | null | undefined;
  /** 1 to 120 characters. */
  subject: string;
  /** A trap for bots: the form hides it, so any value means the send is dropped. */
  website?: string | null | undefined;
};

/** A new spell: a draft needs nothing but its status. */
export type SpellInput = {
  /** The categories the spell is assigned: what it intends, not what its ingredients bring. */
  categoryIds?: Array<string | number> | null | undefined;
  dayOfWeek?: string | null | undefined;
  intent?: string | null | undefined;
  jarDescription?: string | null | undefined;
  moonPhase?: string | null | undefined;
  note?: string | null | undefined;
  sealWaxColor?: string | null | undefined;
  status?: SpellStatus | null | undefined;
  /** The recipe, in order. */
  steps?: Array<SpellStepInput> | null | undefined;
  /** Required once the status is complete. */
  title?: string | null | undefined;
  visibility?: SpellVisibility | null | undefined;
};

export type SpellStatus =
  | 'complete'
  | 'draft';

/** One step of a recipe: an instruction, an ingredient, or both. The ingredient is linked (ingredientId with variantId) or written for this jar (name, with form). */
export type SpellStepInput = {
  body?: string | null | undefined;
  form?: string | null | undefined;
  /** A saved step this one is; left out, the step is new. */
  id?: string | number | null | undefined;
  ingredientId?: string | number | null | undefined;
  name?: string | null | undefined;
  quantity?: number | null | undefined;
  unit?: InventoryUnit | null | undefined;
  /** The form laid; set exactly when ingredientId is. */
  variantId?: string | number | null | undefined;
};

/** Who reads a spell: its author alone, or every member of its coven. */
export type SpellVisibility =
  | 'private'
  | 'workspace';

export type StockInput = {
  acquiredDate?: string | null | undefined;
  /** A missing threshold takes the unit dimension's default on add. */
  lowStockThreshold?: number | null | undefined;
  quantityOnHand?: number | null | undefined;
  source?: string | null | undefined;
  unit?: InventoryUnit | null | undefined;
};

/** An ingredient to link, or the name of one not entered: exactly one of the two. */
export type SubstituteInput = {
  ingredientId?: string | number | null | undefined;
  name?: string | null | undefined;
  /** One of the linked ingredient's forms, when the substitute is that form alone. */
  substituteVariantId?: string | number | null | undefined;
};

/** Where the substitute picker lists an entry: the coven's own cupboard (yours), or the rest of the compendium. */
export type SuggestionGroup =
  | 'compendium'
  | 'yours';

/** What a support request is about. */
export type SupportAbout =
  | 'accessibility'
  | 'account'
  | 'bug'
  | 'compendium'
  | 'feedback'
  | 'privacy'
  | 'question';

/** What the Support dialog offers a visitor. */
export type SupportDialogKind =
  | 'form'
  | 'signedOut'
  | 'timedOut'
  | 'unverified';

/** Whether the sender or staff wrote a message. */
export type SupportReplyAuthorRole =
  | 'sender'
  | 'staff';

export type SupportRequestInput = {
  about: SupportAbout;
  /** The HTTP status of the error page, if any. */
  errorCode?: number | null | undefined;
  /** The digest of the error page, if any. */
  errorReference?: string | null | undefined;
  /** 1 to 4000 characters. */
  message: string;
  /** The page the sender was on, at most 500 characters; a coven's slug is replaced when it is stored. */
  path?: string | null | undefined;
  /** 1 to 120 characters. */
  subject: string;
};

export type SupportStatus =
  | 'closed'
  | 'open'
  | 'resolved'
  | 'waiting_on_sender';

/** Which entries a search keeps by toxicity: any (no filter); toxic, flagged on the entry or on any live form; or not_toxic, flagged on neither. */
export type ToxicFilter =
  | 'any'
  | 'not_toxic'
  | 'toxic';

/** A change to a jar the coven holds; a field left out keeps its value. */
export type UpdateJarInput = {
  id: string | number;
  input: StockInput;
};

/** Changes a spell: a field left out keeps its value, and null clears it. Visibility only widens once the spell is complete. */
export type UpdateSpellInput = {
  /** The whole set of categories the spell is assigned: one left out is unassigned. Left out, they are unchanged. */
  categoryIds?: Array<string | number> | null | undefined;
  dayOfWeek?: string | null | undefined;
  /** Required, though it may be null: the revision this save was written against, which a newer one refuses. Null writes regardless. */
  expectedRevision?: number | null | undefined;
  intent?: string | null | undefined;
  jarDescription?: string | null | undefined;
  moonPhase?: string | null | undefined;
  note?: string | null | undefined;
  sealWaxColor?: string | null | undefined;
  status?: SpellStatus | null | undefined;
  /** The whole recipe, in order: a saved step left out is removed. Left out, the recipe is unchanged. */
  steps?: Array<SpellStepInput> | null | undefined;
  /** Required once the status is complete. */
  title?: string | null | undefined;
  visibility?: SpellVisibility | null | undefined;
};

export type UserRole =
  | 'admin'
  | 'curator'
  | 'user';

/** A working as recorded or changed. On a change, a field left out keeps its value; `note` null clears it. */
export type WorkingInput = {
  note?: string | null | undefined;
  /** In order. Left out: on record, the recorder alone; on change, unchanged. */
  participants?: Array<WorkingParticipantInput> | null | undefined;
  /** Left out: on record, the coven, capped at the spell’s; on change, unchanged. A complete working only widens. */
  visibility?: WorkingVisibility | null | undefined;
  workedOn: string;
};

/** A coven member by `userId`, or a name typed for anyone else: exactly one. */
export type WorkingParticipantInput = {
  name?: string | null | undefined;
  userId?: string | number | null | undefined;
};

export type WorkingStatus =
  | 'complete'
  | 'draft';

/** Who reads a working: its recorder alone, or every member of the coven. Never wider than its spell. */
export type WorkingVisibility =
  | 'private'
  | 'workspace';

export type WorkspaceRole =
  | 'member'
  | 'owner'
  | 'viewer';

export type ZodiacSignInput = {
  description: string;
  name: string;
};

export type CardArrivalsCsvQueryVariables = Exact<{
  query?: string | null | undefined;
}>;


export type CardArrivalsCsvQuery = { cardArrivalsCsv: string };

export type InvitationCardAttemptsQueryVariables = Exact<{
  batchId: string | number;
  first: number;
  after?: string | null | undefined;
}>;


export type InvitationCardAttemptsQuery = { invitationCardAttempts: { edges: Array<{ node: { id: string, reason: InvitationCardAttemptReason, attempts: number, cardPosition: number | null, firstAttemptedAt: string, lastAttemptedAt: string, account: { id: string, name: string, email: string } | null } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } };

export type RevokeInvitationCardBatchMutationVariables = Exact<{
  batchId: string | number;
}>;


export type RevokeInvitationCardBatchMutation = { revokeInvitationCardBatch: Array<{ id: string }> };

export type CreateInvitationCardsMutationVariables = Exact<{
  sheets: number;
  expiresAt: string;
  beta: boolean;
  note?: string | null | undefined;
}>;


export type CreateInvitationCardsMutation = { createInvitationCards: { batchId: string, expiresAt: string, tokens: Array<string> } };

export type RevokeAdminInvitationMutationVariables = Exact<{
  id: string | number;
}>;


export type RevokeAdminInvitationMutation = { revokeAdminInvitation: { id: string } };

export type CreateAdminInvitationMutationVariables = Exact<{
  email: string;
  siteRole: InvitableSiteRole;
  note?: string | null | undefined;
}>;


export type CreateAdminInvitationMutation = { createAdminInvitation: { id: string } };

export type CompendiumFacetCountsQueryVariables = Exact<{
  query?: string | null | undefined;
  forms?: Array<string> | string | null | undefined;
  withoutReferences?: boolean | null | undefined;
  withoutForms?: boolean | null | undefined;
  elements?: Array<IngredientElement> | IngredientElement | null | undefined;
  categoryIds?: Array<string | number> | string | number | null | undefined;
  categoryMode?: CategoryMode | null | undefined;
  deityIds?: Array<string | number> | string | number | null | undefined;
  zodiacSigns?: Array<string> | string | null | undefined;
  celestialBodies?: Array<string> | string | null | undefined;
  toxic?: ToxicFilter | null | undefined;
  reviewed?: boolean | null | undefined;
  listing?: CompendiumListing | null | undefined;
  covenIds?: Array<string | number> | string | number | null | undefined;
  covensNot?: boolean | null | undefined;
}>;


export type CompendiumFacetCountsQuery = { compendiumFacets: { withoutReferences: number, withoutForms: number, forms: Array<{ value: string, count: number }>, deities: Array<{ value: string, count: number }>, categories: Array<{ value: string, count: number }>, zodiacSigns: Array<{ value: string, count: number }>, celestialBodies: Array<{ value: string, count: number }>, elements: Array<{ value: IngredientElement, count: number }>, toxic: Array<{ value: ToxicFilter, count: number }>, reviewed: Array<{ value: boolean, count: number }> | null } };

export type CovenFacetCountsQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  forms?: Array<string> | string | null | undefined;
  elements?: Array<IngredientElement> | IngredientElement | null | undefined;
  categoryIds?: Array<string | number> | string | number | null | undefined;
  categoryMode?: CategoryMode | null | undefined;
  deityIds?: Array<string | number> | string | number | null | undefined;
  zodiacSigns?: Array<string> | string | null | undefined;
  celestialBodies?: Array<string> | string | null | undefined;
  toxic?: ToxicFilter | null | undefined;
  source?: IngredientSource | null | undefined;
  inStock?: boolean | null | undefined;
  lowStockOnly?: boolean | null | undefined;
}>;


export type CovenFacetCountsQuery = { workspaceIngredientFacets: { inStock: number, lowStockOnly: number, forms: Array<{ value: string, count: number }>, deities: Array<{ value: string, count: number }>, categories: Array<{ value: string, count: number }>, zodiacSigns: Array<{ value: string, count: number }>, celestialBodies: Array<{ value: string, count: number }>, elements: Array<{ value: IngredientElement, count: number }>, toxic: Array<{ value: ToxicFilter, count: number }>, source: Array<{ value: IngredientSource, count: number }> } };

export type CreateWorkspaceMutationVariables = Exact<{
  name: string;
}>;


export type CreateWorkspaceMutation = { createWorkspace: { id: string, name: string, slug: string } };

export type AnnotateCupboardEntryMutationVariables = Exact<{
  workspaceId: string | number;
  ingredientId: string | number;
  input: CupboardEntryInput;
  expectedRevision?: number | null | undefined;
}>;


export type AnnotateCupboardEntryMutation = { annotateCupboardEntry: { id: string, revision: number } };

export type DeleteWorkspaceMutationVariables = Exact<{
  workspaceId: string | number;
}>;


export type DeleteWorkspaceMutation = { deleteWorkspace: boolean };

export type SaveDocumentDraftMutationVariables = Exact<{
  documentId: string | number;
  body: string;
  expectedRevision?: number | null | undefined;
}>;


export type SaveDocumentDraftMutation = { saveDocumentDraft: { id: string, revision: number } };

export type DiscardDocumentDraftMutationVariables = Exact<{
  documentId: string | number;
  expectedRevision: number;
}>;


export type DiscardDocumentDraftMutation = { discardDocumentDraft: string };

export type PublishDocumentDraftMutationVariables = Exact<{
  documentId: string | number;
  expectedRevision?: number | null | undefined;
}>;


export type PublishDocumentDraftMutation = { publishDocumentDraft: { number: number } };

export type EmailDocumentsToEveryAccountMutationVariables = Exact<{
  summaries: Array<DocumentMailingSummaryInput> | DocumentMailingSummaryInput;
}>;


export type EmailDocumentsToEveryAccountMutation = { emailDocumentsToEveryAccount: { canSend: boolean } };

export type ResumeDocumentMailingMutationVariables = Exact<{
  mailingId: string | number;
}>;


export type ResumeDocumentMailingMutation = { resumeDocumentMailing: { canSend: boolean } };

export type SetEmailMutationVariables = Exact<{
  email: string;
  next?: string | null | undefined;
}>;


export type SetEmailMutation = { setEmail: { id: string, email: string } };

export type CreateCategoryGroupMutationVariables = Exact<{
  input: CategoryGroupInput;
}>;


export type CreateCategoryGroupMutation = { createCategoryGroup: { id: string, slug: string } };

export type UpdateCategoryGroupMutationVariables = Exact<{
  id: string | number;
  input: CategoryGroupInput;
}>;


export type UpdateCategoryGroupMutation = { updateCategoryGroup: { id: string, slug: string } };

export type DeleteCategoryGroupMutationVariables = Exact<{
  id: string | number;
  moveTo?: string | number | null | undefined;
}>;


export type DeleteCategoryGroupMutation = { deleteCategoryGroup: string };

export type CreateIngredientFormGroupMutationVariables = Exact<{
  input: IngredientFormGroupInput;
}>;


export type CreateIngredientFormGroupMutation = { createIngredientFormGroup: { id: string, slug: string, icon: FormGroupIcon | null } };

export type UpdateIngredientFormGroupMutationVariables = Exact<{
  id: string | number;
  input: IngredientFormGroupInput;
}>;


export type UpdateIngredientFormGroupMutation = { updateIngredientFormGroup: { id: string, slug: string, icon: FormGroupIcon | null } };

export type DeleteIngredientFormGroupMutationVariables = Exact<{
  id: string | number;
  moveTo?: string | number | null | undefined;
}>;


export type DeleteIngredientFormGroupMutation = { deleteIngredientFormGroup: string };

export type CreateDeityTraditionMutationVariables = Exact<{
  input: DeityTraditionInput;
}>;


export type CreateDeityTraditionMutation = { createDeityTradition: { id: string, slug: string } };

export type UpdateDeityTraditionMutationVariables = Exact<{
  id: string | number;
  input: DeityTraditionInput;
}>;


export type UpdateDeityTraditionMutation = { updateDeityTradition: { id: string, slug: string } };

export type DeleteDeityTraditionMutationVariables = Exact<{
  id: string | number;
  moveTo?: string | number | null | undefined;
}>;


export type DeleteDeityTraditionMutation = { deleteDeityTradition: string };

export type CreateCategoryMutationVariables = Exact<{
  input: CategoryInput;
}>;


export type CreateCategoryMutation = { createCategory: { id: string, slug: string } };

export type UpdateCategoryMutationVariables = Exact<{
  id: string | number;
  input: CategoryInput;
}>;


export type UpdateCategoryMutation = { updateCategory: { id: string, slug: string } };

export type DeleteCategoryMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteCategoryMutation = { deleteCategory: string };

export type CreateIngredientFormValueMutationVariables = Exact<{
  input: IngredientFormValueInput;
}>;


export type CreateIngredientFormValueMutation = { createIngredientFormValue: { id: string, slug: string } };

export type UpdateIngredientFormValueMutationVariables = Exact<{
  id: string | number;
  input: IngredientFormValueInput;
}>;


export type UpdateIngredientFormValueMutation = { updateIngredientFormValue: { id: string, slug: string } };

export type DeleteIngredientFormValueMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteIngredientFormValueMutation = { deleteIngredientFormValue: string };

export type CreateDeityMutationVariables = Exact<{
  input: DeityInput;
}>;


export type CreateDeityMutation = { createDeity: { id: string, slug: string } };

export type UpdateDeityMutationVariables = Exact<{
  id: string | number;
  input: DeityInput;
}>;


export type UpdateDeityMutation = { updateDeity: { id: string, slug: string } };

export type DeleteDeityMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteDeityMutation = { deleteDeity: string };

export type CreateCelestialBodyMutationVariables = Exact<{
  input: CelestialBodyInput;
}>;


export type CreateCelestialBodyMutation = { createCelestialBody: { id: string } };

export type UpdateCelestialBodyMutationVariables = Exact<{
  id: string | number;
  input: CelestialBodyInput;
}>;


export type UpdateCelestialBodyMutation = { updateCelestialBody: { id: string } };

export type DeleteCelestialBodyMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteCelestialBodyMutation = { deleteCelestialBody: string };

export type CreateZodiacSignMutationVariables = Exact<{
  input: ZodiacSignInput;
}>;


export type CreateZodiacSignMutation = { createZodiacSign: { id: string } };

export type UpdateZodiacSignMutationVariables = Exact<{
  id: string | number;
  input: ZodiacSignInput;
}>;


export type UpdateZodiacSignMutation = { updateZodiacSign: { id: string } };

export type DeleteZodiacSignMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteZodiacSignMutation = { deleteZodiacSign: string };

export type CreateHelpArticleMutationVariables = Exact<{
  input: HelpArticleInput;
}>;


export type CreateHelpArticleMutation = { createHelpArticle: { id: string, slug: string } };

export type UpdateHelpArticleMutationVariables = Exact<{
  id: string | number;
  input: HelpArticlePatch;
}>;


export type UpdateHelpArticleMutation = { updateHelpArticle: { id: string, slug: string } };

export type DeleteHelpArticleMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteHelpArticleMutation = { deleteHelpArticle: string };

export type HelpRenameEffectsQueryVariables = Exact<{
  id: string | number;
  title: string;
}>;


export type HelpRenameEffectsQuery = { helpRenameEffects: { oldPath: string, newPath: string, quickLinks: Array<string>, articles: Array<{ id: string, title: string }> } };

export type OrderHelpGuidesMutationVariables = Exact<{
  ids: Array<string | number> | string | number;
}>;


export type OrderHelpGuidesMutation = { orderHelpGuides: Array<{ id: string }> };

export type OrderHelpSubPagesMutationVariables = Exact<{
  id: string | number;
  input: HelpArticlePatch;
}>;


export type OrderHelpSubPagesMutation = { updateHelpArticle: { id: string } };

export type OrderHelpFaqMutationVariables = Exact<{
  ids: Array<string | number> | string | number;
}>;


export type OrderHelpFaqMutation = { orderHelpFaq: Array<{ id: string }> };

export type SetHelpArticleShownMutationVariables = Exact<{
  id: string | number;
  shown: boolean;
}>;


export type SetHelpArticleShownMutation = { setHelpArticleShown: { id: string } };

export type AddCupboardEntryMutationVariables = Exact<{
  workspaceId: string | number;
  ingredientId: string | number;
}>;


export type AddCupboardEntryMutation = { addCupboardEntry: { id: string } };

export type RemoveCupboardEntryMutationVariables = Exact<{
  workspaceId: string | number;
  ingredientId: string | number;
}>;


export type RemoveCupboardEntryMutation = { removeCupboardEntry: string };

export type MakeItOursMutationVariables = Exact<{
  workspaceId: string | number;
  ingredientId: string | number;
}>;


export type MakeItOursMutation = { convertCompendiumEntryToLocal: { entry: { id: string } } };

export type DeleteOwnIngredientMutationVariables = Exact<{
  id: string | number;
  workspaceId: string | number;
}>;


export type DeleteOwnIngredientMutation = { deleteIngredient: string };

export type SetCompendiumEntryReviewedMutationVariables = Exact<{
  id: string | number;
  reviewed: boolean;
}>;


export type SetCompendiumEntryReviewedMutation = { setCompendiumEntryReviewed: { id: string } };

export type SetCompendiumEntryShownMutationVariables = Exact<{
  id: string | number;
  shown: boolean;
}>;


export type SetCompendiumEntryShownMutation = { setCompendiumEntryShown: { id: string } };

export type PickerCategoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type PickerCategoriesQuery = { categories: { edges: Array<{ node: { id: string, name: string, description: string, group: { id: string, name: string, colorDark: string, colorLight: string } } }> } };

export type CompendiumEntryUsersQueryVariables = Exact<{
  id: string | number;
}>;


export type CompendiumEntryUsersQuery = { compendiumEntryUsers: number };

export type PossibleDuplicatesQueryVariables = Exact<{
  workspaceId?: string | number | null | undefined;
  name: string;
  first?: number | null | undefined;
}>;


export type PossibleDuplicatesQuery = { possibleDuplicates: { edges: Array<{ node: { id: string, name: string, canonicalName: string | null, nomenclature: Nomenclature, slug: string, isGlobal: boolean, inCupboard: boolean } }> } };

export type CompendiumMatchesQueryVariables = Exact<{
  workspaceId: string | number;
  name: string;
  first?: number | null | undefined;
}>;


export type CompendiumMatchesQuery = { compendiumMatches: { edges: Array<{ node: { id: string, name: string, canonicalName: string | null, nomenclature: Nomenclature, slug: string, isGlobal: boolean, inCupboard: boolean } }> } };

export type CreateWorkspaceIngredientMutationVariables = Exact<{
  workspaceId: string | number;
  input: IngredientInput;
}>;


export type CreateWorkspaceIngredientMutation = { createWorkspaceIngredient: { id: string, name: string, slug: string, revision: number, stock: Array<{ quantityOnHand: number | null, unit: InventoryUnit | null, variant: { form: string } }> } };

export type UpdateWorkspaceIngredientMutationVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
  input: IngredientUpdateInput;
  expectedRevision?: number | null | undefined;
}>;


export type UpdateWorkspaceIngredientMutation = { updateIngredient: { id: string, name: string, slug: string, revision: number } };

export type AddCupboardEntryFromFormMutationVariables = Exact<{
  workspaceId: string | number;
  ingredientId: string | number;
  input?: CupboardEntryInput | null | undefined;
}>;


export type AddCupboardEntryFromFormMutation = { addCupboardEntry: { id: string } };

export type CreateCompendiumIngredientMutationVariables = Exact<{
  input: CompendiumIngredientInput;
  endRedirect?: boolean | null | undefined;
}>;


export type CreateCompendiumIngredientMutation = { createCompendiumIngredient: { id: string, name: string, slug: string, revision: number } };

export type UpdateCompendiumIngredientMutationVariables = Exact<{
  id: string | number;
  input: CompendiumIngredientUpdateInput;
  endRedirect?: boolean | null | undefined;
  expectedRevision?: number | null | undefined;
}>;


export type UpdateCompendiumIngredientMutation = { updateCompendiumIngredient: { id: string, name: string, slug: string, revision: number } };

export type DeleteCompendiumIngredientMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteCompendiumIngredientMutation = { deleteCompendiumIngredient: string };

export type DeleteWorkspaceIngredientMutationVariables = Exact<{
  id: string | number;
  workspaceId: string | number;
}>;


export type DeleteWorkspaceIngredientMutation = { deleteIngredient: string };

export type PromoteFolkNameMutationVariables = Exact<{
  workspaceId?: string | number | null | undefined;
  id: string | number;
  folkNameId: string | number;
}>;


export type PromoteFolkNameMutation = { promoteFolkName: { id: string, name: string, slug: string, folkNames: Array<{ id: string, name: string }> } };

export type DuplicateQuickLookQueryVariables = Exact<{
  id: string | number;
  workspaceId: string | number;
}>;


export type DuplicateQuickLookQuery = { ingredient: { id: string, name: string, canonicalName: string | null, nomenclature: Nomenclature, description: string | null, safetyNotes: string | null, toxic: boolean, isGlobal: boolean, retired: boolean, reviewedAt: string | null, elements: Array<IngredientElement> | null, celestialBodies: Array<string> | null, zodiacSigns: Array<string> | null, colors: Array<string> | null, audit: { createdAt: string, updatedAt: string }, cupboardEntry: { label: string | null, description: string | null, safetyNotes: string | null, elements: Array<IngredientElement> | null, celestialBodies: Array<string> | null, zodiacSigns: Array<string> | null, colors: Array<string> | null } | null, folkNames: Array<{ name: string }>, categories: Array<{ id: string, name: string, slug: string, group: { id: string, name: string, colorDark: string, colorLight: string } }>, deities: Array<{ name: string, deity: { otherNames: Array<string>, tradition: { name: string } } | null }>, variants: Array<{ id: string, form: string, safetyNotes: string | null, toxic: boolean, formChoice: { group: { icon: FormGroupIcon | null } } | null }>, stock: Array<{ id: string, quantityOnHand: number | null, unit: InventoryUnit | null, lowStockThreshold: number | null, variant: { id: string } }> } };

export type CreateReferenceMutationVariables = Exact<{
  workspaceId?: string | number | null | undefined;
  input: ReferenceInput;
}>;


export type CreateReferenceMutation = { createReference: { id: string, citation: string, isGlobal: boolean, kind: ReferenceKind, authors: string | null, title: string, container: string | null } };

export type UpdateReferenceMutationVariables = Exact<{
  workspaceId?: string | number | null | undefined;
  id: string | number;
  input: ReferenceInput;
}>;


export type UpdateReferenceMutation = { updateReference: { id: string, citation: string, isGlobal: boolean, kind: ReferenceKind, authors: string | null, title: string, container: string | null } };

export type ReferenceQueryVariables = Exact<{
  workspaceId?: string | number | null | undefined;
  id: string | number;
}>;


export type ReferenceQuery = { reference: { id: string, kind: ReferenceKind, title: string, authors: string | null, container: string | null, contributors: string | null, edition: string | null, volume: string | null, issue: string | null, series: string | null, place: string | null, publisher: string | null, published: string | null, pages: string | null, host: string | null, url: string | null, modified: string | null, accessed: string | null, note: string | null, scholarly: boolean } };

export type ReferenceSuggestionsQueryVariables = Exact<{
  workspaceId?: string | number | null | undefined;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type ReferenceSuggestionsQuery = { referenceSuggestions: { edges: Array<{ node: { id: string, citation: string, isGlobal: boolean, kind: ReferenceKind, authors: string | null, title: string, container: string | null } }> } };

export type IngredientSummaryQueryVariables = Exact<{
  id: string | number;
  workspaceId?: string | number | null | undefined;
}>;


export type IngredientSummaryQuery = { ingredient: { id: string, name: string, canonicalName: string | null, description: string | null, nomenclature: Nomenclature, isGlobal: boolean, slug: string, elements: Array<IngredientElement> | null, celestialBodies: Array<string> | null, zodiacSigns: Array<string> | null, colors: Array<string> | null, variants: Array<{ id: string, form: string, elements: Array<IngredientElement> | null, celestialBodies: Array<string> | null, zodiacSigns: Array<string> | null, colors: Array<string> | null, formChoice: { group: { icon: FormGroupIcon | null } } | null }> } };

export type FormSuggestionsQueryVariables = Exact<{
  workspaceId?: string | number | null | undefined;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type FormSuggestionsQuery = { formSuggestions: { edges: Array<{ node: { id: string | null, value: string, description: string | null, group: string | null, icon: FormGroupIcon | null, curated: boolean, claimants: Array<{ name: string, canonicalName: string | null }> } }> } };

export type CommonNameSuggestionsQueryVariables = Exact<{
  workspaceId?: string | number | null | undefined;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type CommonNameSuggestionsQuery = { commonNameSuggestions: { edges: Array<{ node: { value: string, claimants: Array<{ name: string, canonicalName: string | null }> } }> } };

export type CelestialBodySuggestionsQueryVariables = Exact<{
  workspaceId?: string | number | null | undefined;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type CelestialBodySuggestionsQuery = { celestialBodySuggestions: { edges: Array<{ node: { value: string, description: string | null, curated: boolean } }> } };

export type ZodiacSuggestionsQueryVariables = Exact<{
  workspaceId?: string | number | null | undefined;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type ZodiacSuggestionsQuery = { zodiacSuggestions: { edges: Array<{ node: { value: string, description: string | null, curated: boolean } }> } };

export type DeitySuggestionsQueryVariables = Exact<{
  workspaceId?: string | number | null | undefined;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type DeitySuggestionsQuery = { deitySuggestions: { edges: Array<{ node: { id: string | null, value: string, description: string | null, tradition: string | null, matchedName: string | null, curated: boolean } }> } };

export type IngredientSuggestionsQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type IngredientSuggestionsQuery = { ingredientSuggestions: { edges: Array<{ group: SuggestionGroup, node: { id: string, name: string, canonicalName: string | null, description: string | null, isGlobal: boolean, cupboardEntry: { label: string | null } | null, variants: Array<{ id: string, form: string, formChoice: { id: string, group: { id: string, name: string } } | null }> } }> } };

export type CompendiumSubstitutesQueryVariables = Exact<{
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type CompendiumSubstitutesQuery = { compendium: { edges: Array<{ node: { id: string, name: string, canonicalName: string | null, description: string | null, isGlobal: boolean, variants: Array<{ id: string, form: string, formChoice: { id: string, group: { id: string, name: string } } | null }> } }> } };

export type IngredientSearchMatchesQueryVariables = Exact<{
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type IngredientSearchMatchesQuery = { compendium: { pageInfo: { hasNextPage: boolean }, edges: Array<{ node: { id: string, slug: string, name: string, canonicalName: string | null, nomenclature: Nomenclature } }> } };

export type IngredientSearchCupboardMatchesQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type IngredientSearchCupboardMatchesQuery = { workspaceIngredients: { pageInfo: { hasNextPage: boolean }, edges: Array<{ node: { id: string, slug: string, name: string, canonicalName: string | null, nomenclature: Nomenclature, cupboardEntry: { label: string | null } | null } }> } };

export type GrimoireSearchMatchesQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  status?: SpellStatus | null | undefined;
  first?: number | null | undefined;
}>;


export type GrimoireSearchMatchesQuery = { grimoire: { pageInfo: { hasNextPage: boolean }, edges: Array<{ node: { id: string, title: string | null } }> } };

export type AcceptInvitationMutationVariables = Exact<{
  token: string;
}>;


export type AcceptInvitationMutation = { acceptInvitation: { id: string } };

export type RecordCardAttemptMutationVariables = Exact<{
  token: string;
}>;


export type RecordCardAttemptMutation = { recordCardAttempt: boolean };

export type CreateInvitationMutationVariables = Exact<{
  workspaceId: string | number;
  email: string;
  role: InvitableRole;
}>;


export type CreateInvitationMutation = { createInvitation: { id: string } };

export type LeaveWorkspaceMutationVariables = Exact<{
  workspaceId: string | number;
}>;


export type LeaveWorkspaceMutation = { leaveWorkspace: boolean };

export type PromoteSuccessorMutationVariables = Exact<{
  workspaceId: string | number;
  userId: string | number;
  role: WorkspaceRole;
}>;


export type PromoteSuccessorMutation = { updateMemberRole: { role: WorkspaceRole } };

export type PauseMemberAccessMutationVariables = Exact<{
  workspaceId: string | number;
  userId: string | number;
  until?: string | null | undefined;
  note?: string | null | undefined;
  message?: string | null | undefined;
}>;


export type PauseMemberAccessMutation = { pauseMemberAccess: { id: string } };

export type LiftMemberAccessPauseMutationVariables = Exact<{
  workspaceId: string | number;
  userId: string | number;
}>;


export type LiftMemberAccessPauseMutation = { liftMemberAccessPause: { id: string } };

export type MemberPausesQueryVariables = Exact<{
  workspaceId: string | number;
  userId: string | number;
}>;


export type MemberPausesQuery = { workspace: { id: string, memberPauses: { edges: Array<{ node: { id: string, until: string | null, note: string | null, liftedAt: string | null, audit: { createdAt: string }, setBy: { id: string, name: string | null }, liftedBy: { id: string, name: string | null } | null } }> } } };

export type RemoveMemberMutationVariables = Exact<{
  workspaceId: string | number;
  userId: string | number;
}>;


export type RemoveMemberMutation = { removeMember: boolean };

export type UpdateMemberRoleMutationVariables = Exact<{
  workspaceId: string | number;
  userId: string | number;
  role: WorkspaceRole;
}>;


export type UpdateMemberRoleMutation = { updateMemberRole: { role: WorkspaceRole, user: { id: string } } };

export type SetNameMutationVariables = Exact<{
  name: string;
}>;


export type SetNameMutation = { setName: { id: string, name: string } };

export type SetPasswordMutationVariables = Exact<{
  newPassword: string;
}>;


export type SetPasswordMutation = { setPassword: boolean };

export type RemoveDeclinedInvitationMutationVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
}>;


export type RemoveDeclinedInvitationMutation = { revokeInvitation: { id: string } };

export type RevokeInvitationMutationVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
}>;


export type RevokeInvitationMutation = { revokeInvitation: { id: string } };

export type AcceptInvitationByIdMutationVariables = Exact<{
  id: string | number;
}>;


export type AcceptInvitationByIdMutation = { acceptInvitationById: { id: string, acceptedAt: string | null } };

export type DeclineInvitationByIdMutationVariables = Exact<{
  id: string | number;
}>;


export type DeclineInvitationByIdMutation = { declineInvitationById: { id: string, declinedAt: string | null } };

export type WorkingDeductionPreviewQueryVariables = Exact<{
  workspaceId: string | number;
  spellId: string | number;
}>;


export type WorkingDeductionPreviewQuery = { workingDeductionPreview: { deductions: Array<{ before: number, inventoryItemId: string, lowStockThreshold: number | null, quantity: number, shortfall: number, stepId: string, unit: InventoryUnit }>, warnings: Array<{ position: number, reason: NotDeductedReason, stepId: string, stepName: string | null }> } };

export type CompleteWorkingMutationVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
}>;


export type CompleteWorkingMutation = { completeWorking: { working: { id: string, status: WorkingStatus, completedAt: string | null }, warnings: Array<{ position: number, reason: NotDeductedReason, stepId: string, stepName: string | null }> } };

export type RecordWorkingMutationVariables = Exact<{
  workspaceId: string | number;
  spellId: string | number;
  input: WorkingInput;
}>;


export type RecordWorkingMutation = { recordWorking: { id: string, status: WorkingStatus, note: string | null, workedOn: string, visibility: WorkingVisibility, participants: Array<{ id: string, name: string | null, userId: string | null }> } };

export type UpdateWorkingMutationVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
  input: WorkingInput;
}>;


export type UpdateWorkingMutation = { updateWorking: { id: string, status: WorkingStatus, note: string | null, workedOn: string, visibility: WorkingVisibility, participants: Array<{ id: string, name: string | null, userId: string | null }> } };

export type RecordWorkingMembersQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type RecordWorkingMembersQuery = { workspace: { id: string, members: { edges: Array<{ node: { user: { id: string, name: string | null } } }> } } };

export type SendSignedOutSupportRequestMutationVariables = Exact<{
  input: SignedOutSupportRequestInput;
}>;


export type SendSignedOutSupportRequestMutation = { sendSignedOutSupportRequest: boolean };

export type CreateSpellMutationVariables = Exact<{
  workspaceId: string | number;
  input: SpellInput;
}>;


export type CreateSpellMutation = { createSpell: { id: string, revision: number, title: string | null, intent: string | null, jarDescription: string | null, sealWaxColor: string | null, moonPhase: string | null, dayOfWeek: string | null, note: string | null, visibility: SpellVisibility, status: SpellStatus, steps: Array<{ id: string, name: string | null, form: string | null, quantity: number | null, unit: InventoryUnit | null, body: string | null, ingredient: { id: string, toxic: boolean, safetyNotes: string | null, categories: Array<{ id: string, name: string }>, stock: Array<{ unit: InventoryUnit | null, quantityOnHand: number | null, lowStockThreshold: number | null, variant: { id: string } }> } | null, variant: { id: string, toxic: boolean, safetyNotes: string | null, categories: Array<{ id: string, name: string }>, formChoice: { group: { icon: FormGroupIcon | null } } | null } | null }> } };

export type UpdateSpellMutationVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
  input: UpdateSpellInput;
}>;


export type UpdateSpellMutation = { updateSpell: { id: string, revision: number, title: string | null, intent: string | null, jarDescription: string | null, sealWaxColor: string | null, moonPhase: string | null, dayOfWeek: string | null, note: string | null, visibility: SpellVisibility, status: SpellStatus, steps: Array<{ id: string, name: string | null, form: string | null, quantity: number | null, unit: InventoryUnit | null, body: string | null, ingredient: { id: string, toxic: boolean, safetyNotes: string | null, categories: Array<{ id: string, name: string }>, stock: Array<{ unit: InventoryUnit | null, quantityOnHand: number | null, lowStockThreshold: number | null, variant: { id: string } }> } | null, variant: { id: string, toxic: boolean, safetyNotes: string | null, categories: Array<{ id: string, name: string }>, formChoice: { group: { icon: FormGroupIcon | null } } | null } | null }> } };

export type SpellBuilderReloadQueryVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
}>;


export type SpellBuilderReloadQuery = { spell: { id: string, revision: number, title: string | null, intent: string | null, jarDescription: string | null, sealWaxColor: string | null, moonPhase: string | null, dayOfWeek: string | null, note: string | null, visibility: SpellVisibility, status: SpellStatus, categories: Array<{ id: string }>, steps: Array<{ id: string, name: string | null, form: string | null, quantity: number | null, unit: InventoryUnit | null, body: string | null, ingredient: { id: string, toxic: boolean, safetyNotes: string | null, categories: Array<{ id: string, name: string }>, stock: Array<{ unit: InventoryUnit | null, quantityOnHand: number | null, lowStockThreshold: number | null, variant: { id: string } }> } | null, variant: { id: string, toxic: boolean, safetyNotes: string | null, categories: Array<{ id: string, name: string }>, formChoice: { group: { icon: FormGroupIcon | null } } | null } | null }> } };

export type SpellIngredientSuggestionsQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  first?: number | null | undefined;
  categoryIds?: Array<string | number> | string | number | null | undefined;
}>;


export type SpellIngredientSuggestionsQuery = { ingredientSuggestions: { edges: Array<{ group: SuggestionGroup, node: { id: string, name: string, canonicalName: string | null, retired: boolean, toxic: boolean, safetyNotes: string | null, cupboardEntry: { label: string | null } | null, categories: Array<{ id: string, name: string }>, variants: Array<{ id: string, form: string, toxic: boolean, safetyNotes: string | null, categories: Array<{ id: string, name: string }>, formChoice: { group: { icon: FormGroupIcon | null } } | null }>, stock: Array<{ unit: InventoryUnit | null, quantityOnHand: number | null, lowStockThreshold: number | null, variant: { id: string } }> } }> } };

export type SpellBuilderStepsQueryVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
}>;


export type SpellBuilderStepsQuery = { spell: { id: string, steps: Array<{ id: string, name: string | null, form: string | null, quantity: number | null, unit: InventoryUnit | null, body: string | null, ingredient: { id: string, toxic: boolean, safetyNotes: string | null, categories: Array<{ id: string, name: string }>, stock: Array<{ unit: InventoryUnit | null, quantityOnHand: number | null, lowStockThreshold: number | null, variant: { id: string } }> } | null, variant: { id: string, toxic: boolean, safetyNotes: string | null, categories: Array<{ id: string, name: string }>, formChoice: { group: { icon: FormGroupIcon | null } } | null } | null }> } };

export type RecordWorkingSetupQueryVariables = Exact<{
  workspaceId: string | number;
  spellId: string | number;
}>;


export type RecordWorkingSetupQuery = { spell: { id: string, steps: Array<{ id: string, name: string | null, form: string | null, ingredient: { id: string } | null, variant: { id: string } | null }> } };

export type DeleteSpellMutationVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
}>;


export type DeleteSpellMutation = { deleteSpell: string };

export type DuplicateSpellMutationVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
}>;


export type DuplicateSpellMutation = { duplicateSpell: { id: string } };

export type DeleteWorkingMutationVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
}>;


export type DeleteWorkingMutation = { deleteWorking: string };

export type SaveStockMutationVariables = Exact<{
  workspaceId: string | number;
  ingredientId: string | number;
  input: SaveStockInput;
}>;


export type SaveStockMutation = { saveStock: Array<{ id: string }> };

export type SupportDialogStateQueryVariables = Exact<{ [key: string]: never; }>;


export type SupportDialogStateQuery = { supportDialogState: { kind: SupportDialogKind, until: string | null } };

export type SendSupportRequestMutationVariables = Exact<{
  input: SupportRequestInput;
}>;


export type SendSupportRequestMutation = { sendSupportRequest: { id: string } };

export type SupportRequestByViewTokenQueryVariables = Exact<{
  token: string;
}>;


export type SupportRequestByViewTokenQuery = { supportRequestByViewToken: { id: string, about: SupportAbout, status: SupportStatus, subject: string, message: string, sentAt: string, replies: Array<{ id: string, authorRole: SupportReplyAuthorRole, body: string, sentAt: string }> } };

export type AssignSupportRequestMutationVariables = Exact<{
  id: string | number;
  assigneeId?: string | number | null | undefined;
}>;


export type AssignSupportRequestMutation = { assignSupportRequest: { id: string } };

export type SetSupportRequestCuratorVisibleMutationVariables = Exact<{
  id: string | number;
  visible: boolean;
}>;


export type SetSupportRequestCuratorVisibleMutation = { setSupportRequestCuratorVisible: { id: string } };

export type ResolveSupportRequestMutationVariables = Exact<{
  id: string | number;
}>;


export type ResolveSupportRequestMutation = { resolveSupportRequest: { id: string } };

export type SetSupportRequestIssueUrlMutationVariables = Exact<{
  id: string | number;
  issueUrl?: string | null | undefined;
}>;


export type SetSupportRequestIssueUrlMutation = { setSupportRequestIssueUrl: { id: string } };

export type ReplyToSupportRequestMutationVariables = Exact<{
  requestId: string | number;
  body: string;
  waitingOnSender?: boolean | null | undefined;
}>;


export type ReplyToSupportRequestMutation = { replyToSupportRequest: { id: string } };

export type AddSupportInternalNoteMutationVariables = Exact<{
  requestId: string | number;
  body: string;
}>;


export type AddSupportInternalNoteMutation = { addSupportInternalNote: { id: string } };

export type TimeOutSupportSenderMutationVariables = Exact<{
  userId: string | number;
  until?: string | null | undefined;
  note: string;
  message: string;
}>;


export type TimeOutSupportSenderMutation = { timeOutSupportSender: { id: string } };

export type TimeOutSignedOutSenderMutationVariables = Exact<{
  requestId: string | number;
  until?: string | null | undefined;
  note: string;
  message: string;
}>;


export type TimeOutSignedOutSenderMutation = { timeOutSignedOutSender: { id: string } };

export type LiftSupportTimeoutMutationVariables = Exact<{
  id: string | number;
}>;


export type LiftSupportTimeoutMutation = { liftSupportTimeout: { id: string } };

export type SendSupportMessageMutationVariables = Exact<{
  requestId: string | number;
  body: string;
}>;


export type SendSupportMessageMutation = { sendSupportMessage: { id: string } };

export type ResolveMySupportRequestMutationVariables = Exact<{
  id: string | number;
}>;


export type ResolveMySupportRequestMutation = { resolveMySupportRequest: { id: string } };

export type ReplyToSupportRequestByViewTokenMutationVariables = Exact<{
  token: string;
  body: string;
  website?: string | null | undefined;
}>;


export type ReplyToSupportRequestByViewTokenMutation = { replyToSupportRequestByViewToken: boolean };

export type AgreeToTermsMutationVariables = Exact<{
  version: AgreementVersionInput;
}>;


export type AgreeToTermsMutation = { agreeToTerms: { id: string, agreedTermsVersion: number | null, agreedDisclaimerVersion: number | null, agreedEthicsVersion: number | null } };

export type PauseUserAccessMutationVariables = Exact<{
  userId: string | number;
  until?: string | null | undefined;
  note: string;
  message: string;
}>;


export type PauseUserAccessMutation = { pauseUserAccess: { id: string } };

export type LiftUserAccessPauseMutationVariables = Exact<{
  userId: string | number;
}>;


export type LiftUserAccessPauseMutation = { liftUserAccessPause: { id: string } };

export type GrantWorkspaceCreationMutationVariables = Exact<{
  userId: string | number;
  note?: string | null | undefined;
}>;


export type GrantWorkspaceCreationMutation = { grantWorkspaceCreation: { id: string, canCreateWorkspace: boolean } };

export type RevokeWorkspaceCreationMutationVariables = Exact<{
  userId: string | number;
  note?: string | null | undefined;
}>;


export type RevokeWorkspaceCreationMutation = { revokeWorkspaceCreation: { id: string, canCreateWorkspace: boolean } };

export type PauseAdminRoleChangesMutationVariables = Exact<{ [key: string]: never; }>;


export type PauseAdminRoleChangesMutation = { pauseAdminRoleChanges: boolean };

export type ResumeAdminRoleChangesMutationVariables = Exact<{ [key: string]: never; }>;


export type ResumeAdminRoleChangesMutation = { resumeAdminRoleChanges: boolean };

export type SetUserRoleMutationVariables = Exact<{
  userId: string | number;
  role: UserRole;
  note?: string | null | undefined;
}>;


export type SetUserRoleMutation = { setUserRole: { id: string, role: UserRole, canCreateWorkspace: boolean } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const CardArrivalsCsvDocument = new TypedDocumentString(`
    query CardArrivalsCsv($query: String) {
  cardArrivalsCsv(query: $query)
}
    `) as unknown as TypedDocumentString<CardArrivalsCsvQuery, CardArrivalsCsvQueryVariables>;
export const InvitationCardAttemptsDocument = new TypedDocumentString(`
    query InvitationCardAttempts($batchId: ID!, $first: Int!, $after: String) {
  invitationCardAttempts(batchId: $batchId, first: $first, after: $after) {
    edges {
      node {
        id
        reason
        attempts
        cardPosition
        firstAttemptedAt
        lastAttemptedAt
        account {
          id
          name
          email
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `) as unknown as TypedDocumentString<InvitationCardAttemptsQuery, InvitationCardAttemptsQueryVariables>;
export const RevokeInvitationCardBatchDocument = new TypedDocumentString(`
    mutation RevokeInvitationCardBatch($batchId: ID!) {
  revokeInvitationCardBatch(batchId: $batchId) {
    id
  }
}
    `) as unknown as TypedDocumentString<RevokeInvitationCardBatchMutation, RevokeInvitationCardBatchMutationVariables>;
export const CreateInvitationCardsDocument = new TypedDocumentString(`
    mutation CreateInvitationCards($sheets: Int!, $expiresAt: DateTime!, $beta: Boolean!, $note: String) {
  createInvitationCards(
    sheets: $sheets
    expiresAt: $expiresAt
    beta: $beta
    note: $note
  ) {
    batchId
    expiresAt
    tokens
  }
}
    `) as unknown as TypedDocumentString<CreateInvitationCardsMutation, CreateInvitationCardsMutationVariables>;
export const RevokeAdminInvitationDocument = new TypedDocumentString(`
    mutation RevokeAdminInvitation($id: ID!) {
  revokeAdminInvitation(id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<RevokeAdminInvitationMutation, RevokeAdminInvitationMutationVariables>;
export const CreateAdminInvitationDocument = new TypedDocumentString(`
    mutation CreateAdminInvitation($email: String!, $siteRole: InvitableSiteRole!, $note: String) {
  createAdminInvitation(email: $email, siteRole: $siteRole, note: $note) {
    id
  }
}
    `) as unknown as TypedDocumentString<CreateAdminInvitationMutation, CreateAdminInvitationMutationVariables>;
export const CompendiumFacetCountsDocument = new TypedDocumentString(`
    query CompendiumFacetCounts($query: String, $forms: [String!], $withoutReferences: Boolean, $withoutForms: Boolean, $elements: [IngredientElement!], $categoryIds: [ID!], $categoryMode: CategoryMode, $deityIds: [ID!], $zodiacSigns: [String!], $celestialBodies: [String!], $toxic: ToxicFilter, $reviewed: Boolean, $listing: CompendiumListing, $covenIds: [ID!], $covensNot: Boolean) {
  compendiumFacets(
    query: $query
    forms: $forms
    withoutReferences: $withoutReferences
    withoutForms: $withoutForms
    elements: $elements
    categoryIds: $categoryIds
    categoryMode: $categoryMode
    deityIds: $deityIds
    zodiacSigns: $zodiacSigns
    celestialBodies: $celestialBodies
    toxic: $toxic
    reviewed: $reviewed
    listing: $listing
    covenIds: $covenIds
    covensNot: $covensNot
  ) {
    forms {
      value
      count
    }
    deities {
      value
      count
    }
    categories {
      value
      count
    }
    zodiacSigns {
      value
      count
    }
    celestialBodies {
      value
      count
    }
    elements {
      value
      count
    }
    toxic {
      value
      count
    }
    withoutReferences
    withoutForms
    reviewed {
      value
      count
    }
  }
}
    `) as unknown as TypedDocumentString<CompendiumFacetCountsQuery, CompendiumFacetCountsQueryVariables>;
export const CovenFacetCountsDocument = new TypedDocumentString(`
    query CovenFacetCounts($workspaceId: ID!, $query: String, $forms: [String!], $elements: [IngredientElement!], $categoryIds: [ID!], $categoryMode: CategoryMode, $deityIds: [ID!], $zodiacSigns: [String!], $celestialBodies: [String!], $toxic: ToxicFilter, $source: IngredientSource, $inStock: Boolean, $lowStockOnly: Boolean) {
  workspaceIngredientFacets(
    workspaceId: $workspaceId
    query: $query
    forms: $forms
    elements: $elements
    categoryIds: $categoryIds
    categoryMode: $categoryMode
    deityIds: $deityIds
    zodiacSigns: $zodiacSigns
    celestialBodies: $celestialBodies
    toxic: $toxic
    source: $source
    inStock: $inStock
    lowStockOnly: $lowStockOnly
  ) {
    forms {
      value
      count
    }
    deities {
      value
      count
    }
    categories {
      value
      count
    }
    zodiacSigns {
      value
      count
    }
    celestialBodies {
      value
      count
    }
    elements {
      value
      count
    }
    toxic {
      value
      count
    }
    source {
      value
      count
    }
    inStock
    lowStockOnly
  }
}
    `) as unknown as TypedDocumentString<CovenFacetCountsQuery, CovenFacetCountsQueryVariables>;
export const CreateWorkspaceDocument = new TypedDocumentString(`
    mutation CreateWorkspace($name: String!) {
  createWorkspace(name: $name) {
    id
    name
    slug
  }
}
    `) as unknown as TypedDocumentString<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>;
export const AnnotateCupboardEntryDocument = new TypedDocumentString(`
    mutation AnnotateCupboardEntry($workspaceId: ID!, $ingredientId: ID!, $input: CupboardEntryInput!, $expectedRevision: Int) {
  annotateCupboardEntry(
    workspaceId: $workspaceId
    ingredientId: $ingredientId
    input: $input
    expectedRevision: $expectedRevision
  ) {
    id
    revision
  }
}
    `) as unknown as TypedDocumentString<AnnotateCupboardEntryMutation, AnnotateCupboardEntryMutationVariables>;
export const DeleteWorkspaceDocument = new TypedDocumentString(`
    mutation DeleteWorkspace($workspaceId: ID!) {
  deleteWorkspace(workspaceId: $workspaceId)
}
    `) as unknown as TypedDocumentString<DeleteWorkspaceMutation, DeleteWorkspaceMutationVariables>;
export const SaveDocumentDraftDocument = new TypedDocumentString(`
    mutation SaveDocumentDraft($documentId: ID!, $body: String!, $expectedRevision: Int) {
  saveDocumentDraft(
    documentId: $documentId
    body: $body
    expectedRevision: $expectedRevision
  ) {
    id
    revision
  }
}
    `) as unknown as TypedDocumentString<SaveDocumentDraftMutation, SaveDocumentDraftMutationVariables>;
export const DiscardDocumentDraftDocument = new TypedDocumentString(`
    mutation DiscardDocumentDraft($documentId: ID!, $expectedRevision: Int!) {
  discardDocumentDraft(
    documentId: $documentId
    expectedRevision: $expectedRevision
  )
}
    `) as unknown as TypedDocumentString<DiscardDocumentDraftMutation, DiscardDocumentDraftMutationVariables>;
export const PublishDocumentDraftDocument = new TypedDocumentString(`
    mutation PublishDocumentDraft($documentId: ID!, $expectedRevision: Int) {
  publishDocumentDraft(
    documentId: $documentId
    expectedRevision: $expectedRevision
  ) {
    number
  }
}
    `) as unknown as TypedDocumentString<PublishDocumentDraftMutation, PublishDocumentDraftMutationVariables>;
export const EmailDocumentsToEveryAccountDocument = new TypedDocumentString(`
    mutation EmailDocumentsToEveryAccount($summaries: [DocumentMailingSummaryInput!]!) {
  emailDocumentsToEveryAccount(summaries: $summaries) {
    canSend
  }
}
    `) as unknown as TypedDocumentString<EmailDocumentsToEveryAccountMutation, EmailDocumentsToEveryAccountMutationVariables>;
export const ResumeDocumentMailingDocument = new TypedDocumentString(`
    mutation ResumeDocumentMailing($mailingId: ID!) {
  resumeDocumentMailing(mailingId: $mailingId) {
    canSend
  }
}
    `) as unknown as TypedDocumentString<ResumeDocumentMailingMutation, ResumeDocumentMailingMutationVariables>;
export const SetEmailDocument = new TypedDocumentString(`
    mutation SetEmail($email: String!, $next: String) {
  setEmail(email: $email, next: $next) {
    id
    email
  }
}
    `) as unknown as TypedDocumentString<SetEmailMutation, SetEmailMutationVariables>;
export const CreateCategoryGroupDocument = new TypedDocumentString(`
    mutation CreateCategoryGroup($input: CategoryGroupInput!) {
  createCategoryGroup(input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<CreateCategoryGroupMutation, CreateCategoryGroupMutationVariables>;
export const UpdateCategoryGroupDocument = new TypedDocumentString(`
    mutation UpdateCategoryGroup($id: ID!, $input: CategoryGroupInput!) {
  updateCategoryGroup(id: $id, input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<UpdateCategoryGroupMutation, UpdateCategoryGroupMutationVariables>;
export const DeleteCategoryGroupDocument = new TypedDocumentString(`
    mutation DeleteCategoryGroup($id: ID!, $moveTo: ID) {
  deleteCategoryGroup(id: $id, moveTo: $moveTo)
}
    `) as unknown as TypedDocumentString<DeleteCategoryGroupMutation, DeleteCategoryGroupMutationVariables>;
export const CreateIngredientFormGroupDocument = new TypedDocumentString(`
    mutation CreateIngredientFormGroup($input: IngredientFormGroupInput!) {
  createIngredientFormGroup(input: $input) {
    id
    slug
    icon
  }
}
    `) as unknown as TypedDocumentString<CreateIngredientFormGroupMutation, CreateIngredientFormGroupMutationVariables>;
export const UpdateIngredientFormGroupDocument = new TypedDocumentString(`
    mutation UpdateIngredientFormGroup($id: ID!, $input: IngredientFormGroupInput!) {
  updateIngredientFormGroup(id: $id, input: $input) {
    id
    slug
    icon
  }
}
    `) as unknown as TypedDocumentString<UpdateIngredientFormGroupMutation, UpdateIngredientFormGroupMutationVariables>;
export const DeleteIngredientFormGroupDocument = new TypedDocumentString(`
    mutation DeleteIngredientFormGroup($id: ID!, $moveTo: ID) {
  deleteIngredientFormGroup(id: $id, moveTo: $moveTo)
}
    `) as unknown as TypedDocumentString<DeleteIngredientFormGroupMutation, DeleteIngredientFormGroupMutationVariables>;
export const CreateDeityTraditionDocument = new TypedDocumentString(`
    mutation CreateDeityTradition($input: DeityTraditionInput!) {
  createDeityTradition(input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<CreateDeityTraditionMutation, CreateDeityTraditionMutationVariables>;
export const UpdateDeityTraditionDocument = new TypedDocumentString(`
    mutation UpdateDeityTradition($id: ID!, $input: DeityTraditionInput!) {
  updateDeityTradition(id: $id, input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<UpdateDeityTraditionMutation, UpdateDeityTraditionMutationVariables>;
export const DeleteDeityTraditionDocument = new TypedDocumentString(`
    mutation DeleteDeityTradition($id: ID!, $moveTo: ID) {
  deleteDeityTradition(id: $id, moveTo: $moveTo)
}
    `) as unknown as TypedDocumentString<DeleteDeityTraditionMutation, DeleteDeityTraditionMutationVariables>;
export const CreateCategoryDocument = new TypedDocumentString(`
    mutation CreateCategory($input: CategoryInput!) {
  createCategory(input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<CreateCategoryMutation, CreateCategoryMutationVariables>;
export const UpdateCategoryDocument = new TypedDocumentString(`
    mutation UpdateCategory($id: ID!, $input: CategoryInput!) {
  updateCategory(id: $id, input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<UpdateCategoryMutation, UpdateCategoryMutationVariables>;
export const DeleteCategoryDocument = new TypedDocumentString(`
    mutation DeleteCategory($id: ID!) {
  deleteCategory(id: $id)
}
    `) as unknown as TypedDocumentString<DeleteCategoryMutation, DeleteCategoryMutationVariables>;
export const CreateIngredientFormValueDocument = new TypedDocumentString(`
    mutation CreateIngredientFormValue($input: IngredientFormValueInput!) {
  createIngredientFormValue(input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<CreateIngredientFormValueMutation, CreateIngredientFormValueMutationVariables>;
export const UpdateIngredientFormValueDocument = new TypedDocumentString(`
    mutation UpdateIngredientFormValue($id: ID!, $input: IngredientFormValueInput!) {
  updateIngredientFormValue(id: $id, input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<UpdateIngredientFormValueMutation, UpdateIngredientFormValueMutationVariables>;
export const DeleteIngredientFormValueDocument = new TypedDocumentString(`
    mutation DeleteIngredientFormValue($id: ID!) {
  deleteIngredientFormValue(id: $id)
}
    `) as unknown as TypedDocumentString<DeleteIngredientFormValueMutation, DeleteIngredientFormValueMutationVariables>;
export const CreateDeityDocument = new TypedDocumentString(`
    mutation CreateDeity($input: DeityInput!) {
  createDeity(input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<CreateDeityMutation, CreateDeityMutationVariables>;
export const UpdateDeityDocument = new TypedDocumentString(`
    mutation UpdateDeity($id: ID!, $input: DeityInput!) {
  updateDeity(id: $id, input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<UpdateDeityMutation, UpdateDeityMutationVariables>;
export const DeleteDeityDocument = new TypedDocumentString(`
    mutation DeleteDeity($id: ID!) {
  deleteDeity(id: $id)
}
    `) as unknown as TypedDocumentString<DeleteDeityMutation, DeleteDeityMutationVariables>;
export const CreateCelestialBodyDocument = new TypedDocumentString(`
    mutation CreateCelestialBody($input: CelestialBodyInput!) {
  createCelestialBody(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<CreateCelestialBodyMutation, CreateCelestialBodyMutationVariables>;
export const UpdateCelestialBodyDocument = new TypedDocumentString(`
    mutation UpdateCelestialBody($id: ID!, $input: CelestialBodyInput!) {
  updateCelestialBody(id: $id, input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<UpdateCelestialBodyMutation, UpdateCelestialBodyMutationVariables>;
export const DeleteCelestialBodyDocument = new TypedDocumentString(`
    mutation DeleteCelestialBody($id: ID!) {
  deleteCelestialBody(id: $id)
}
    `) as unknown as TypedDocumentString<DeleteCelestialBodyMutation, DeleteCelestialBodyMutationVariables>;
export const CreateZodiacSignDocument = new TypedDocumentString(`
    mutation CreateZodiacSign($input: ZodiacSignInput!) {
  createZodiacSign(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<CreateZodiacSignMutation, CreateZodiacSignMutationVariables>;
export const UpdateZodiacSignDocument = new TypedDocumentString(`
    mutation UpdateZodiacSign($id: ID!, $input: ZodiacSignInput!) {
  updateZodiacSign(id: $id, input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<UpdateZodiacSignMutation, UpdateZodiacSignMutationVariables>;
export const DeleteZodiacSignDocument = new TypedDocumentString(`
    mutation DeleteZodiacSign($id: ID!) {
  deleteZodiacSign(id: $id)
}
    `) as unknown as TypedDocumentString<DeleteZodiacSignMutation, DeleteZodiacSignMutationVariables>;
export const CreateHelpArticleDocument = new TypedDocumentString(`
    mutation CreateHelpArticle($input: HelpArticleInput!) {
  createHelpArticle(input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<CreateHelpArticleMutation, CreateHelpArticleMutationVariables>;
export const UpdateHelpArticleDocument = new TypedDocumentString(`
    mutation UpdateHelpArticle($id: ID!, $input: HelpArticlePatch!) {
  updateHelpArticle(id: $id, input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<UpdateHelpArticleMutation, UpdateHelpArticleMutationVariables>;
export const DeleteHelpArticleDocument = new TypedDocumentString(`
    mutation DeleteHelpArticle($id: ID!) {
  deleteHelpArticle(id: $id)
}
    `) as unknown as TypedDocumentString<DeleteHelpArticleMutation, DeleteHelpArticleMutationVariables>;
export const HelpRenameEffectsDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<HelpRenameEffectsQuery, HelpRenameEffectsQueryVariables>;
export const OrderHelpGuidesDocument = new TypedDocumentString(`
    mutation OrderHelpGuides($ids: [ID!]!) {
  orderHelpGuides(ids: $ids) {
    id
  }
}
    `) as unknown as TypedDocumentString<OrderHelpGuidesMutation, OrderHelpGuidesMutationVariables>;
export const OrderHelpSubPagesDocument = new TypedDocumentString(`
    mutation OrderHelpSubPages($id: ID!, $input: HelpArticlePatch!) {
  updateHelpArticle(id: $id, input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<OrderHelpSubPagesMutation, OrderHelpSubPagesMutationVariables>;
export const OrderHelpFaqDocument = new TypedDocumentString(`
    mutation OrderHelpFaq($ids: [ID!]!) {
  orderHelpFaq(ids: $ids) {
    id
  }
}
    `) as unknown as TypedDocumentString<OrderHelpFaqMutation, OrderHelpFaqMutationVariables>;
export const SetHelpArticleShownDocument = new TypedDocumentString(`
    mutation SetHelpArticleShown($id: ID!, $shown: Boolean!) {
  setHelpArticleShown(id: $id, shown: $shown) {
    id
  }
}
    `) as unknown as TypedDocumentString<SetHelpArticleShownMutation, SetHelpArticleShownMutationVariables>;
export const AddCupboardEntryDocument = new TypedDocumentString(`
    mutation AddCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {
  addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId) {
    id
  }
}
    `) as unknown as TypedDocumentString<AddCupboardEntryMutation, AddCupboardEntryMutationVariables>;
export const RemoveCupboardEntryDocument = new TypedDocumentString(`
    mutation RemoveCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {
  removeCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId)
}
    `) as unknown as TypedDocumentString<RemoveCupboardEntryMutation, RemoveCupboardEntryMutationVariables>;
export const MakeItOursDocument = new TypedDocumentString(`
    mutation MakeItOurs($workspaceId: ID!, $ingredientId: ID!) {
  convertCompendiumEntryToLocal(
    workspaceId: $workspaceId
    ingredientId: $ingredientId
  ) {
    entry {
      id
    }
  }
}
    `) as unknown as TypedDocumentString<MakeItOursMutation, MakeItOursMutationVariables>;
export const DeleteOwnIngredientDocument = new TypedDocumentString(`
    mutation DeleteOwnIngredient($id: ID!, $workspaceId: ID!) {
  deleteIngredient(id: $id, workspaceId: $workspaceId)
}
    `) as unknown as TypedDocumentString<DeleteOwnIngredientMutation, DeleteOwnIngredientMutationVariables>;
export const SetCompendiumEntryReviewedDocument = new TypedDocumentString(`
    mutation SetCompendiumEntryReviewed($id: ID!, $reviewed: Boolean!) {
  setCompendiumEntryReviewed(id: $id, reviewed: $reviewed) {
    id
  }
}
    `) as unknown as TypedDocumentString<SetCompendiumEntryReviewedMutation, SetCompendiumEntryReviewedMutationVariables>;
export const SetCompendiumEntryShownDocument = new TypedDocumentString(`
    mutation SetCompendiumEntryShown($id: ID!, $shown: Boolean!) {
  setCompendiumEntryShown(id: $id, shown: $shown) {
    id
  }
}
    `) as unknown as TypedDocumentString<SetCompendiumEntryShownMutation, SetCompendiumEntryShownMutationVariables>;
export const PickerCategoriesDocument = new TypedDocumentString(`
    query PickerCategories {
  categories(first: 100) {
    edges {
      node {
        id
        name
        description
        group {
          id
          name
          colorDark
          colorLight
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PickerCategoriesQuery, PickerCategoriesQueryVariables>;
export const CompendiumEntryUsersDocument = new TypedDocumentString(`
    query CompendiumEntryUsers($id: ID!) {
  compendiumEntryUsers(id: $id)
}
    `) as unknown as TypedDocumentString<CompendiumEntryUsersQuery, CompendiumEntryUsersQueryVariables>;
export const PossibleDuplicatesDocument = new TypedDocumentString(`
    query PossibleDuplicates($workspaceId: ID, $name: String!, $first: Int) {
  possibleDuplicates(workspaceId: $workspaceId, name: $name, first: $first) {
    edges {
      node {
        id
        name
        canonicalName
        nomenclature
        slug
        isGlobal
        inCupboard(workspaceId: $workspaceId)
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PossibleDuplicatesQuery, PossibleDuplicatesQueryVariables>;
export const CompendiumMatchesDocument = new TypedDocumentString(`
    query CompendiumMatches($workspaceId: ID!, $name: String!, $first: Int) {
  compendiumMatches(workspaceId: $workspaceId, name: $name, first: $first) {
    edges {
      node {
        id
        name
        canonicalName
        nomenclature
        slug
        isGlobal
        inCupboard(workspaceId: $workspaceId)
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CompendiumMatchesQuery, CompendiumMatchesQueryVariables>;
export const CreateWorkspaceIngredientDocument = new TypedDocumentString(`
    mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {
  createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {
    id
    name
    slug
    revision
    stock(workspaceId: $workspaceId) {
      quantityOnHand
      unit
      variant {
        form
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CreateWorkspaceIngredientMutation, CreateWorkspaceIngredientMutationVariables>;
export const UpdateWorkspaceIngredientDocument = new TypedDocumentString(`
    mutation UpdateWorkspaceIngredient($workspaceId: ID!, $id: ID!, $input: IngredientUpdateInput!, $expectedRevision: Int) {
  updateIngredient(
    workspaceId: $workspaceId
    id: $id
    input: $input
    expectedRevision: $expectedRevision
  ) {
    id
    name
    slug
    revision
  }
}
    `) as unknown as TypedDocumentString<UpdateWorkspaceIngredientMutation, UpdateWorkspaceIngredientMutationVariables>;
export const AddCupboardEntryFromFormDocument = new TypedDocumentString(`
    mutation AddCupboardEntryFromForm($workspaceId: ID!, $ingredientId: ID!, $input: CupboardEntryInput) {
  addCupboardEntry(
    workspaceId: $workspaceId
    ingredientId: $ingredientId
    input: $input
  ) {
    id
  }
}
    `) as unknown as TypedDocumentString<AddCupboardEntryFromFormMutation, AddCupboardEntryFromFormMutationVariables>;
export const CreateCompendiumIngredientDocument = new TypedDocumentString(`
    mutation CreateCompendiumIngredient($input: CompendiumIngredientInput!, $endRedirect: Boolean) {
  createCompendiumIngredient(input: $input, endRedirect: $endRedirect) {
    id
    name
    slug
    revision
  }
}
    `) as unknown as TypedDocumentString<CreateCompendiumIngredientMutation, CreateCompendiumIngredientMutationVariables>;
export const UpdateCompendiumIngredientDocument = new TypedDocumentString(`
    mutation UpdateCompendiumIngredient($id: ID!, $input: CompendiumIngredientUpdateInput!, $endRedirect: Boolean, $expectedRevision: Int) {
  updateCompendiumIngredient(
    id: $id
    input: $input
    endRedirect: $endRedirect
    expectedRevision: $expectedRevision
  ) {
    id
    name
    slug
    revision
  }
}
    `) as unknown as TypedDocumentString<UpdateCompendiumIngredientMutation, UpdateCompendiumIngredientMutationVariables>;
export const DeleteCompendiumIngredientDocument = new TypedDocumentString(`
    mutation DeleteCompendiumIngredient($id: ID!) {
  deleteCompendiumIngredient(id: $id)
}
    `) as unknown as TypedDocumentString<DeleteCompendiumIngredientMutation, DeleteCompendiumIngredientMutationVariables>;
export const DeleteWorkspaceIngredientDocument = new TypedDocumentString(`
    mutation DeleteWorkspaceIngredient($id: ID!, $workspaceId: ID!) {
  deleteIngredient(id: $id, workspaceId: $workspaceId)
}
    `) as unknown as TypedDocumentString<DeleteWorkspaceIngredientMutation, DeleteWorkspaceIngredientMutationVariables>;
export const PromoteFolkNameDocument = new TypedDocumentString(`
    mutation PromoteFolkName($workspaceId: ID, $id: ID!, $folkNameId: ID!) {
  promoteFolkName(workspaceId: $workspaceId, id: $id, folkNameId: $folkNameId) {
    id
    name
    slug
    folkNames {
      id
      name
    }
  }
}
    `) as unknown as TypedDocumentString<PromoteFolkNameMutation, PromoteFolkNameMutationVariables>;
export const DuplicateQuickLookDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<DuplicateQuickLookQuery, DuplicateQuickLookQueryVariables>;
export const CreateReferenceDocument = new TypedDocumentString(`
    mutation CreateReference($workspaceId: ID, $input: ReferenceInput!) {
  createReference(workspaceId: $workspaceId, input: $input) {
    id
    citation
    isGlobal
    kind
    authors
    title
    container
  }
}
    `) as unknown as TypedDocumentString<CreateReferenceMutation, CreateReferenceMutationVariables>;
export const UpdateReferenceDocument = new TypedDocumentString(`
    mutation UpdateReference($workspaceId: ID, $id: ID!, $input: ReferenceInput!) {
  updateReference(workspaceId: $workspaceId, id: $id, input: $input) {
    id
    citation
    isGlobal
    kind
    authors
    title
    container
  }
}
    `) as unknown as TypedDocumentString<UpdateReferenceMutation, UpdateReferenceMutationVariables>;
export const ReferenceDocument = new TypedDocumentString(`
    query Reference($workspaceId: ID, $id: ID!) {
  reference(workspaceId: $workspaceId, id: $id) {
    id
    kind
    title
    authors
    container
    contributors
    edition
    volume
    issue
    series
    place
    publisher
    published
    pages
    host
    url
    modified
    accessed
    note
    scholarly
  }
}
    `) as unknown as TypedDocumentString<ReferenceQuery, ReferenceQueryVariables>;
export const ReferenceSuggestionsDocument = new TypedDocumentString(`
    query ReferenceSuggestions($workspaceId: ID, $query: String, $first: Int) {
  referenceSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
    edges {
      node {
        id
        citation
        isGlobal
        kind
        authors
        title
        container
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ReferenceSuggestionsQuery, ReferenceSuggestionsQueryVariables>;
export const IngredientSummaryDocument = new TypedDocumentString(`
    query IngredientSummary($id: ID!, $workspaceId: ID) {
  ingredient(id: $id, workspaceId: $workspaceId) {
    id
    name
    canonicalName
    description
    nomenclature
    isGlobal
    slug
    elements
    celestialBodies
    zodiacSigns
    colors
    variants {
      id
      form
      formChoice {
        group {
          icon
        }
      }
      elements
      celestialBodies
      zodiacSigns
      colors
    }
  }
}
    `) as unknown as TypedDocumentString<IngredientSummaryQuery, IngredientSummaryQueryVariables>;
export const FormSuggestionsDocument = new TypedDocumentString(`
    query FormSuggestions($workspaceId: ID, $query: String, $first: Int) {
  formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
    edges {
      node {
        id
        value
        description
        group
        icon
        curated
        claimants {
          name
          canonicalName
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<FormSuggestionsQuery, FormSuggestionsQueryVariables>;
export const CommonNameSuggestionsDocument = new TypedDocumentString(`
    query CommonNameSuggestions($workspaceId: ID, $query: String, $first: Int) {
  commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
    edges {
      node {
        value
        claimants {
          name
          canonicalName
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CommonNameSuggestionsQuery, CommonNameSuggestionsQueryVariables>;
export const CelestialBodySuggestionsDocument = new TypedDocumentString(`
    query CelestialBodySuggestions($workspaceId: ID, $query: String, $first: Int) {
  celestialBodySuggestions(
    workspaceId: $workspaceId
    query: $query
    first: $first
  ) {
    edges {
      node {
        value
        description
        curated
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CelestialBodySuggestionsQuery, CelestialBodySuggestionsQueryVariables>;
export const ZodiacSuggestionsDocument = new TypedDocumentString(`
    query ZodiacSuggestions($workspaceId: ID, $query: String, $first: Int) {
  zodiacSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
    edges {
      node {
        value
        description
        curated
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ZodiacSuggestionsQuery, ZodiacSuggestionsQueryVariables>;
export const DeitySuggestionsDocument = new TypedDocumentString(`
    query DeitySuggestions($workspaceId: ID, $query: String, $first: Int) {
  deitySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
    edges {
      node {
        id
        value
        description
        tradition
        matchedName
        curated
      }
    }
  }
}
    `) as unknown as TypedDocumentString<DeitySuggestionsQuery, DeitySuggestionsQueryVariables>;
export const IngredientSuggestionsDocument = new TypedDocumentString(`
    query IngredientSuggestions($workspaceId: ID!, $query: String, $first: Int) {
  ingredientSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
    edges {
      group
      node {
        id
        name
        cupboardEntry(workspaceId: $workspaceId) {
          label
        }
        canonicalName
        description
        isGlobal
        variants {
          id
          form
          formChoice {
            id
            group {
              id
              name
            }
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<IngredientSuggestionsQuery, IngredientSuggestionsQueryVariables>;
export const CompendiumSubstitutesDocument = new TypedDocumentString(`
    query CompendiumSubstitutes($query: String, $first: Int) {
  compendium(query: $query, first: $first) {
    edges {
      node {
        id
        name
        canonicalName
        description
        isGlobal
        variants {
          id
          form
          formChoice {
            id
            group {
              id
              name
            }
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CompendiumSubstitutesQuery, CompendiumSubstitutesQueryVariables>;
export const IngredientSearchMatchesDocument = new TypedDocumentString(`
    query IngredientSearchMatches($query: String, $first: Int) {
  compendium(query: $query, first: $first) {
    pageInfo {
      hasNextPage
    }
    edges {
      node {
        id
        slug
        name
        canonicalName
        nomenclature
      }
    }
  }
}
    `) as unknown as TypedDocumentString<IngredientSearchMatchesQuery, IngredientSearchMatchesQueryVariables>;
export const IngredientSearchCupboardMatchesDocument = new TypedDocumentString(`
    query IngredientSearchCupboardMatches($workspaceId: ID!, $query: String, $first: Int) {
  workspaceIngredients(workspaceId: $workspaceId, query: $query, first: $first) {
    pageInfo {
      hasNextPage
    }
    edges {
      node {
        id
        slug
        name
        canonicalName
        nomenclature
        cupboardEntry(workspaceId: $workspaceId) {
          label
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<IngredientSearchCupboardMatchesQuery, IngredientSearchCupboardMatchesQueryVariables>;
export const GrimoireSearchMatchesDocument = new TypedDocumentString(`
    query GrimoireSearchMatches($workspaceId: ID!, $query: String, $status: SpellStatus, $first: Int) {
  grimoire(
    workspaceId: $workspaceId
    query: $query
    status: $status
    first: $first
  ) {
    pageInfo {
      hasNextPage
    }
    edges {
      node {
        id
        title
      }
    }
  }
}
    `) as unknown as TypedDocumentString<GrimoireSearchMatchesQuery, GrimoireSearchMatchesQueryVariables>;
export const AcceptInvitationDocument = new TypedDocumentString(`
    mutation AcceptInvitation($token: String!) {
  acceptInvitation(token: $token) {
    id
  }
}
    `) as unknown as TypedDocumentString<AcceptInvitationMutation, AcceptInvitationMutationVariables>;
export const RecordCardAttemptDocument = new TypedDocumentString(`
    mutation RecordCardAttempt($token: String!) {
  recordCardAttempt(token: $token)
}
    `) as unknown as TypedDocumentString<RecordCardAttemptMutation, RecordCardAttemptMutationVariables>;
export const CreateInvitationDocument = new TypedDocumentString(`
    mutation CreateInvitation($workspaceId: ID!, $email: String!, $role: InvitableRole!) {
  createInvitation(workspaceId: $workspaceId, email: $email, role: $role) {
    id
  }
}
    `) as unknown as TypedDocumentString<CreateInvitationMutation, CreateInvitationMutationVariables>;
export const LeaveWorkspaceDocument = new TypedDocumentString(`
    mutation LeaveWorkspace($workspaceId: ID!) {
  leaveWorkspace(workspaceId: $workspaceId)
}
    `) as unknown as TypedDocumentString<LeaveWorkspaceMutation, LeaveWorkspaceMutationVariables>;
export const PromoteSuccessorDocument = new TypedDocumentString(`
    mutation PromoteSuccessor($workspaceId: ID!, $userId: ID!, $role: WorkspaceRole!) {
  updateMemberRole(workspaceId: $workspaceId, userId: $userId, role: $role) {
    role
  }
}
    `) as unknown as TypedDocumentString<PromoteSuccessorMutation, PromoteSuccessorMutationVariables>;
export const PauseMemberAccessDocument = new TypedDocumentString(`
    mutation PauseMemberAccess($workspaceId: ID!, $userId: ID!, $until: DateTime, $note: String, $message: String) {
  pauseMemberAccess(
    workspaceId: $workspaceId
    userId: $userId
    until: $until
    note: $note
    message: $message
  ) {
    id
  }
}
    `) as unknown as TypedDocumentString<PauseMemberAccessMutation, PauseMemberAccessMutationVariables>;
export const LiftMemberAccessPauseDocument = new TypedDocumentString(`
    mutation LiftMemberAccessPause($workspaceId: ID!, $userId: ID!) {
  liftMemberAccessPause(workspaceId: $workspaceId, userId: $userId) {
    id
  }
}
    `) as unknown as TypedDocumentString<LiftMemberAccessPauseMutation, LiftMemberAccessPauseMutationVariables>;
export const MemberPausesDocument = new TypedDocumentString(`
    query MemberPauses($workspaceId: ID!, $userId: ID!) {
  workspace(id: $workspaceId) {
    id
    memberPauses(userId: $userId, first: 25) {
      edges {
        node {
          id
          until
          note
          liftedAt
          audit {
            createdAt
          }
          setBy {
            id
            name
          }
          liftedBy {
            id
            name
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<MemberPausesQuery, MemberPausesQueryVariables>;
export const RemoveMemberDocument = new TypedDocumentString(`
    mutation RemoveMember($workspaceId: ID!, $userId: ID!) {
  removeMember(workspaceId: $workspaceId, userId: $userId)
}
    `) as unknown as TypedDocumentString<RemoveMemberMutation, RemoveMemberMutationVariables>;
export const UpdateMemberRoleDocument = new TypedDocumentString(`
    mutation UpdateMemberRole($workspaceId: ID!, $userId: ID!, $role: WorkspaceRole!) {
  updateMemberRole(workspaceId: $workspaceId, userId: $userId, role: $role) {
    role
    user {
      id
    }
  }
}
    `) as unknown as TypedDocumentString<UpdateMemberRoleMutation, UpdateMemberRoleMutationVariables>;
export const SetNameDocument = new TypedDocumentString(`
    mutation SetName($name: String!) {
  setName(name: $name) {
    id
    name
  }
}
    `) as unknown as TypedDocumentString<SetNameMutation, SetNameMutationVariables>;
export const SetPasswordDocument = new TypedDocumentString(`
    mutation SetPassword($newPassword: String!) {
  setPassword(newPassword: $newPassword)
}
    `) as unknown as TypedDocumentString<SetPasswordMutation, SetPasswordMutationVariables>;
export const RemoveDeclinedInvitationDocument = new TypedDocumentString(`
    mutation RemoveDeclinedInvitation($workspaceId: ID!, $id: ID!) {
  revokeInvitation(workspaceId: $workspaceId, id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<RemoveDeclinedInvitationMutation, RemoveDeclinedInvitationMutationVariables>;
export const RevokeInvitationDocument = new TypedDocumentString(`
    mutation RevokeInvitation($workspaceId: ID!, $id: ID!) {
  revokeInvitation(workspaceId: $workspaceId, id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<RevokeInvitationMutation, RevokeInvitationMutationVariables>;
export const AcceptInvitationByIdDocument = new TypedDocumentString(`
    mutation AcceptInvitationById($id: ID!) {
  acceptInvitationById(id: $id) {
    id
    acceptedAt
  }
}
    `) as unknown as TypedDocumentString<AcceptInvitationByIdMutation, AcceptInvitationByIdMutationVariables>;
export const DeclineInvitationByIdDocument = new TypedDocumentString(`
    mutation DeclineInvitationById($id: ID!) {
  declineInvitationById(id: $id) {
    id
    declinedAt
  }
}
    `) as unknown as TypedDocumentString<DeclineInvitationByIdMutation, DeclineInvitationByIdMutationVariables>;
export const WorkingDeductionPreviewDocument = new TypedDocumentString(`
    query WorkingDeductionPreview($workspaceId: ID!, $spellId: ID!) {
  workingDeductionPreview(workspaceId: $workspaceId, spellId: $spellId) {
    deductions {
      before
      inventoryItemId
      lowStockThreshold
      quantity
      shortfall
      stepId
      unit
    }
    warnings {
      position
      reason
      stepId
      stepName
    }
  }
}
    `) as unknown as TypedDocumentString<WorkingDeductionPreviewQuery, WorkingDeductionPreviewQueryVariables>;
export const CompleteWorkingDocument = new TypedDocumentString(`
    mutation CompleteWorking($workspaceId: ID!, $id: ID!) {
  completeWorking(workspaceId: $workspaceId, id: $id) {
    working {
      id
      status
      completedAt
    }
    warnings {
      position
      reason
      stepId
      stepName
    }
  }
}
    `) as unknown as TypedDocumentString<CompleteWorkingMutation, CompleteWorkingMutationVariables>;
export const RecordWorkingDocument = new TypedDocumentString(`
    mutation RecordWorking($workspaceId: ID!, $spellId: ID!, $input: WorkingInput!) {
  recordWorking(workspaceId: $workspaceId, spellId: $spellId, input: $input) {
    id
    status
    note
    workedOn
    visibility
    participants {
      id
      name
      userId
    }
  }
}
    `) as unknown as TypedDocumentString<RecordWorkingMutation, RecordWorkingMutationVariables>;
export const UpdateWorkingDocument = new TypedDocumentString(`
    mutation UpdateWorking($workspaceId: ID!, $id: ID!, $input: WorkingInput!) {
  updateWorking(workspaceId: $workspaceId, id: $id, input: $input) {
    id
    status
    note
    workedOn
    visibility
    participants {
      id
      name
      userId
    }
  }
}
    `) as unknown as TypedDocumentString<UpdateWorkingMutation, UpdateWorkingMutationVariables>;
export const RecordWorkingMembersDocument = new TypedDocumentString(`
    query RecordWorkingMembers($workspaceId: ID!, $query: String, $first: Int) {
  workspace(id: $workspaceId) {
    id
    members(first: $first, query: $query) {
      edges {
        node {
          user {
            id
            name
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<RecordWorkingMembersQuery, RecordWorkingMembersQueryVariables>;
export const SendSignedOutSupportRequestDocument = new TypedDocumentString(`
    mutation SendSignedOutSupportRequest($input: SignedOutSupportRequestInput!) {
  sendSignedOutSupportRequest(input: $input)
}
    `) as unknown as TypedDocumentString<SendSignedOutSupportRequestMutation, SendSignedOutSupportRequestMutationVariables>;
export const CreateSpellDocument = new TypedDocumentString(`
    mutation CreateSpell($workspaceId: ID!, $input: SpellInput!) {
  createSpell(workspaceId: $workspaceId, input: $input) {
    id
    revision
    title
    intent
    jarDescription
    sealWaxColor
    moonPhase
    dayOfWeek
    note
    steps {
      id
      name
      form
      quantity
      unit
      body
      ingredient {
        id
        toxic
        safetyNotes
        categories {
          id
          name
        }
        stock(workspaceId: $workspaceId) {
          unit
          quantityOnHand
          lowStockThreshold
          variant {
            id
          }
        }
      }
      variant {
        id
        toxic
        safetyNotes
        categories {
          id
          name
        }
        formChoice {
          group {
            icon
          }
        }
      }
    }
    visibility
    status
  }
}
    `) as unknown as TypedDocumentString<CreateSpellMutation, CreateSpellMutationVariables>;
export const UpdateSpellDocument = new TypedDocumentString(`
    mutation UpdateSpell($workspaceId: ID!, $id: ID!, $input: UpdateSpellInput!) {
  updateSpell(workspaceId: $workspaceId, id: $id, input: $input) {
    id
    revision
    title
    intent
    jarDescription
    sealWaxColor
    moonPhase
    dayOfWeek
    note
    steps {
      id
      name
      form
      quantity
      unit
      body
      ingredient {
        id
        toxic
        safetyNotes
        categories {
          id
          name
        }
        stock(workspaceId: $workspaceId) {
          unit
          quantityOnHand
          lowStockThreshold
          variant {
            id
          }
        }
      }
      variant {
        id
        toxic
        safetyNotes
        categories {
          id
          name
        }
        formChoice {
          group {
            icon
          }
        }
      }
    }
    visibility
    status
  }
}
    `) as unknown as TypedDocumentString<UpdateSpellMutation, UpdateSpellMutationVariables>;
export const SpellBuilderReloadDocument = new TypedDocumentString(`
    query SpellBuilderReload($workspaceId: ID!, $id: ID!) {
  spell(workspaceId: $workspaceId, id: $id) {
    id
    revision
    title
    intent
    jarDescription
    sealWaxColor
    moonPhase
    dayOfWeek
    note
    categories {
      id
    }
    steps {
      id
      name
      form
      quantity
      unit
      body
      ingredient {
        id
        toxic
        safetyNotes
        categories {
          id
          name
        }
        stock(workspaceId: $workspaceId) {
          unit
          quantityOnHand
          lowStockThreshold
          variant {
            id
          }
        }
      }
      variant {
        id
        toxic
        safetyNotes
        categories {
          id
          name
        }
        formChoice {
          group {
            icon
          }
        }
      }
    }
    visibility
    status
  }
}
    `) as unknown as TypedDocumentString<SpellBuilderReloadQuery, SpellBuilderReloadQueryVariables>;
export const SpellIngredientSuggestionsDocument = new TypedDocumentString(`
    query SpellIngredientSuggestions($workspaceId: ID!, $query: String, $first: Int, $categoryIds: [ID!]) {
  ingredientSuggestions(
    workspaceId: $workspaceId
    query: $query
    first: $first
    categoryIds: $categoryIds
  ) {
    edges {
      group
      node {
        id
        name
        canonicalName
        retired
        toxic
        safetyNotes
        cupboardEntry(workspaceId: $workspaceId) {
          label
        }
        categories {
          id
          name
        }
        variants {
          id
          form
          toxic
          safetyNotes
          categories {
            id
            name
          }
          formChoice {
            group {
              icon
            }
          }
        }
        stock(workspaceId: $workspaceId) {
          unit
          quantityOnHand
          lowStockThreshold
          variant {
            id
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<SpellIngredientSuggestionsQuery, SpellIngredientSuggestionsQueryVariables>;
export const SpellBuilderStepsDocument = new TypedDocumentString(`
    query SpellBuilderSteps($workspaceId: ID!, $id: ID!) {
  spell(workspaceId: $workspaceId, id: $id) {
    id
    steps {
      id
      name
      form
      quantity
      unit
      body
      ingredient {
        id
        toxic
        safetyNotes
        categories {
          id
          name
        }
        stock(workspaceId: $workspaceId) {
          unit
          quantityOnHand
          lowStockThreshold
          variant {
            id
          }
        }
      }
      variant {
        id
        toxic
        safetyNotes
        categories {
          id
          name
        }
        formChoice {
          group {
            icon
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<SpellBuilderStepsQuery, SpellBuilderStepsQueryVariables>;
export const RecordWorkingSetupDocument = new TypedDocumentString(`
    query RecordWorkingSetup($workspaceId: ID!, $spellId: ID!) {
  spell(id: $spellId, workspaceId: $workspaceId) {
    id
    steps {
      id
      name
      form
      ingredient {
        id
      }
      variant {
        id
      }
    }
  }
}
    `) as unknown as TypedDocumentString<RecordWorkingSetupQuery, RecordWorkingSetupQueryVariables>;
export const DeleteSpellDocument = new TypedDocumentString(`
    mutation DeleteSpell($workspaceId: ID!, $id: ID!) {
  deleteSpell(workspaceId: $workspaceId, id: $id)
}
    `) as unknown as TypedDocumentString<DeleteSpellMutation, DeleteSpellMutationVariables>;
export const DuplicateSpellDocument = new TypedDocumentString(`
    mutation DuplicateSpell($workspaceId: ID!, $id: ID!) {
  duplicateSpell(workspaceId: $workspaceId, id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<DuplicateSpellMutation, DuplicateSpellMutationVariables>;
export const DeleteWorkingDocument = new TypedDocumentString(`
    mutation DeleteWorking($workspaceId: ID!, $id: ID!) {
  deleteWorking(workspaceId: $workspaceId, id: $id)
}
    `) as unknown as TypedDocumentString<DeleteWorkingMutation, DeleteWorkingMutationVariables>;
export const SaveStockDocument = new TypedDocumentString(`
    mutation SaveStock($workspaceId: ID!, $ingredientId: ID!, $input: SaveStockInput!) {
  saveStock(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<SaveStockMutation, SaveStockMutationVariables>;
export const SupportDialogStateDocument = new TypedDocumentString(`
    query SupportDialogState {
  supportDialogState {
    kind
    until
  }
}
    `) as unknown as TypedDocumentString<SupportDialogStateQuery, SupportDialogStateQueryVariables>;
export const SendSupportRequestDocument = new TypedDocumentString(`
    mutation SendSupportRequest($input: SupportRequestInput!) {
  sendSupportRequest(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<SendSupportRequestMutation, SendSupportRequestMutationVariables>;
export const SupportRequestByViewTokenDocument = new TypedDocumentString(`
    query SupportRequestByViewToken($token: String!) {
  supportRequestByViewToken(token: $token) {
    id
    about
    status
    subject
    message
    sentAt
    replies {
      id
      authorRole
      body
      sentAt
    }
  }
}
    `) as unknown as TypedDocumentString<SupportRequestByViewTokenQuery, SupportRequestByViewTokenQueryVariables>;
export const AssignSupportRequestDocument = new TypedDocumentString(`
    mutation AssignSupportRequest($id: ID!, $assigneeId: ID) {
  assignSupportRequest(id: $id, assigneeId: $assigneeId) {
    id
  }
}
    `) as unknown as TypedDocumentString<AssignSupportRequestMutation, AssignSupportRequestMutationVariables>;
export const SetSupportRequestCuratorVisibleDocument = new TypedDocumentString(`
    mutation SetSupportRequestCuratorVisible($id: ID!, $visible: Boolean!) {
  setSupportRequestCuratorVisible(id: $id, visible: $visible) {
    id
  }
}
    `) as unknown as TypedDocumentString<SetSupportRequestCuratorVisibleMutation, SetSupportRequestCuratorVisibleMutationVariables>;
export const ResolveSupportRequestDocument = new TypedDocumentString(`
    mutation ResolveSupportRequest($id: ID!) {
  resolveSupportRequest(id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<ResolveSupportRequestMutation, ResolveSupportRequestMutationVariables>;
export const SetSupportRequestIssueUrlDocument = new TypedDocumentString(`
    mutation SetSupportRequestIssueUrl($id: ID!, $issueUrl: String) {
  setSupportRequestIssueUrl(id: $id, issueUrl: $issueUrl) {
    id
  }
}
    `) as unknown as TypedDocumentString<SetSupportRequestIssueUrlMutation, SetSupportRequestIssueUrlMutationVariables>;
export const ReplyToSupportRequestDocument = new TypedDocumentString(`
    mutation ReplyToSupportRequest($requestId: ID!, $body: String!, $waitingOnSender: Boolean) {
  replyToSupportRequest(
    requestId: $requestId
    body: $body
    waitingOnSender: $waitingOnSender
  ) {
    id
  }
}
    `) as unknown as TypedDocumentString<ReplyToSupportRequestMutation, ReplyToSupportRequestMutationVariables>;
export const AddSupportInternalNoteDocument = new TypedDocumentString(`
    mutation AddSupportInternalNote($requestId: ID!, $body: String!) {
  addSupportInternalNote(requestId: $requestId, body: $body) {
    id
  }
}
    `) as unknown as TypedDocumentString<AddSupportInternalNoteMutation, AddSupportInternalNoteMutationVariables>;
export const TimeOutSupportSenderDocument = new TypedDocumentString(`
    mutation TimeOutSupportSender($userId: ID!, $until: DateTime, $note: String!, $message: String!) {
  timeOutSupportSender(
    userId: $userId
    until: $until
    note: $note
    message: $message
  ) {
    id
  }
}
    `) as unknown as TypedDocumentString<TimeOutSupportSenderMutation, TimeOutSupportSenderMutationVariables>;
export const TimeOutSignedOutSenderDocument = new TypedDocumentString(`
    mutation TimeOutSignedOutSender($requestId: ID!, $until: DateTime, $note: String!, $message: String!) {
  timeOutSignedOutSender(
    requestId: $requestId
    until: $until
    note: $note
    message: $message
  ) {
    id
  }
}
    `) as unknown as TypedDocumentString<TimeOutSignedOutSenderMutation, TimeOutSignedOutSenderMutationVariables>;
export const LiftSupportTimeoutDocument = new TypedDocumentString(`
    mutation LiftSupportTimeout($id: ID!) {
  liftSupportTimeout(id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<LiftSupportTimeoutMutation, LiftSupportTimeoutMutationVariables>;
export const SendSupportMessageDocument = new TypedDocumentString(`
    mutation SendSupportMessage($requestId: ID!, $body: String!) {
  sendSupportMessage(requestId: $requestId, body: $body) {
    id
  }
}
    `) as unknown as TypedDocumentString<SendSupportMessageMutation, SendSupportMessageMutationVariables>;
export const ResolveMySupportRequestDocument = new TypedDocumentString(`
    mutation ResolveMySupportRequest($id: ID!) {
  resolveMySupportRequest(id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<ResolveMySupportRequestMutation, ResolveMySupportRequestMutationVariables>;
export const ReplyToSupportRequestByViewTokenDocument = new TypedDocumentString(`
    mutation ReplyToSupportRequestByViewToken($token: String!, $body: String!, $website: String) {
  replyToSupportRequestByViewToken(token: $token, body: $body, website: $website)
}
    `) as unknown as TypedDocumentString<ReplyToSupportRequestByViewTokenMutation, ReplyToSupportRequestByViewTokenMutationVariables>;
export const AgreeToTermsDocument = new TypedDocumentString(`
    mutation AgreeToTerms($version: AgreementVersionInput!) {
  agreeToTerms(version: $version) {
    id
    agreedTermsVersion
    agreedDisclaimerVersion
    agreedEthicsVersion
  }
}
    `) as unknown as TypedDocumentString<AgreeToTermsMutation, AgreeToTermsMutationVariables>;
export const PauseUserAccessDocument = new TypedDocumentString(`
    mutation PauseUserAccess($userId: ID!, $until: DateTime, $note: String!, $message: String!) {
  pauseUserAccess(userId: $userId, until: $until, note: $note, message: $message) {
    id
  }
}
    `) as unknown as TypedDocumentString<PauseUserAccessMutation, PauseUserAccessMutationVariables>;
export const LiftUserAccessPauseDocument = new TypedDocumentString(`
    mutation LiftUserAccessPause($userId: ID!) {
  liftUserAccessPause(userId: $userId) {
    id
  }
}
    `) as unknown as TypedDocumentString<LiftUserAccessPauseMutation, LiftUserAccessPauseMutationVariables>;
export const GrantWorkspaceCreationDocument = new TypedDocumentString(`
    mutation GrantWorkspaceCreation($userId: ID!, $note: String) {
  grantWorkspaceCreation(userId: $userId, note: $note) {
    id
    canCreateWorkspace
  }
}
    `) as unknown as TypedDocumentString<GrantWorkspaceCreationMutation, GrantWorkspaceCreationMutationVariables>;
export const RevokeWorkspaceCreationDocument = new TypedDocumentString(`
    mutation RevokeWorkspaceCreation($userId: ID!, $note: String) {
  revokeWorkspaceCreation(userId: $userId, note: $note) {
    id
    canCreateWorkspace
  }
}
    `) as unknown as TypedDocumentString<RevokeWorkspaceCreationMutation, RevokeWorkspaceCreationMutationVariables>;
export const PauseAdminRoleChangesDocument = new TypedDocumentString(`
    mutation PauseAdminRoleChanges {
  pauseAdminRoleChanges
}
    `) as unknown as TypedDocumentString<PauseAdminRoleChangesMutation, PauseAdminRoleChangesMutationVariables>;
export const ResumeAdminRoleChangesDocument = new TypedDocumentString(`
    mutation ResumeAdminRoleChanges {
  resumeAdminRoleChanges
}
    `) as unknown as TypedDocumentString<ResumeAdminRoleChangesMutation, ResumeAdminRoleChangesMutationVariables>;
export const SetUserRoleDocument = new TypedDocumentString(`
    mutation SetUserRole($userId: ID!, $role: UserRole!, $note: String) {
  setUserRole(userId: $userId, role: $role, note: $note) {
    id
    role
    canCreateWorkspace
  }
}
    `) as unknown as TypedDocumentString<SetUserRoleMutation, SetUserRoleMutationVariables>;