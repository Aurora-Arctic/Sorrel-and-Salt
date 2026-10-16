import 'server-only';
import { ValidationError } from '../../../lib/errors';
import type { JarConflict } from '../types';

/**
 * A save that would move a coven's jars onto a local ingredient and cannot
 * add two of them, because their units differ (M12.8). Nothing was written:
 * the save rolled back whole. A `ValidationError`, so the transport maps it
 * as VALIDATION without a change, pathed to `jarMerges`: the caller sends the
 * save again with a `jarMerges` entry per conflict, naming the amount to keep.
 * A promote has no `jarMerges` to send, so it passes an empty path.
 * `conflicts` is the same fact for a caller that would show both jars rather
 * than read the message. Not in `src/lib/errors.ts`, which imports nothing
 * and so cannot name a stock row.
 */
export class JarMergeNeeded extends ValidationError {
  readonly conflicts: readonly JarConflict[];

  constructor(
    conflicts: readonly JarConflict[],
    message: string,
    path: readonly string[] = ['jarMerges'],
  ) {
    super([{ path: [...path], message }], message);
    this.name = 'JarMergeNeeded';
    this.conflicts = conflicts;
  }
}
