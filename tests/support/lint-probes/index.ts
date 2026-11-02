import type { ProbeSet } from '../types';
import { dbClientBoundary } from './db-client-boundary';
import { jobBoundary } from './job-boundary';
import { loaderBoundary } from './loader-boundary';

/**
 * Every lint guard's probes, in one list for the one oxlint run the `unit` project's setup makes (claude-docs/testing/layer-ownership.md,
 * "What a test may assert", rule 8).
 */
export const PROBE_SETS: ProbeSet[] = [dbClientBoundary, loaderBoundary, jobBoundary];

/** Every file the shared run lints, probes first, in a stable order. */
export const LINTED_FILES = PROBE_SETS.flatMap((set) => [...set.probes.keys(), ...set.files]);
