import type { ProbeSet } from '../types';
import { dbClientBoundary } from './db-client-boundary';
import { loaderBoundary } from './loader-boundary';

/**
 * Every lint guard's probes, in one list for the one oxlint run the `unit`
 * project's setup makes (MB.184). The rest of `.oxlintrc.json`'s bans are
 * proved once by a probe in the PR that adds them and carried by lint itself
 * (claude-docs/testing/layer-ownership.md, "What a test may assert", rule 8).
 */
export const PROBE_SETS: ProbeSet[] = [dbClientBoundary, loaderBoundary];

/** Every file the shared run lints, probes first, in a stable order. */
export const LINTED_FILES = PROBE_SETS.flatMap((set) => [...set.probes.keys(), ...set.files]);
