# Wave 05 — Authorization

All seven workspace-scoped tables now exist, so M6.3's `Membership` sweep over the finders is complete rather than partial — the reason this wave waits on the schema block. **M6.4 and M6.5 were on this row and are retired** (MB.29); M6.6 now carries the whole burden of proving isolation, which is why its direct-id denial tests are per-entity rather than a sample. **MB.49 follows MB.47**, whose follow-up hotfix it was: a failed migration names its cause, it depends on nothing else in the wave, and it was missing from this row until MB.103's reorder reported it.
