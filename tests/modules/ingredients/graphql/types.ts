import type { ExecutionResult } from 'graphql';

export interface CommonNameConnection {
  edges: { cursor: string; node: Record<string, unknown> }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export interface CompendiumNode {
  id: string;
  name: string;
  canonicalName: string | null;
  nomenclature: string;
  form: string | null;
  isGlobal: boolean;
  folkNames: string[];
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
  folkNames: string[];
}

export interface DuplicateConnection {
  edges: { cursor: string; score: number; node: DuplicateNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export type Result = ExecutionResult<{ possibleDuplicates: DuplicateConnection }>;

export interface IngredientNode {
  id: string;
  name: string;
  nomenclature: string;
  canonicalName: string | null;
  isGlobal: boolean;
  folkNames: string[];
  categories: { name: string }[];
}

export interface WireError {
  message: string;
  path?: (string | number)[];
  extensions?: { code?: string; fieldErrors?: { path: (string | number)[]; message: string }[] };
}

export interface Answer<T> {
  data?: T | null;
  errors?: WireError[];
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
  deities: string[] | null;
  folkNames: string[];
  substitutes: SubstituteNode[];
  isGlobal: boolean;
  audit: { createdBy: string; updatedBy: string };
  [field: string]: unknown;
}

export interface IngredientSuggestionConnection {
  edges: { cursor: string; node: DuplicateNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}
