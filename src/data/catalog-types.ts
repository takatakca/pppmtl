/** Shapes shared by the generated NDG catalog and the hand-written menu module. */

export interface ModifierChoice {
  id: string;
  labelEn: string;
  labelFr: string;
  /**
   * Dollars added by this option, from Clover. `null` only when no price is
   * published for it (never invented).
   */
  priceDelta: number | null;
}

export interface ModifierGroup {
  /** Clover option-group id for Clover items. */
  id: string;
  labelEn: string;
  labelFr: string;
  required: boolean;
  /** Options to choose at least (Clover `minRequired`). Absent = 1 when required, else 0. */
  min?: number;
  /** Options allowed at most (Clover `maxAllowed`). Absent = 1. */
  max?: number;
  choices: ModifierChoice[];
}

export interface GeneratedCategory {
  id: string;
  slug: string;
  nameEn: string;
  nameFr: string;
  /** Optional Spanish name. Absent = the English name is shown. */
  nameEs?: string;
  descriptionEn: string;
  descriptionFr: string;
  /** Optional Spanish description. Absent = the English description is shown. */
  descriptionEs?: string;
  aliasesEn: string[];
  aliasesFr: string[];
  /** Optional Spanish search aliases; trilingual synonyms also come from food-terms. */
  aliasesEs?: string[];
  image: string;
  sortOrder: number;
}

export interface GeneratedItem {
  id: string;
  categoryId: string;
  nameEn: string;
  nameFr: string;
  /** Optional Spanish name. Absent = the English name is shown. */
  nameEs?: string;
  descriptionEn: string;
  descriptionFr: string;
  /** Optional Spanish description. Absent = the English description is shown. */
  descriptionEs?: string;
  aliasesEn: string[];
  aliasesFr: string[];
  /** Optional Spanish search aliases; trilingual synonyms also come from food-terms. */
  aliasesEs?: string[];
  price: number | null;
  compareAtPrice: number | null;
  image: string;
  modifierGroups: ModifierGroup[];
}
