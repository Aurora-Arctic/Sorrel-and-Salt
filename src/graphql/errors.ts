import { GraphQLError } from 'graphql';
import { maskError as yogaMaskError, type YogaServerOptions } from 'graphql-yoga';
import { Forbidden, NotFound, ValidationError } from '../lib/errors';
import type { ErrorExtensions } from './types';

// The transport's half of src/lib/errors.ts: each service error leaves with a
// code, and anything else leaves masked (claude-docs/graphql/errors.md, "Errors").

function extensionsFor(error: unknown): ErrorExtensions | null {
  if (error instanceof ValidationError) {
    return {
      code: 'VALIDATION',
      fieldErrors: error.issues.map(({ path, message }) => ({ path: [...path], message })),
    };
  }
  if (error instanceof Forbidden) return { code: 'FORBIDDEN' };
  if (error instanceof NotFound) return { code: 'NOT_FOUND' };
  return null;
}

// graphql-js wraps a resolver's throw in a located GraphQLError; the type to
// map is the one at the bottom.
function unwrap(error: unknown): unknown {
  let current = error;
  while (current instanceof GraphQLError && current.originalError) {
    current = current.originalError;
  }
  return current;
}

/**
 * Yoga's `maskedErrors.maskError`. The service's message goes out verbatim —
 * it is what names the colliding entry or the ratio that failed.
 */
export function maskError(error: unknown, message: string): Error {
  const original = unwrap(error);
  const extensions = extensionsFor(original);
  if (extensions && original instanceof Error) {
    const located = error instanceof GraphQLError ? error : undefined;
    // No `originalError`: Yoga reads a GraphQLError carrying one as unexpected,
    // and answers a response with no `data` 500 instead of 200.
    return new GraphQLError(original.message, {
      nodes: located?.nodes,
      source: located?.source,
      positions: located?.positions,
      path: located?.path,
      extensions: { ...extensions },
    });
  }
  // Yoga's default, with dev mode forced off: its dev branch returns the
  // original message and stack under `extensions.originalError`. Yoga logs the
  // unmasked error server-side either way.
  return yogaMaskError(error, message, false);
}

export const maskedErrors = { maskError } satisfies YogaServerOptions<
  object,
  object
>['maskedErrors'];
