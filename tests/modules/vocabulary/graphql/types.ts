export interface FormSuggestionConnection {
  edges: { cursor: string; node: Record<string, unknown> }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export interface FormValueNode {
  id: string;
  name: string;
  slug: string;
  description: string;
  group: { id: string; name: string; slug: string; description: string };
}

/** `ingredientFormGroups` as the group picker asks for it: each group. */
export interface FormGroupConnection {
  edges: { node: { id: string; name: string; slug: string; description: string } }[];
}

export interface FormValueConnection {
  edges: { cursor: string; node: FormValueNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

/** A filtered `ingredientFormValues` page as the filter tests ask for it: the count, and each name. */
export interface FilteredFormValues {
  totalCount: number;
  edges: { node: { name: string } }[];
}

export interface AstrologySuggestion {
  value: string;
  description: string | null;
  curated: boolean;
}

export interface AstrologySuggestionConnection {
  edges: { cursor: string; node: AstrologySuggestion }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export interface DeitySuggestionNode {
  id: string | null;
  value: string;
  description: string | null;
  tradition: string | null;
  curated: boolean;
}

export interface DeitySuggestionConnection {
  edges: { cursor: string; node: DeitySuggestionNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string;
  group: { id: string; name: string };
}

export interface CategoryConnection {
  edges: { cursor: string; node: CategoryNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

/** A filtered `categories` page as the filter tests ask for it: the count, and each name. */
export interface FilteredCategories {
  totalCount: number;
  edges: { node: { name: string } }[];
}

/** One error as the route sends it: the message, and the code and field errors MB.43 attaches. */
export interface WireError {
  message: string;
  path?: (string | number)[];
  extensions?: {
    code?: string;
    fieldErrors?: { path: (string | number)[]; message: string }[];
  };
}

export interface Answer<T> {
  data?: T | null;
  errors?: WireError[];
}

export interface AstrologyValueNode {
  id: string;
  name: string;
  slug: string;
  description: string;
}

/** A `planets` or `zodiacSigns` page as the tests ask for it: the count, the rows and where it stands. */
export interface AstrologyValueConnection {
  totalCount: number;
  countBefore: number | null;
  edges: { cursor: string; node: AstrologyValueNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}
