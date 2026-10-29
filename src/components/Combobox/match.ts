// What a typed box narrows a grouped list by: the text is in a row's own label or in its group's name, in one place so every grouped list narrows alike.

/** Whether `text` is in `label` or in `group`, case and surrounding space set aside; blank text is in every row. */
export function matchesLabelOrGroup(label: string, group: string | undefined, text: string) {
  const needle = text.trim().toLowerCase();
  return label.toLowerCase().includes(needle) || (group?.toLowerCase().includes(needle) ?? false);
}
