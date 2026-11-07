export function matchesLabelOrGroup(label: string, group: string | undefined, text: string) {
  const needle = text.trim().toLowerCase();
  return label.toLowerCase().includes(needle) || (group?.toLowerCase().includes(needle) ?? false);
}
