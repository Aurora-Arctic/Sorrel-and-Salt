import type { Context } from '@/graphql/types';

interface WireError {
  message: string;
  path?: (string | number)[];
  extensions?: {
    code?: string;
    fieldErrors?: { path: (string | number)[]; message: string }[];
    currentRevision?: number;
  };
}

export interface Answer<T> {
  data?: T | null;
  errors?: WireError[];
}

export type ContextOverrides = Partial<Omit<Context, 'session'>>;
