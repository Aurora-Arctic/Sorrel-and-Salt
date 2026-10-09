// Hand-written beside the script, as slowest-files.d.mts is: `allowJs` is off.

export interface AuditFix {
  name: string;
  version: string;
  isSemVerMajor: boolean;
}

export function fixCell(
  fixAvailable: boolean | AuditFix | undefined,
  installedVersion?: string,
): string;
