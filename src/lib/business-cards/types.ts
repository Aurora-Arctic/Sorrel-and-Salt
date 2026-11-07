export interface BusinessCardDetails {
  name: string;
  email: string;
  phone: string;
}

export interface BusinessCardsInput extends BusinessCardDetails {
  backs: boolean;
}

export interface RuleItem {
  x: number;
  y: number;
  width: number;
  weight: number;
  colour: string;
}
