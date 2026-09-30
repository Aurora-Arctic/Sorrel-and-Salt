/** A row of the pagination tests' throwaway schema: a branch or a leaf. */
export interface Leaf {
  id: string;
  name: string;
}

/** What a `leaves` page query answers. */
export type LeavesData = {
  leaves: {
    edges: { cursor: string; node: { name: string } }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

/** What a `leaves` page query answers when it asks for the counts. */
export type CountedData = {
  leaves: {
    totalCount?: number;
    countBefore?: number | null;
    edges: { node: { name: string } }[];
    pageInfo: { endCursor: string | null };
  };
};
