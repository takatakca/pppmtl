/**
 * PPP KNOWLEDGE BASE
 *
 * A single structured, trilingual description of what PPP can truthfully tell a
 * customer. It is deliberately data-only: no UI, no network calls, no model.
 *
 * Consumers today: the /help centre and the FAQ surfaces.
 * Consumers later: the website assistant, the phone assistant, support tooling
 * and TAKATAK integrations — they read this file instead of re-describing PPP.
 *
 * Ground rules (same as src/data/support.ts):
 * - Every fact traces back to src/config/business.ts, src/config/locations.ts
 *   or src/config/external-presence.ts.
 * - When something is not confirmed, the entry says so. Nothing is invented.
 */

import { pppBusiness } from "@/config/business";
import { orderingChannels } from "@/config/external-presence";
import { comingSoonLocations, openLocations, restaurantLocations } from "@/config/locations";

export type KnowledgeTopic =
  "menu" | "locations" | "ordering" | "delivery" | "support" | "account" | "loyalty" | "franchise";

export interface KnowledgeFact {
  id: string;
  topic: KnowledgeTopic;
  /** Short trilingual statement a human or an assistant can repeat verbatim. */
  en: string;
  fr: string;
  es: string;
  /** Where a customer can act on this fact, when a page or external URL exists. */
  href?: string;
  external?: boolean;
  /** Retrieval keywords across all three languages. */
  keywords: string[];
  /** "confirmed" = traceable to config. "unconfirmed" = must be said as unknown. */
  confidence: "confirmed" | "unconfirmed";
}

const marketplaceNames = orderingChannels.map((c) => c.name).join(", ");
const openNames = openLocations.map((l) => l.neighborhood).join(", ");
const soonNames = comingSoonLocations.map((l) => l.neighborhood).join(", ");

export const knowledgeFacts: KnowledgeFact[] = [
  // MENU
  {
    id: "menu-source",
    topic: "menu",
    en: `The PPP menu covers pizza, rotisserie chicken, pitas, burgers, poutine, sides, combos and desserts. Prices shown on this site are the ${pppBusiness.shortLocationName} menu prices.`,
    fr: `Le menu PPP comprend pizza, poulet rôti, pitas, burgers, poutine, accompagnements, combos et desserts. Les prix affichés ici sont ceux du menu ${pppBusiness.shortLocationName}.`,
    es: `El menú de PPP incluye pizza, pollo rostizado, pitas, hamburguesas, poutine, acompañamientos, combos y postres. Los precios mostrados son los del menú de ${pppBusiness.shortLocationName}.`,
    href: "/menu",
    keywords: ["menu", "food", "carte", "comida", "precios", "prices", "prix"],
    confidence: "confirmed",
  },
  {
    id: "menu-allergens",
    topic: "menu",
    en: "Allergen and nutrition details are not published item by item. Call the restaurant before ordering if you have an allergy and the kitchen will tell you what is in a dish.",
    fr: "Les détails d'allergènes et de nutrition ne sont pas publiés article par article. Appelez le restaurant avant de commander en cas d'allergie et la cuisine vous dira ce que contient un plat.",
    es: "Los detalles de alérgenos y nutrición no se publican plato por plato. Llama al restaurante antes de pedir si tienes una alergia y la cocina te dirá qué lleva cada plato.",
    keywords: ["allergy", "allergene", "alergia", "gluten", "nutrition"],
    confidence: "unconfirmed",
  },

  // LOCATIONS
  {
    id: "locations-open",
    topic: "locations",
    en: `PPP is open in ${openNames}. The ${pppBusiness.shortLocationName} kitchen is at ${pppBusiness.address.line1}, ${pppBusiness.address.city}.`,
    fr: `PPP est ouvert à ${openNames}. La cuisine ${pppBusiness.shortLocationName} est au ${pppBusiness.address.line1}, ${pppBusiness.address.city}.`,
    es: `PPP está abierto en ${openNames}. La cocina de ${pppBusiness.shortLocationName} está en ${pppBusiness.address.line1}, ${pppBusiness.address.city}.`,
    href: "/locations",
    keywords: ["location", "address", "adresse", "sucursal", "direccion", "ndg", "somerled"],
    confidence: "confirmed",
  },
  {
    id: "locations-soon",
    topic: "locations",
    en: soonNames
      ? `More PPP kitchens are on the way: ${soonNames}. They are not taking orders yet.`
      : "New PPP kitchens are announced on the locations page as they open.",
    fr: soonNames
      ? `D'autres cuisines PPP arrivent : ${soonNames}. Elles ne prennent pas encore de commandes.`
      : "Les nouvelles cuisines PPP sont annoncées sur la page des emplacements.",
    es: soonNames
      ? `Vienen más cocinas PPP: ${soonNames}. Todavía no reciben pedidos.`
      : "Las nuevas cocinas PPP se anuncian en la página de sucursales.",
    href: "/locations",
    keywords: ["coming soon", "bientot", "proximamente", "new location"],
    confidence: "confirmed",
  },
  {
    id: "locations-count",
    topic: "locations",
    en: `${restaurantLocations.length} PPP locations are listed on this site, including kitchens that are not open yet.`,
    fr: `${restaurantLocations.length} emplacements PPP sont listés sur ce site, y compris ceux qui ne sont pas encore ouverts.`,
    es: `${restaurantLocations.length} sucursales PPP aparecen en este sitio, incluidas las que aún no abren.`,
    href: "/locations",
    keywords: ["how many", "combien", "cuantas", "franchise locations"],
    confidence: "confirmed",
  },

  // ORDERING
  {
    id: "ordering-ways",
    topic: "ordering",
    en: `You can order on this site, by phone at ${pppBusiness.phone.display}, in person, or through ${marketplaceNames}.`,
    fr: `Vous pouvez commander sur ce site, par téléphone au ${pppBusiness.phone.display}, sur place, ou via ${marketplaceNames}.`,
    es: `Puedes pedir en este sitio, por teléfono al ${pppBusiness.phone.display}, en persona o a través de ${marketplaceNames}.`,
    href: "/order",
    keywords: ["order", "commander", "pedir", "phone", "telephone", "telefono"],
    confidence: "confirmed",
  },
  {
    id: "ordering-guest",
    topic: "ordering",
    en: "You never need an account to order. Guest ordering works for pickup and delivery.",
    fr: "Vous n'avez jamais besoin d'un compte pour commander. La commande sans compte fonctionne pour la cueillette et la livraison.",
    es: "Nunca necesitas una cuenta para pedir. El pedido como invitado funciona para recoger y para entrega.",
    href: "/order",
    keywords: ["guest", "invite", "invitado", "account required"],
    confidence: "confirmed",
  },

  // DELIVERY
  {
    id: "delivery-owner",
    topic: "delivery",
    en: "Delivery placed on Uber Eats, DoorDash or Skip is carried out by that app. They assign the driver, hold the payment and handle refunds for those orders.",
    fr: "Une livraison passée sur Uber Eats, DoorDash ou Skip est effectuée par cette application. Elle attribue le livreur, détient le paiement et gère les remboursements.",
    es: "La entrega hecha en Uber Eats, DoorDash o Skip la realiza esa aplicación. Ellos asignan al repartidor, tienen el pago y gestionan los reembolsos.",
    href: "/help",
    keywords: ["delivery", "livraison", "entrega", "driver", "livreur", "repartidor", "refund"],
    confidence: "confirmed",
  },
  {
    id: "delivery-area",
    topic: "delivery",
    en: "Delivery range and fees depend on the app you order from and your address. The app shows both before you pay.",
    fr: "Le rayon et les frais de livraison dépendent de l'application utilisée et de votre adresse. L'application les affiche avant le paiement.",
    es: "El área y las tarifas de entrega dependen de la aplicación y de tu dirección. La aplicación te los muestra antes de pagar.",
    keywords: ["delivery fee", "zone", "frais", "tarifa", "area"],
    confidence: "unconfirmed",
  },

  // SUPPORT
  {
    id: "support-routing",
    topic: "support",
    en: `For a problem with an order, contact the place you ordered from. For anything about the restaurant itself, call PPP at ${pppBusiness.phone.display}.`,
    fr: `Pour un problème de commande, contactez l'endroit où vous avez commandé. Pour le restaurant lui-même, appelez PPP au ${pppBusiness.phone.display}.`,
    es: `Para un problema con un pedido, contacta el lugar donde pediste. Para el restaurante en sí, llama a PPP al ${pppBusiness.phone.display}.`,
    href: "/help",
    keywords: ["help", "support", "aide", "ayuda", "problem", "probleme", "problema"],
    confidence: "confirmed",
  },

  // ACCOUNT
  {
    id: "account-purpose",
    topic: "account",
    en: "A PPP account keeps your preferred name, your saved addresses, your favourites and your communication choices in one place.",
    fr: "Un compte PPP conserve votre nom d'usage, vos adresses, vos favoris et vos choix de communication au même endroit.",
    es: "Una cuenta PPP guarda tu nombre preferido, tus direcciones, tus favoritos y tus preferencias de comunicación en un solo lugar.",
    href: "/account",
    keywords: ["account", "compte", "cuenta", "profile", "profil", "perfil", "password"],
    confidence: "confirmed",
  },
  {
    id: "account-marketplace-history",
    topic: "account",
    en: "Orders placed on Uber Eats, DoorDash or Skip cannot appear in a PPP account — that history belongs to those apps.",
    fr: "Les commandes passées sur Uber Eats, DoorDash ou Skip ne peuvent pas apparaître dans un compte PPP — cet historique appartient à ces applications.",
    es: "Los pedidos hechos en Uber Eats, DoorDash o Skip no pueden aparecer en una cuenta PPP — ese historial es de esas aplicaciones.",
    href: "/account",
    keywords: ["history", "historique", "historial", "past orders"],
    confidence: "confirmed",
  },

  // LOYALTY
  {
    id: "loyalty-status",
    topic: "loyalty",
    en: "PPP rewards are being built. No points are being counted yet, so nothing is being lost while you wait.",
    fr: "Les récompenses PPP sont en préparation. Aucun point n'est comptabilisé pour l'instant, vous ne perdez donc rien.",
    es: "Las recompensas PPP están en preparación. Todavía no se acumulan puntos, así que no pierdes nada mientras tanto.",
    href: "/account",
    keywords: ["rewards", "points", "recompenses", "recompensas", "loyalty", "fidelite"],
    confidence: "confirmed",
  },

  // FRANCHISE
  {
    id: "franchise-contact",
    topic: "franchise",
    en: "PPP reviews franchise and partnership enquiries through the franchise page.",
    fr: "PPP étudie les demandes de franchise et de partenariat via la page franchise.",
    es: "PPP revisa las solicitudes de franquicia y asociación a través de la página de franquicia.",
    href: "/franchise",
    keywords: ["franchise", "franquicia", "partner", "investir", "invest"],
    confidence: "confirmed",
  },
];

export function factsForTopic(topic: KnowledgeTopic): KnowledgeFact[] {
  return knowledgeFacts.filter((f) => f.topic === topic);
}

/** Simple keyword retrieval — deterministic, so it can be tested and audited. */
export function findFacts(query: string, limit = 5): KnowledgeFact[] {
  const q = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!q.trim()) return [];
  return knowledgeFacts
    .map((f) => ({
      f,
      score: f.keywords.reduce((n, k) => (q.includes(k) ? n + 1 : n), 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.f);
}
