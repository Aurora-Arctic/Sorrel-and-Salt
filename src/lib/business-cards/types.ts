/** What a keeper prints on their business cards. */
export interface BusinessCardDetails {
  name: string;
  email: string;
  phone: string;
}

export interface BusinessCardsInput extends BusinessCardDetails {
  /** Whether the page of fronts is followed by a page of their backs. */
  backs: boolean;
}

/** The green line under the name, in artboard pixels: its left end, its height, its length and its stroke width. */
export interface RuleItem {
  x: number;
  y: number;
  width: number;
  weight: number;
  colour: string;
}
