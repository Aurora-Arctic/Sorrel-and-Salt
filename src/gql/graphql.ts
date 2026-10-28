/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
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
  substitutes: Array<SubstituteInput>;
  /** Whether the ingredient is toxic; each form's flag is its own. */
  toxic: boolean;
  /** Its forms, each replacing the one it names; a form not listed is removed, and [] is none. */
  variants: Array<IngredientVariantInput>;
  zodiacSigns: Array<string>;
};

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

export type FormGroupIcon =
  | 'animal'
  | 'botanical'
  | 'curio'
  | 'fluid'
  | 'mineral'
  | 'substance';

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

export type Nomenclature =
  | 'botanical'
  | 'chemical'
  | 'fungal'
  | 'mineral'
  | 'none'
  | 'unknown'
  | 'zoological';

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
  referenceId: string | number;
};

/** One ingredient's stock edited together: jars to start, change and delete. */
export type SaveStockInput = {
  create: Array<CreateJarInput>;
  delete: Array<string | number>;
  update: Array<UpdateJarInput>;
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
  note?: string | null | undefined;
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

/** Changes a spell: a field left out keeps its value, and null clears it. Visibility only widens. */
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

export type WorkspaceRole =
  | 'member'
  | 'owner'
  | 'viewer';

export type ZodiacSignInput = {
  description: string;
  name: string;
};

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
}>;


export type AnnotateCupboardEntryMutation = { annotateCupboardEntry: { id: string } };

export type DeleteWorkspaceMutationVariables = Exact<{
  workspaceId: string | number;
}>;


export type DeleteWorkspaceMutation = { deleteWorkspace: boolean };

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


export type CreateWorkspaceIngredientMutation = { createWorkspaceIngredient: { id: string, name: string, slug: string, stock: Array<{ quantityOnHand: number | null, unit: InventoryUnit | null, variant: { form: string } }> } };

export type UpdateWorkspaceIngredientMutationVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
  input: IngredientUpdateInput;
}>;


export type UpdateWorkspaceIngredientMutation = { updateIngredient: { id: string, name: string, slug: string } };

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


export type CreateCompendiumIngredientMutation = { createCompendiumIngredient: { id: string, name: string, slug: string } };

export type UpdateCompendiumIngredientMutationVariables = Exact<{
  id: string | number;
  input: CompendiumIngredientUpdateInput;
  endRedirect?: boolean | null | undefined;
}>;


export type UpdateCompendiumIngredientMutation = { updateCompendiumIngredient: { id: string, name: string, slug: string } };

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


export type ReferenceQuery = { reference: { id: string, kind: ReferenceKind, title: string, authors: string | null, container: string | null, contributors: string | null, edition: string | null, volume: string | null, issue: string | null, series: string | null, place: string | null, publisher: string | null, published: string | null, pages: string | null, host: string | null, url: string | null, modified: string | null, accessed: string | null, note: string | null } };

export type ReferenceRowFragment = { id: string, citation: string, isGlobal: boolean, kind: ReferenceKind, authors: string | null, title: string, container: string | null };

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

export type CreateSpellMutationVariables = Exact<{
  workspaceId: string | number;
  input: SpellInput;
}>;


export type CreateSpellMutation = { createSpell: { id: string, revision: number, title: string | null, intent: string | null, jarDescription: string | null, sealWaxColor: string | null, moonPhase: string | null, dayOfWeek: string | null, note: string | null, visibility: SpellVisibility, steps: Array<{ id: string, name: string | null, form: string | null, quantity: number | null, unit: InventoryUnit | null, note: string | null, body: string | null, ingredient: { id: string, categories: Array<{ id: string, name: string }>, stock: Array<{ unit: InventoryUnit | null, variant: { id: string } }> } | null, variant: { id: string, categories: Array<{ id: string, name: string }>, formChoice: { group: { icon: FormGroupIcon | null } } | null } | null }> } };

export type UpdateSpellMutationVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
  input: UpdateSpellInput;
}>;


export type UpdateSpellMutation = { updateSpell: { id: string, revision: number, title: string | null, intent: string | null, jarDescription: string | null, sealWaxColor: string | null, moonPhase: string | null, dayOfWeek: string | null, note: string | null, visibility: SpellVisibility, steps: Array<{ id: string, name: string | null, form: string | null, quantity: number | null, unit: InventoryUnit | null, note: string | null, body: string | null, ingredient: { id: string, categories: Array<{ id: string, name: string }>, stock: Array<{ unit: InventoryUnit | null, variant: { id: string } }> } | null, variant: { id: string, categories: Array<{ id: string, name: string }>, formChoice: { group: { icon: FormGroupIcon | null } } | null } | null }> } };

export type SpellBuilderStepFragment = { id: string, name: string | null, form: string | null, quantity: number | null, unit: InventoryUnit | null, note: string | null, body: string | null, ingredient: { id: string, categories: Array<{ id: string, name: string }>, stock: Array<{ unit: InventoryUnit | null, variant: { id: string } }> } | null, variant: { id: string, categories: Array<{ id: string, name: string }>, formChoice: { group: { icon: FormGroupIcon | null } } | null } | null };

export type SpellIngredientSuggestionsQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type SpellIngredientSuggestionsQuery = { ingredientSuggestions: { edges: Array<{ group: SuggestionGroup, node: { id: string, name: string, canonicalName: string | null, retired: boolean, cupboardEntry: { label: string | null } | null, categories: Array<{ id: string, name: string }>, variants: Array<{ id: string, form: string, categories: Array<{ id: string, name: string }>, formChoice: { group: { icon: FormGroupIcon | null } } | null }>, stock: Array<{ unit: InventoryUnit | null, variant: { id: string } }> } }> } };

export type SpellBuilderStepsQueryVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
}>;


export type SpellBuilderStepsQuery = { spell: { id: string, steps: Array<{ id: string, name: string | null, form: string | null, quantity: number | null, unit: InventoryUnit | null, note: string | null, body: string | null, ingredient: { id: string, categories: Array<{ id: string, name: string }>, stock: Array<{ unit: InventoryUnit | null, variant: { id: string } }> } | null, variant: { id: string, categories: Array<{ id: string, name: string }>, formChoice: { group: { icon: FormGroupIcon | null } } | null } | null }> } };

export type SaveStockMutationVariables = Exact<{
  workspaceId: string | number;
  ingredientId: string | number;
  input: SaveStockInput;
}>;


export type SaveStockMutation = { saveStock: Array<{ id: string }> };

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

export const ReferenceRowFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReferenceRow"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Reference"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"citation"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"container"}}]}}]} as unknown as DocumentNode<ReferenceRowFragment, unknown>;
export const SpellBuilderStepFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpellBuilderStep"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SpellStep"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"ingredient"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stock"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"formChoice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}}]}}]}}]}}]} as unknown as DocumentNode<SpellBuilderStepFragment, unknown>;
export const RevokeAdminInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeAdminInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeAdminInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RevokeAdminInvitationMutation, RevokeAdminInvitationMutationVariables>;
export const CreateAdminInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAdminInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteRole"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InvitableSiteRole"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"note"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAdminInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"siteRole"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteRole"}}},{"kind":"Argument","name":{"kind":"Name","value":"note"},"value":{"kind":"Variable","name":{"kind":"Name","value":"note"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateAdminInvitationMutation, CreateAdminInvitationMutationVariables>;
export const CompendiumFacetCountsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CompendiumFacetCounts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"forms"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"withoutReferences"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"withoutForms"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"elements"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IngredientElement"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"categoryIds"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"categoryMode"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CategoryMode"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deityIds"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"zodiacSigns"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"celestialBodies"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"toxic"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ToxicFilter"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reviewed"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"covenIds"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"covensNot"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"compendiumFacets"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"forms"},"value":{"kind":"Variable","name":{"kind":"Name","value":"forms"}}},{"kind":"Argument","name":{"kind":"Name","value":"withoutReferences"},"value":{"kind":"Variable","name":{"kind":"Name","value":"withoutReferences"}}},{"kind":"Argument","name":{"kind":"Name","value":"withoutForms"},"value":{"kind":"Variable","name":{"kind":"Name","value":"withoutForms"}}},{"kind":"Argument","name":{"kind":"Name","value":"elements"},"value":{"kind":"Variable","name":{"kind":"Name","value":"elements"}}},{"kind":"Argument","name":{"kind":"Name","value":"categoryIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"categoryIds"}}},{"kind":"Argument","name":{"kind":"Name","value":"categoryMode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"categoryMode"}}},{"kind":"Argument","name":{"kind":"Name","value":"deityIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deityIds"}}},{"kind":"Argument","name":{"kind":"Name","value":"zodiacSigns"},"value":{"kind":"Variable","name":{"kind":"Name","value":"zodiacSigns"}}},{"kind":"Argument","name":{"kind":"Name","value":"celestialBodies"},"value":{"kind":"Variable","name":{"kind":"Name","value":"celestialBodies"}}},{"kind":"Argument","name":{"kind":"Name","value":"toxic"},"value":{"kind":"Variable","name":{"kind":"Name","value":"toxic"}}},{"kind":"Argument","name":{"kind":"Name","value":"reviewed"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reviewed"}}},{"kind":"Argument","name":{"kind":"Name","value":"covenIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"covenIds"}}},{"kind":"Argument","name":{"kind":"Name","value":"covensNot"},"value":{"kind":"Variable","name":{"kind":"Name","value":"covensNot"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"forms"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"zodiacSigns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"celestialBodies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"elements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"toxic"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"withoutReferences"}},{"kind":"Field","name":{"kind":"Name","value":"withoutForms"}},{"kind":"Field","name":{"kind":"Name","value":"reviewed"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]}}]} as unknown as DocumentNode<CompendiumFacetCountsQuery, CompendiumFacetCountsQueryVariables>;
export const CovenFacetCountsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CovenFacetCounts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"forms"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"elements"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IngredientElement"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"categoryIds"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"categoryMode"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CategoryMode"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deityIds"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"zodiacSigns"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"celestialBodies"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"toxic"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ToxicFilter"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"source"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"IngredientSource"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"inStock"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lowStockOnly"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workspaceIngredientFacets"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"forms"},"value":{"kind":"Variable","name":{"kind":"Name","value":"forms"}}},{"kind":"Argument","name":{"kind":"Name","value":"elements"},"value":{"kind":"Variable","name":{"kind":"Name","value":"elements"}}},{"kind":"Argument","name":{"kind":"Name","value":"categoryIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"categoryIds"}}},{"kind":"Argument","name":{"kind":"Name","value":"categoryMode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"categoryMode"}}},{"kind":"Argument","name":{"kind":"Name","value":"deityIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deityIds"}}},{"kind":"Argument","name":{"kind":"Name","value":"zodiacSigns"},"value":{"kind":"Variable","name":{"kind":"Name","value":"zodiacSigns"}}},{"kind":"Argument","name":{"kind":"Name","value":"celestialBodies"},"value":{"kind":"Variable","name":{"kind":"Name","value":"celestialBodies"}}},{"kind":"Argument","name":{"kind":"Name","value":"toxic"},"value":{"kind":"Variable","name":{"kind":"Name","value":"toxic"}}},{"kind":"Argument","name":{"kind":"Name","value":"source"},"value":{"kind":"Variable","name":{"kind":"Name","value":"source"}}},{"kind":"Argument","name":{"kind":"Name","value":"inStock"},"value":{"kind":"Variable","name":{"kind":"Name","value":"inStock"}}},{"kind":"Argument","name":{"kind":"Name","value":"lowStockOnly"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lowStockOnly"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"forms"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"zodiacSigns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"celestialBodies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"elements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"toxic"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"source"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"inStock"}},{"kind":"Field","name":{"kind":"Name","value":"lowStockOnly"}}]}}]}}]} as unknown as DocumentNode<CovenFacetCountsQuery, CovenFacetCountsQueryVariables>;
export const CreateWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkspace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>;
export const AnnotateCupboardEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AnnotateCupboardEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ingredientId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CupboardEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"annotateCupboardEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ingredientId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ingredientId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<AnnotateCupboardEntryMutation, AnnotateCupboardEntryMutationVariables>;
export const DeleteWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWorkspace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}]}]}}]} as unknown as DocumentNode<DeleteWorkspaceMutation, DeleteWorkspaceMutationVariables>;
export const SetEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"next"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"next"},"value":{"kind":"Variable","name":{"kind":"Name","value":"next"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<SetEmailMutation, SetEmailMutationVariables>;
export const CreateCategoryGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCategoryGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CategoryGroupInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCategoryGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<CreateCategoryGroupMutation, CreateCategoryGroupMutationVariables>;
export const UpdateCategoryGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCategoryGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CategoryGroupInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCategoryGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<UpdateCategoryGroupMutation, UpdateCategoryGroupMutationVariables>;
export const DeleteCategoryGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCategoryGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"moveTo"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCategoryGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"moveTo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"moveTo"}}}]}]}}]} as unknown as DocumentNode<DeleteCategoryGroupMutation, DeleteCategoryGroupMutationVariables>;
export const CreateIngredientFormGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateIngredientFormGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IngredientFormGroupInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createIngredientFormGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}}]}}]} as unknown as DocumentNode<CreateIngredientFormGroupMutation, CreateIngredientFormGroupMutationVariables>;
export const UpdateIngredientFormGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateIngredientFormGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IngredientFormGroupInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateIngredientFormGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}}]}}]} as unknown as DocumentNode<UpdateIngredientFormGroupMutation, UpdateIngredientFormGroupMutationVariables>;
export const DeleteIngredientFormGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteIngredientFormGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"moveTo"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteIngredientFormGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"moveTo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"moveTo"}}}]}]}}]} as unknown as DocumentNode<DeleteIngredientFormGroupMutation, DeleteIngredientFormGroupMutationVariables>;
export const CreateDeityTraditionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateDeityTradition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeityTraditionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createDeityTradition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<CreateDeityTraditionMutation, CreateDeityTraditionMutationVariables>;
export const UpdateDeityTraditionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateDeityTradition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeityTraditionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDeityTradition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<UpdateDeityTraditionMutation, UpdateDeityTraditionMutationVariables>;
export const DeleteDeityTraditionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteDeityTradition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"moveTo"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteDeityTradition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"moveTo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"moveTo"}}}]}]}}]} as unknown as DocumentNode<DeleteDeityTraditionMutation, DeleteDeityTraditionMutationVariables>;
export const CreateCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CategoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<CreateCategoryMutation, CreateCategoryMutationVariables>;
export const UpdateCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CategoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<UpdateCategoryMutation, UpdateCategoryMutationVariables>;
export const DeleteCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteCategoryMutation, DeleteCategoryMutationVariables>;
export const CreateIngredientFormValueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateIngredientFormValue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IngredientFormValueInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createIngredientFormValue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<CreateIngredientFormValueMutation, CreateIngredientFormValueMutationVariables>;
export const UpdateIngredientFormValueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateIngredientFormValue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IngredientFormValueInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateIngredientFormValue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<UpdateIngredientFormValueMutation, UpdateIngredientFormValueMutationVariables>;
export const DeleteIngredientFormValueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteIngredientFormValue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteIngredientFormValue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteIngredientFormValueMutation, DeleteIngredientFormValueMutationVariables>;
export const CreateDeityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateDeity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeityInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createDeity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<CreateDeityMutation, CreateDeityMutationVariables>;
export const UpdateDeityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateDeity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeityInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDeity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<UpdateDeityMutation, UpdateDeityMutationVariables>;
export const DeleteDeityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteDeity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteDeity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteDeityMutation, DeleteDeityMutationVariables>;
export const CreateCelestialBodyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCelestialBody"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CelestialBodyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCelestialBody"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateCelestialBodyMutation, CreateCelestialBodyMutationVariables>;
export const UpdateCelestialBodyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCelestialBody"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CelestialBodyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCelestialBody"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateCelestialBodyMutation, UpdateCelestialBodyMutationVariables>;
export const DeleteCelestialBodyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCelestialBody"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCelestialBody"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteCelestialBodyMutation, DeleteCelestialBodyMutationVariables>;
export const CreateZodiacSignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateZodiacSign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ZodiacSignInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createZodiacSign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateZodiacSignMutation, CreateZodiacSignMutationVariables>;
export const UpdateZodiacSignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateZodiacSign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ZodiacSignInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateZodiacSign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateZodiacSignMutation, UpdateZodiacSignMutationVariables>;
export const DeleteZodiacSignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteZodiacSign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteZodiacSign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteZodiacSignMutation, DeleteZodiacSignMutationVariables>;
export const AddCupboardEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddCupboardEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ingredientId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addCupboardEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ingredientId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ingredientId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<AddCupboardEntryMutation, AddCupboardEntryMutationVariables>;
export const RemoveCupboardEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveCupboardEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ingredientId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeCupboardEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ingredientId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ingredientId"}}}]}]}}]} as unknown as DocumentNode<RemoveCupboardEntryMutation, RemoveCupboardEntryMutationVariables>;
export const MakeItOursDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MakeItOurs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ingredientId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"convertCompendiumEntryToLocal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ingredientId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ingredientId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<MakeItOursMutation, MakeItOursMutationVariables>;
export const DeleteOwnIngredientDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteOwnIngredient"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteIngredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}]}]}}]} as unknown as DocumentNode<DeleteOwnIngredientMutation, DeleteOwnIngredientMutationVariables>;
export const SetCompendiumEntryReviewedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetCompendiumEntryReviewed"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reviewed"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setCompendiumEntryReviewed"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"reviewed"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reviewed"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<SetCompendiumEntryReviewedMutation, SetCompendiumEntryReviewedMutationVariables>;
export const PickerCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PickerCategories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"categories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"colorDark"}},{"kind":"Field","name":{"kind":"Name","value":"colorLight"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<PickerCategoriesQuery, PickerCategoriesQueryVariables>;
export const CompendiumEntryUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CompendiumEntryUsers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"compendiumEntryUsers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<CompendiumEntryUsersQuery, CompendiumEntryUsersQueryVariables>;
export const PossibleDuplicatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PossibleDuplicates"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"possibleDuplicates"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}},{"kind":"Field","name":{"kind":"Name","value":"nomenclature"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"inCupboard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}]}]}}]}}]}}]}}]} as unknown as DocumentNode<PossibleDuplicatesQuery, PossibleDuplicatesQueryVariables>;
export const CompendiumMatchesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CompendiumMatches"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"compendiumMatches"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}},{"kind":"Field","name":{"kind":"Name","value":"nomenclature"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"inCupboard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}]}]}}]}}]}}]}}]} as unknown as DocumentNode<CompendiumMatchesQuery, CompendiumMatchesQueryVariables>;
export const CreateWorkspaceIngredientDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkspaceIngredient"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IngredientInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkspaceIngredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"stock"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"quantityOnHand"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"form"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CreateWorkspaceIngredientMutation, CreateWorkspaceIngredientMutationVariables>;
export const UpdateWorkspaceIngredientDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWorkspaceIngredient"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IngredientUpdateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateIngredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<UpdateWorkspaceIngredientMutation, UpdateWorkspaceIngredientMutationVariables>;
export const AddCupboardEntryFromFormDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddCupboardEntryFromForm"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ingredientId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CupboardEntryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addCupboardEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ingredientId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ingredientId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<AddCupboardEntryFromFormMutation, AddCupboardEntryFromFormMutationVariables>;
export const CreateCompendiumIngredientDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCompendiumIngredient"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompendiumIngredientInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"endRedirect"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCompendiumIngredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}},{"kind":"Argument","name":{"kind":"Name","value":"endRedirect"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endRedirect"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<CreateCompendiumIngredientMutation, CreateCompendiumIngredientMutationVariables>;
export const UpdateCompendiumIngredientDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCompendiumIngredient"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompendiumIngredientUpdateInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"endRedirect"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCompendiumIngredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}},{"kind":"Argument","name":{"kind":"Name","value":"endRedirect"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endRedirect"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<UpdateCompendiumIngredientMutation, UpdateCompendiumIngredientMutationVariables>;
export const DeleteCompendiumIngredientDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCompendiumIngredient"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCompendiumIngredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteCompendiumIngredientMutation, DeleteCompendiumIngredientMutationVariables>;
export const DeleteWorkspaceIngredientDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWorkspaceIngredient"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteIngredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}]}]}}]} as unknown as DocumentNode<DeleteWorkspaceIngredientMutation, DeleteWorkspaceIngredientMutationVariables>;
export const PromoteFolkNameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PromoteFolkName"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"folkNameId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"promoteFolkName"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"folkNameId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"folkNameId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"folkNames"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<PromoteFolkNameMutation, PromoteFolkNameMutationVariables>;
export const DuplicateQuickLookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DuplicateQuickLook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ingredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}},{"kind":"Field","name":{"kind":"Name","value":"nomenclature"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"safetyNotes"}},{"kind":"Field","name":{"kind":"Name","value":"toxic"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"retired"}},{"kind":"Field","name":{"kind":"Name","value":"reviewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"elements"}},{"kind":"Field","name":{"kind":"Name","value":"celestialBodies"}},{"kind":"Field","name":{"kind":"Name","value":"zodiacSigns"}},{"kind":"Field","name":{"kind":"Name","value":"colors"}},{"kind":"Field","name":{"kind":"Name","value":"audit"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cupboardEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"safetyNotes"}},{"kind":"Field","name":{"kind":"Name","value":"elements"}},{"kind":"Field","name":{"kind":"Name","value":"celestialBodies"}},{"kind":"Field","name":{"kind":"Name","value":"zodiacSigns"}},{"kind":"Field","name":{"kind":"Name","value":"colors"}}]}},{"kind":"Field","name":{"kind":"Name","value":"folkNames"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"colorDark"}},{"kind":"Field","name":{"kind":"Name","value":"colorLight"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"deities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"deity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"otherNames"}},{"kind":"Field","name":{"kind":"Name","value":"tradition"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"safetyNotes"}},{"kind":"Field","name":{"kind":"Name","value":"toxic"}},{"kind":"Field","name":{"kind":"Name","value":"formChoice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"stock"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"quantityOnHand"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"lowStockThreshold"}}]}}]}}]}}]} as unknown as DocumentNode<DuplicateQuickLookQuery, DuplicateQuickLookQueryVariables>;
export const CreateReferenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateReference"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReferenceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createReference"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReferenceRow"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReferenceRow"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Reference"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"citation"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"container"}}]}}]} as unknown as DocumentNode<CreateReferenceMutation, CreateReferenceMutationVariables>;
export const UpdateReferenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateReference"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReferenceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateReference"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReferenceRow"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReferenceRow"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Reference"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"citation"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"container"}}]}}]} as unknown as DocumentNode<UpdateReferenceMutation, UpdateReferenceMutationVariables>;
export const ReferenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Reference"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reference"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"container"}},{"kind":"Field","name":{"kind":"Name","value":"contributors"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"volume"}},{"kind":"Field","name":{"kind":"Name","value":"issue"}},{"kind":"Field","name":{"kind":"Name","value":"series"}},{"kind":"Field","name":{"kind":"Name","value":"place"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"}},{"kind":"Field","name":{"kind":"Name","value":"published"}},{"kind":"Field","name":{"kind":"Name","value":"pages"}},{"kind":"Field","name":{"kind":"Name","value":"host"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"modified"}},{"kind":"Field","name":{"kind":"Name","value":"accessed"}},{"kind":"Field","name":{"kind":"Name","value":"note"}}]}}]}}]} as unknown as DocumentNode<ReferenceQuery, ReferenceQueryVariables>;
export const ReferenceSuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ReferenceSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReferenceRow"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReferenceRow"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Reference"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"citation"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"container"}}]}}]} as unknown as DocumentNode<ReferenceSuggestionsQuery, ReferenceSuggestionsQueryVariables>;
export const IngredientSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"IngredientSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ingredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"nomenclature"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"elements"}},{"kind":"Field","name":{"kind":"Name","value":"celestialBodies"}},{"kind":"Field","name":{"kind":"Name","value":"zodiacSigns"}},{"kind":"Field","name":{"kind":"Name","value":"colors"}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"formChoice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"elements"}},{"kind":"Field","name":{"kind":"Name","value":"celestialBodies"}},{"kind":"Field","name":{"kind":"Name","value":"zodiacSigns"}},{"kind":"Field","name":{"kind":"Name","value":"colors"}}]}}]}}]}}]} as unknown as DocumentNode<IngredientSummaryQuery, IngredientSummaryQueryVariables>;
export const FormSuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"FormSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"formSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"curated"}},{"kind":"Field","name":{"kind":"Name","value":"claimants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<FormSuggestionsQuery, FormSuggestionsQueryVariables>;
export const CommonNameSuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CommonNameSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commonNameSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"claimants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<CommonNameSuggestionsQuery, CommonNameSuggestionsQueryVariables>;
export const CelestialBodySuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CelestialBodySuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"celestialBodySuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"curated"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CelestialBodySuggestionsQuery, CelestialBodySuggestionsQueryVariables>;
export const ZodiacSuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ZodiacSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zodiacSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"curated"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ZodiacSuggestionsQuery, ZodiacSuggestionsQueryVariables>;
export const DeitySuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DeitySuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deitySuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"tradition"}},{"kind":"Field","name":{"kind":"Name","value":"matchedName"}},{"kind":"Field","name":{"kind":"Name","value":"curated"}}]}}]}}]}}]}}]} as unknown as DocumentNode<DeitySuggestionsQuery, DeitySuggestionsQueryVariables>;
export const IngredientSuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"IngredientSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ingredientSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"cupboardEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"formChoice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<IngredientSuggestionsQuery, IngredientSuggestionsQueryVariables>;
export const CompendiumSubstitutesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CompendiumSubstitutes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"compendium"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"formChoice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<CompendiumSubstitutesQuery, CompendiumSubstitutesQueryVariables>;
export const IngredientSearchMatchesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"IngredientSearchMatches"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"compendium"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}},{"kind":"Field","name":{"kind":"Name","value":"nomenclature"}}]}}]}}]}}]}}]} as unknown as DocumentNode<IngredientSearchMatchesQuery, IngredientSearchMatchesQueryVariables>;
export const IngredientSearchCupboardMatchesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"IngredientSearchCupboardMatches"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workspaceIngredients"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}},{"kind":"Field","name":{"kind":"Name","value":"nomenclature"}},{"kind":"Field","name":{"kind":"Name","value":"cupboardEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<IngredientSearchCupboardMatchesQuery, IngredientSearchCupboardMatchesQueryVariables>;
export const GrimoireSearchMatchesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GrimoireSearchMatches"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SpellStatus"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"grimoire"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GrimoireSearchMatchesQuery, GrimoireSearchMatchesQueryVariables>;
export const AcceptInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<AcceptInvitationMutation, AcceptInvitationMutationVariables>;
export const CreateInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InvitableRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateInvitationMutation, CreateInvitationMutationVariables>;
export const LeaveWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LeaveWorkspace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"leaveWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}]}]}}]} as unknown as DocumentNode<LeaveWorkspaceMutation, LeaveWorkspaceMutationVariables>;
export const PromoteSuccessorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PromoteSuccessor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkspaceRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateMemberRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<PromoteSuccessorMutation, PromoteSuccessorMutationVariables>;
export const RemoveMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}]}]}}]} as unknown as DocumentNode<RemoveMemberMutation, RemoveMemberMutationVariables>;
export const UpdateMemberRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateMemberRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkspaceRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateMemberRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateMemberRoleMutation, UpdateMemberRoleMutationVariables>;
export const SetNameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetName"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setName"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<SetNameMutation, SetNameMutationVariables>;
export const RemoveDeclinedInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveDeclinedInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RemoveDeclinedInvitationMutation, RemoveDeclinedInvitationMutationVariables>;
export const RevokeInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RevokeInvitationMutation, RevokeInvitationMutationVariables>;
export const AcceptInvitationByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptInvitationById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptInvitationById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}}]}}]}}]} as unknown as DocumentNode<AcceptInvitationByIdMutation, AcceptInvitationByIdMutationVariables>;
export const DeclineInvitationByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeclineInvitationById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"declineInvitationById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"declinedAt"}}]}}]}}]} as unknown as DocumentNode<DeclineInvitationByIdMutation, DeclineInvitationByIdMutationVariables>;
export const CreateSpellDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSpell"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SpellInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSpell"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"intent"}},{"kind":"Field","name":{"kind":"Name","value":"jarDescription"}},{"kind":"Field","name":{"kind":"Name","value":"sealWaxColor"}},{"kind":"Field","name":{"kind":"Name","value":"moonPhase"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"steps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SpellBuilderStep"}}]}},{"kind":"Field","name":{"kind":"Name","value":"visibility"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpellBuilderStep"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SpellStep"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"ingredient"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stock"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"formChoice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CreateSpellMutation, CreateSpellMutationVariables>;
export const UpdateSpellDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSpell"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSpellInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSpell"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"intent"}},{"kind":"Field","name":{"kind":"Name","value":"jarDescription"}},{"kind":"Field","name":{"kind":"Name","value":"sealWaxColor"}},{"kind":"Field","name":{"kind":"Name","value":"moonPhase"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"steps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SpellBuilderStep"}}]}},{"kind":"Field","name":{"kind":"Name","value":"visibility"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpellBuilderStep"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SpellStep"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"ingredient"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stock"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"formChoice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UpdateSpellMutation, UpdateSpellMutationVariables>;
export const SpellIngredientSuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SpellIngredientSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ingredientSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}},{"kind":"Field","name":{"kind":"Name","value":"retired"}},{"kind":"Field","name":{"kind":"Name","value":"cupboardEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"formChoice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"stock"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<SpellIngredientSuggestionsQuery, SpellIngredientSuggestionsQueryVariables>;
export const SpellBuilderStepsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SpellBuilderSteps"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"spell"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"steps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SpellBuilderStep"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpellBuilderStep"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SpellStep"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"ingredient"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stock"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"formChoice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}}]}}]}}]}}]} as unknown as DocumentNode<SpellBuilderStepsQuery, SpellBuilderStepsQueryVariables>;
export const SaveStockDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveStock"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ingredientId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveStockInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveStock"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ingredientId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ingredientId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<SaveStockMutation, SaveStockMutationVariables>;
export const GrantWorkspaceCreationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GrantWorkspaceCreation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"note"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"grantWorkspaceCreation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"note"},"value":{"kind":"Variable","name":{"kind":"Name","value":"note"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"canCreateWorkspace"}}]}}]}}]} as unknown as DocumentNode<GrantWorkspaceCreationMutation, GrantWorkspaceCreationMutationVariables>;
export const RevokeWorkspaceCreationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeWorkspaceCreation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"note"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeWorkspaceCreation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"note"},"value":{"kind":"Variable","name":{"kind":"Name","value":"note"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"canCreateWorkspace"}}]}}]}}]} as unknown as DocumentNode<RevokeWorkspaceCreationMutation, RevokeWorkspaceCreationMutationVariables>;
export const PauseAdminRoleChangesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PauseAdminRoleChanges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pauseAdminRoleChanges"}}]}}]} as unknown as DocumentNode<PauseAdminRoleChangesMutation, PauseAdminRoleChangesMutationVariables>;
export const ResumeAdminRoleChangesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResumeAdminRoleChanges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resumeAdminRoleChanges"}}]}}]} as unknown as DocumentNode<ResumeAdminRoleChangesMutation, ResumeAdminRoleChangesMutationVariables>;
export const SetUserRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetUserRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"note"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setUserRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}},{"kind":"Argument","name":{"kind":"Name","value":"note"},"value":{"kind":"Variable","name":{"kind":"Name","value":"note"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"canCreateWorkspace"}}]}}]}}]} as unknown as DocumentNode<SetUserRoleMutation, SetUserRoleMutationVariables>;