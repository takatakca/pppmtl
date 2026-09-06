/** Shapes shared by the generated NDG catalog and the hand-written menu module. */

export interface ModifierChoice {
  id: string;
  labelEn: string;
  labelFr: string;
  /**
   * Always `null` today: the published menu states the choices but never the
   * surcharge, and the prototype must never invent a price.
   */
  priceDelta: number | null;
}

export interface ModifierGroup {
  id: string;
  labelEn: string;
  labelFr: string;
  required: boolean;
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
