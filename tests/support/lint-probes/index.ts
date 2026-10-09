import type { ProbeSet } from '../types';
import { accessBoundary } from './access-boundary';
import { dbClientBoundary } from './db-client-boundary';
import { loaderBoundary } from './loader-boundary';
import { serviceSessionBoundary } from './service-session-boundary';

/**
 * Every lint guard's probes, in one list for the one oxlint run the `unit`
 * project's setup makes (MB.184). A fifth guard adds its set here and reads
 * its diagnostics off `inject('lintDiagnostics')` like the four.
 */
export const PROBE_SETS: ProbeSet[] = [
  accessBoundary,
  dbClientBoundary,
  loaderBoundary,
  serviceSessionBoundary,
];

/** Every file the shared run lints, probes first, in a stable order. */
export const LINTED_FILES = PROBE_SETS.flatMap((set) => [...set.probes.keys(), ...set.files]);
