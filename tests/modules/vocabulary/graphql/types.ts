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

export interface FormGroupConnection {
  edges: { node: { id: string; name: string; slug: string; description: string } }[];
}

export interface FormValueConnection {
  edges: { cursor: string; node: FormValueNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export interface FilteredFormValues {
  totalCount: number;
  edges: { node: { name: string } }[];
}

interface AstrologySuggestion {
  value: string;
  description: string | null;
  curated: boolean;
}

export interface AstrologySuggestionConnection {
  edges: { cursor: string; node: AstrologySuggestion }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

interface DeitySuggestionNode {
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

export interface FilteredCategories {
  totalCount: number;
  edges: { node: { name: string } }[];
}

export interface AstrologyValueNode {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface AstrologyValueConnection {
  totalCount: number;
  countBefore: number | null;
  edges: { cursor: string; node: AstrologyValueNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export interface CategoryGroupNode {
  id: string;
  name: string;
  slug: string;
  description: string;
  colorDark: string;
  colorLight: string;
}

export interface FormGroupNode {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
}

export interface DeityNode {
  id: string;
  name: string;
  slug: string;
  description: string;
  tradition: { name: string };
}

export interface FilteredDeities {
  totalCount: number;
  edges: { node: { name: string; tradition: { name: string } } }[];
}
