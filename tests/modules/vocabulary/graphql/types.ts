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

export interface FormValueConnection {
  edges: { cursor: string; node: FormValueNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
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
