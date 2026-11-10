import { fold } from '@/lib/text';

export function matchesLabelOrGroup(label: string, group: string | undefined, text: string) {
  const needle = fold(text);
  return fold(label).includes(needle) || (group !== undefined && fold(group).includes(needle));
}
