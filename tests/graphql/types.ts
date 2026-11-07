export interface Leaf {
  id: string;
  name: string;
}

export type LeavesData = {
  leaves: {
    edges: { cursor: string; node: { name: string } }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

export type CountedData = {
  leaves: {
    totalCount?: number;
    countBefore?: number | null;
    edges: { node: { name: string } }[];
    pageInfo: { endCursor: string | null };
  };
};
