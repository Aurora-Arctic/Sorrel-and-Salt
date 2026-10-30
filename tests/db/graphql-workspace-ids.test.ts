import { describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import {
  PROBES,
  fieldsTakingWorkspaceId,
  runProbe,
  useProbeRows,
} from '../support/graphql-workspace-probes';

// A non-uuid `workspaceId` is a driver error masked as INTERNAL_SERVER_ERROR, so `assertMembership` refuses it as FORBIDDEN first, the answer a coven the caller is not in gets.
// Every field taking a `workspaceId` is named here and the first test fails on one that is not (claude-docs/db/membership-proof.md, "What the check asks").

const MALFORMED = ['not-a-coven', WORKSPACE_W_ID.slice(0, -1)];

useProbeRows();

describe('a workspaceId that is not a uuid', () => {
  it('is probed at every field that takes one', () => {
    expect(fieldsTakingWorkspaceId().sort()).toEqual(Object.keys(PROBES).sort());
  });

  it.each(Object.entries(PROBES))('is FORBIDDEN at %s', async (field, probe) => {
    // Why it could have answered: the same request naming W reaches the
    // field's service, and B is admitted to W.
    const admitted = await runProbe(probe, probe.admittedTo?.() ?? WORKSPACE_W_ID);
    expect(admitted.errors).toBeUndefined();
    expect(admitted.data?.[field]).toBeTruthy();

    for (const workspaceId of MALFORMED) {
      const result = await runProbe(probe, workspaceId);

      expect(result.data).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toMatchObject({
        path: [field],
        extensions: { code: 'FORBIDDEN' },
      });
    }
  });
});
