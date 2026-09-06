/**
 * Trilingual food vocabulary used by the PPP search engine.
 *
 * The catalog itself is written in English and French. Rather than duplicating
 * 175 items in a third language just so search works, every group below lists
 * the same food idea in EN / FR / ES. A query term is expanded to its whole
 * group before scoring, so "pollo", "poulet" and "chicken" all reach the same
 * results. Words are stored already normalized (lowercase, no accents).
 */
export const FOOD_TERM_GROUPS: string[][] = [
  ["chicken", "poulet", "pollo", "rotisserie", "rostizado"],
  ["wings", "ailes", "alitas", "alas"],
  ["pizza", "pizzas"],
  ["burger", "hamburger", "hamburguesa", "burgers"],
  ["fries", "frites", "papas", "patatas", "papitas"],
  ["poutine"],
  ["pita", "pitas"],
  ["sub", "sandwich", "sandwiches", "bocadillo"],
  ["salad", "salade", "ensalada"],
  ["dessert", "desserts", "postre", "postres", "sucre", "dulce"],
  ["drink", "drinks", "boisson", "boissons", "bebida", "bebidas"],
  ["water", "eau", "agua"],
  ["combo", "combos", "repas", "comida"],
  ["side", "sides", "accompagnement", "accompagnements", "acompanamiento"],
  ["cheese", "fromage", "queso"],
  ["pepperoni", "peperoni"],
  ["beef", "boeuf", "carne", "res"],
  ["shrimp", "crevette", "crevettes", "camaron", "camarones"],
  ["fish", "poisson", "pescado"],
  ["vegetarian", "vegetarien", "vegetarienne", "vegetariano", "veggie", "vegetales"],
  ["spicy", "piquant", "picante", "hot"],
  ["garlic", "ail", "ajo"],
  ["onion", "oignon", "oignons", "cebolla"],
  ["mushroom", "mushrooms", "champignon", "champignons", "champinones"],
  ["tomato", "tomate", "tomates"],
  ["rice", "riz", "arroz"],
  ["sauce", "salsa", "sauces"],
  ["kids", "enfant", "enfants", "ninos", "nino"],
  ["family", "famille", "familia"],
  ["small", "petit", "petite", "pequeno", "chico"],
  ["large", "grand", "grande"],
  ["breast", "poitrine", "pechuga"],
  ["leg", "cuisse", "pierna", "muslo"],
  ["bacon", "tocino"],
  ["hot dog", "hotdog", "perro caliente"],
];

const EXPANSION = new Map<string, string[]>();
for (const group of FOOD_TERM_GROUPS) {
  for (const word of group) {
    const existing = EXPANSION.get(word) ?? [];
    EXPANSION.set(word, Array.from(new Set([...existing, ...group])));
  }
}

/** Returns the term plus its EN/FR/ES equivalents (always includes the input). */
export function expandFoodTerm(term: string): string[] {
  return EXPANSION.get(term) ?? [term];
}
