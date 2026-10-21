// What a typed box narrows a grouped list by: the text is in a row's own
// label, or in the name of the group its row is listed under. So typing a
// tradition lists its deities, and typing a category group lists its
// categories, beside any row whose own label holds the text. One place, so
// every list set under headings narrows the same way, and a row's group is
// not a second thing a caller forgets to match.

/** Whether `text` is in `label` or in `group`, case and surrounding space set aside; blank text is in every row. */
export function matchesLabelOrGroup(label: string, group: string | undefined, text: string) {
  const needle = text.trim().toLowerCase();
  return label.toLowerCase().includes(needle) || (group?.toLowerCase().includes(needle) ?? false);
}
