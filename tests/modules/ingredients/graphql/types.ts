import type { Answer } from '../../../support/graphql/types';

export interface FolkNameNode {
  id: string;
  name: string;
}

export interface CommonNameConnection {
  edges: { cursor: string; node: Record<string, unknown> }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export interface CompendiumNode {
  id: string;
  name: string;
  canonicalName: string | null;
  nomenclature: string;
  isGlobal: boolean;
  folkNames: FolkNameNode[];
  categories: { name: string; group: { name: string; colorDark: string } }[];
}

export interface CompendiumConnection {
  edges: { cursor: string; score: number | null; node: CompendiumNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export interface DuplicateNode {
  id: string;
  name: string;
  canonicalName: string | null;
  isGlobal: boolean;
  folkNames: FolkNameNode[];
}

export interface DuplicateConnection {
  edges: { cursor: string; score: number; node: DuplicateNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export type Result = Answer<{ possibleDuplicates: DuplicateConnection }>;

export interface IngredientNode {
  id: string;
  name: string;
  nomenclature: string;
  canonicalName: string | null;
  isGlobal: boolean;
  folkNames: FolkNameNode[];
  categories: { name: string }[];
}

/** One `IngredientVariant` as ingredient.test.ts selects it. */
export interface IngredientVariantNode {
  id: string;
  form: string;
  formChoice: { id: string } | null;
  description: string | null;
  safetyNotes: string | null;
  elements: string[] | null;
  celestialBodies: string[] | null;
  zodiacSigns: string[] | null;
  colors: string[] | null;
  categories: { name: string }[];
  substitutes: (SubstituteNode & { variant: { id: string; form: string } | null })[];
  references: { reference: { title: string }; locator: string | null }[];
  audit: { createdBy: string; updatedBy: string };
}

/** One `IngredientDeity`, its curated deity selected by id and tradition. */
export interface IngredientDeityNode {
  name: string;
  deity: { id: string; tradition?: { name: string } } | null;
}

/** One `Substitute`, its ingredient selected by id and label. */
export interface SubstituteNode {
  name: string;
  ingredient: { id: string; name?: string } | null;
}

export interface WorkspaceIngredientNode {
  id: string;
  name: string;
  nomenclature: string;
  elements: string[] | null;
  deities: IngredientDeityNode[];
  folkNames: FolkNameNode[];
  substitutes: SubstituteNode[];
  isGlobal: boolean;
  audit: { createdBy: string; updatedBy: string };
  [field: string]: unknown;
}

export interface IngredientSuggestionConnection {
  edges: { cursor: string; group: 'yours' | 'compendium'; node: DuplicateNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

/** A `Reference` as references.test.ts selects it. */
export interface ReferenceNode {
  id: string;
  kind: string;
  authors: string | null;
  title: string;
  container: string | null;
  url: string | null;
  modified: string | null;
  accessed: string | null;
  citation: string;
  isGlobal: boolean;
  audit: { createdBy: string; updatedBy: string };
}

/** One `InventoryItem` as stock.test.ts selects it. */
export interface InventoryItemNode {
  id: string;
  quantityOnHand: number | null;
  unit: string | null;
  unitDimension: string | null;
  lowStockThreshold: number | null;
  source: string | null;
  acquiredDate: string | null;
  ingredient: { id: string; name: string; stock: { id: string; quantityOnHand: number | null }[] };
  variant: { id: string; form: string };
  audit: { createdBy: string; updatedBy: string };
}

/** One `CupboardEntry` as cupboard-entries.test.ts selects it. */
export interface CupboardEntryNode {
  id: string;
  label: string | null;
  description: string | null;
  safetyNotes: string | null;
  elements: string[] | null;
  celestialBodies: string[] | null;
  zodiacSigns: string[] | null;
  colors: string[] | null;
  annotated: boolean;
  compendiumName: string;
}
