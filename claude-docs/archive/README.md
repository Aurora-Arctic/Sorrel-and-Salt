# Archive

Frozen history. An agent never reads this folder. The plain text of every file in it is in git history; the tarballs here keep it in the repository without anything searching it.

| Tarball                           | Holds                                                                       | Files |
| --------------------------------- | --------------------------------------------------------------------------- | ----- |
| `tasks-closed-waves.tar.gz`       | The task files of closed waves (`archive/tasks/`)                           | 17    |
| `design-decisions-history.tar.gz` | Design records that were superseded or whose content now lives in live docs | 10    |
| `transcripts.tar.gz`              | The old working transcripts and their README                                | 5     |
| `deity-sources-citations.tar.gz`  | The deity source citations list                                             | 1     |
| `v1-archive.tar.gz`               | The earlier archive: milestone 0, wave 1 and wave 2 material                | 55    |

`compendium-seed-shards/` stays here as plain files until MB.249 closes, because that task still reads it.

Paths inside each tarball are relative to `claude-docs/`.

- List one: `tar -tzf claude-docs/archive/<name>.tar.gz`
- Extract one: `tar -xzf claude-docs/archive/<name>.tar.gz -C /tmp`, then read it under `/tmp`.
