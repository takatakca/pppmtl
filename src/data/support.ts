/**
 * Customer knowledge base + FAQ content for /support and /faq.
 *
 * Ground rules:
 * - Every fact traces to project config (business/locations/external-presence)
 *   or is written as a truthful "not confirmed yet" fallback.
 * - Nothing here repeats unverified legacy claims (24/7, exact loyalty rates,
 *   old cancellation windows, old phone numbers) as current fact.
 * - This file only describes content. It never calls a backend or AI model.
 */

import { orderingChannels } from "@/config/external-presence";
import { comingSoonLocations, pastLocations, restaurantLocations } from "@/config/locations";

export type FaqCategory =
  | "ordering"
  | "delivery"
  | "pickup"
  | "payment"
  | "allergens"
  | "locations"
  | "account"
  | "gift-cards"
  | "franchise"
  | "careers"
  | "privacy";

export interface FaqEntry {
  id: string;
  category: FaqCategory;
  questionEn: string;
  questionFr: string;
  answerEn: string;
  answerFr: string;
  tags: string[];
  /** Optional cross-link CTA shown under the answer (e.g. open provider support). */
  ctaEn?: string;
  ctaFr?: string;
  ctaHref?: string;
  ctaExternal?: boolean;
}

export const faqCategories: { id: FaqCategory; labelEn: string; labelFr: string }[] = [
  { id: "ordering", labelEn: "Ordering", labelFr: "Commander" },
  { id: "delivery", labelEn: "Delivery", labelFr: "Livraison" },
  { id: "pickup", labelEn: "Pickup", labelFr: "Cueillette" },
  { id: "payment", labelEn: "Payment", labelFr: "Paiement" },
  { id: "allergens", labelEn: "Allergens & nutrition", labelFr: "Allergènes et nutrition" },
  { id: "locations", labelEn: "Locations", labelFr: "Emplacements" },
  { id: "account", labelEn: "Account & rewards", labelFr: "Compte et récompenses" },
  { id: "gift-cards", labelEn: "Gift cards", labelFr: "Cartes-cadeaux" },
  { id: "franchise", labelEn: "Franchise", labelFr: "Franchise" },
  { id: "careers", labelEn: "Careers", labelFr: "Carrières" },
  { id: "privacy", labelEn: "Privacy", labelFr: "Confidentialité" },
];

const uberEats = orderingChannels.find((c) => c.id === "uber_eats")!;
const doorDash = orderingChannels.find((c) => c.id === "doordash")!;
const skip = orderingChannels.find((c) => c.id === "skip")!;

const comingSoonNamesEn = comingSoonLocations.map((l) => l.neighborhood).join(", ") || "—";
const comingSoonNamesFr = comingSoonNamesEn;

export const faqEntries: FaqEntry[] = [
  // Ordering
  {
    id: "how-to-order",
    category: "ordering",
    questionEn: "How do I order from PPP?",
    questionFr: "Comment commander chez PPP?",
    answerEn:
      "Order directly on this site for pickup or delivery from a PPP kitchen, or order through Uber Eats, DoorDash or SkipTheDishes where available. You can also call or walk in to order in person.",
    answerFr:
      "Commandez directement sur ce site pour la cueillette ou la livraison depuis une cuisine PPP, ou commandez via Uber Eats, DoorDash ou SkipTheDishes là où c'est offert. Vous pouvez aussi appeler ou vous présenter sur place.",
    tags: ["order", "how to order", "start order"],
  },
  {
    id: "guest-order",
    category: "ordering",
    questionEn: "Can I order as a guest?",
    questionFr: "Puis-je commander comme invité?",
    answerEn:
      "Yes. You can order without an account. Creating a free account lets you save favourites, reorder faster and keep track of any rewards.",
    answerFr:
      "Oui. Vous pouvez commander sans compte. Créer un compte gratuit permet d'enregistrer vos favoris, de recommander plus vite et de suivre vos récompenses.",
    tags: ["guest", "account required"],
  },
  {
    id: "change-location",
    category: "ordering",
    questionEn: "How do I change my location?",
    questionFr: "Comment changer d'emplacement?",
    answerEn:
      "Use the location selector in the header or on the order page to pick the PPP kitchen you want to order from. Only open locations can take an order.",
    answerFr:
      "Utilisez le sélecteur d'emplacement dans l'en-tête ou sur la page de commande pour choisir la cuisine PPP voulue. Seuls les emplacements ouverts peuvent traiter une commande.",
    tags: ["location", "switch store", "change store"],
  },
  {
    id: "which-apps",
    category: "delivery",
    questionEn: "Which delivery apps can I use?",
    questionFr: "Quelles applications de livraison puis-je utiliser?",
    answerEn:
      "PPP is listed on Uber Eats, DoorDash and SkipTheDishes where a store has an active listing. Availability varies by location — check the order page for the location you want.",
    answerFr:
      "PPP est présent sur Uber Eats, DoorDash et SkipTheDishes lorsqu'un restaurant y est inscrit. La disponibilité varie selon l'emplacement — vérifiez la page de commande pour l'emplacement voulu.",
    tags: ["uber eats", "doordash", "skip", "delivery app", "third party"],
  },
  {
    id: "third-party-uber",
    category: "delivery",
    questionEn: "How do I get help with an Uber Eats order?",
    questionFr: "Comment obtenir de l'aide pour une commande Uber Eats?",
    answerEn:
      "If you placed your order on Uber Eats, Uber Eats owns that order — including refunds, courier issues and order status. Open Uber Eats support from your Uber Eats order history for the fastest help.",
    answerFr:
      "Si votre commande a été passée sur Uber Eats, c'est Uber Eats qui gère cette commande — remboursements, problèmes de livreur et statut inclus. Ouvrez le support Uber Eats depuis l'historique de vos commandes pour une aide rapide.",
    tags: ["uber eats support", "uber refund", "where is my order", "uber"],
  },
  {
    id: "third-party-doordash",
    category: "delivery",
    questionEn: "How do I get help with a DoorDash order?",
    questionFr: "Comment obtenir de l'aide pour une commande DoorDash?",
    answerEn:
      "Orders placed on DoorDash are handled by DoorDash, including refunds and delivery issues. Open DoorDash support from your DoorDash order history.",
    answerFr:
      "Les commandes passées sur DoorDash sont gérées par DoorDash, y compris les remboursements et les problèmes de livraison. Ouvrez le support DoorDash depuis votre historique de commandes.",
    tags: ["doordash support", "doordash refund", "where is my order", "doordash"],
  },
  {
    id: "third-party-skip",
    category: "delivery",
    questionEn: "How do I get help with a Skip order?",
    questionFr: "Comment obtenir de l'aide pour une commande Skip?",
    answerEn:
      "Orders placed on SkipTheDishes are handled by Skip, including refunds and delivery issues. Open Skip support from your Skip order history.",
    answerFr:
      "Les commandes passées sur SkipTheDishes sont gérées par Skip, y compris les remboursements et les problèmes de livraison. Ouvrez le support Skip depuis votre historique de commandes.",
    tags: ["skip support", "skip refund", "where is my order", "skipthedishes"],
  },
  {
    id: "direct-order-support",
    category: "ordering",
    questionEn: "Who do I contact about a PPP Direct order?",
    questionFr: "Qui contacter pour une commande PPP Direct?",
    answerEn:
      "For an order placed directly on this site, contact the restaurant location you ordered from by phone. Use the support form on the Support page to send the details as well.",
    answerFr:
      "Pour une commande passée directement sur ce site, contactez par téléphone l'emplacement où vous avez commandé. Vous pouvez aussi envoyer les détails via le formulaire de la page Support.",
    tags: ["ppp direct", "direct order", "my order"],
  },
  {
    id: "pickup-how",
    category: "pickup",
    questionEn: "How does pickup work?",
    questionFr: "Comment fonctionne la cueillette?",
    answerEn:
      "Order online or by phone, choose pickup, and pick up your order at the restaurant counter. Pickup time estimates are shown at checkout for locations that support PPP Direct ordering.",
    answerFr:
      "Commandez en ligne ou par téléphone, choisissez la cueillette, puis récupérez votre commande au comptoir. Les délais estimés s'affichent au paiement pour les emplacements offrant la commande PPP Direct.",
    tags: ["pickup", "takeout", "counter"],
  },
  {
    id: "delivery-how",
    category: "delivery",
    questionEn: "Do you deliver?",
    questionFr: "Livrez-vous?",
    answerEn:
      "Delivery is available through the third-party apps listed on each location's order page (Uber Eats, DoorDash, SkipTheDishes) where a listing exists. Availability and delivery radius are set by each app.",
    answerFr:
      "La livraison est offerte via les applications tierces listées sur la page de commande de chaque emplacement (Uber Eats, DoorDash, SkipTheDishes) lorsqu'une fiche existe. La disponibilité et le rayon de livraison sont déterminés par chaque application.",
    tags: ["delivery", "delivery zone", "delivery radius"],
  },
  {
    id: "payment-methods",
    category: "payment",
    questionEn: "What payment methods do you accept?",
    questionFr: "Quels modes de paiement acceptez-vous?",
    answerEn:
      "Accepted payment methods are shown at checkout and can vary by location and ordering channel. If you order through a delivery app, that app's payment options apply.",
    answerFr:
      "Les modes de paiement acceptés sont indiqués au moment du paiement et peuvent varier selon l'emplacement et le mode de commande. Si vous commandez via une application de livraison, ce sont ses options de paiement qui s'appliquent.",
    tags: ["payment", "credit card", "pay"],
  },
  {
    id: "allergens-info",
    category: "allergens",
    questionEn: "Do you have allergen or nutrition information?",
    questionFr: "Avez-vous de l'information sur les allergènes ou la valeur nutritive?",
    answerEn:
      "Detailed allergen and nutrition information is not published on the menu yet. If you have a food allergy or dietary restriction, please call the restaurant location directly before ordering.",
    answerFr:
      "L'information détaillée sur les allergènes et la valeur nutritive n'est pas encore publiée sur le menu. En cas d'allergie alimentaire ou de restriction, veuillez appeler l'emplacement directement avant de commander.",
    tags: ["allergy", "allergen", "nutrition", "gluten", "dietary"],
  },
  {
    id: "locations-list",
    category: "locations",
    questionEn: "Where are PPP locations?",
    questionFr: "Où se trouvent les emplacements PPP?",
    answerEn: `Open PPP kitchens today are in ${restaurantLocations
      .filter((l) => l.lifecycleStatus === "open")
      .map((l) => l.neighborhood)
      .join(" and ")}. See the Locations section for addresses, phone numbers and directions.`,
    answerFr: `Les cuisines PPP ouvertes aujourd'hui sont à ${restaurantLocations
      .filter((l) => l.lifecycleStatus === "open")
      .map((l) => l.neighborhood)
      .join(" et ")}. Consultez la section Emplacements pour les adresses, numéros et itinéraires.`,
    tags: ["locations", "where", "address"],
  },
  {
    id: "coming-soon",
    category: "locations",
    questionEn: "Which locations are coming soon?",
    questionFr: "Quels emplacements ouvriront bientôt?",
    answerEn: `New PPP kitchens are planned for ${comingSoonNamesEn}. No opening dates are confirmed yet — check back on the Locations page for updates.`,
    answerFr: `De nouvelles cuisines PPP sont prévues à ${comingSoonNamesFr}. Aucune date d'ouverture n'est confirmée pour le moment — revenez consulter la page Emplacements pour les mises à jour.`,
    tags: ["coming soon", "new location", "opening"],
  },
  {
    id: "montreal-nord-closed",
    category: "locations",
    questionEn: "Is the Montréal-Nord location still open?",
    questionFr: "L'emplacement de Montréal-Nord est-il toujours ouvert?",
    answerEn:
      "No, the original Montréal-Nord location is closed. Please order from an open PPP kitchen instead — see the Locations page for current addresses and phone numbers.",
    answerFr:
      "Non, l'emplacement d'origine à Montréal-Nord est fermé. Veuillez commander auprès d'une cuisine PPP ouverte — consultez la page Emplacements pour les adresses et numéros actuels.",
    tags: ["montreal-nord", "montréal-nord", "closed", "old location"],
  },
  {
    id: "account-why",
    category: "account",
    questionEn: "Why should I create an account?",
    questionFr: "Pourquoi créer un compte?",
    answerEn:
      "An account lets you save favourites, reorder in one tap, keep saved addresses and see any member offers or rewards tied to your account.",
    answerFr:
      "Un compte permet d'enregistrer vos favoris, de recommander en un clic, de garder des adresses enregistrées et de voir les offres ou récompenses membres liées à votre compte.",
    tags: ["account", "sign up", "why account"],
  },
  {
    id: "rewards-guest",
    category: "account",
    questionEn: "Can I earn rewards as a guest?",
    questionFr: "Puis-je accumuler des récompenses en tant qu'invité?",
    answerEn:
      "Rewards and loyalty points are tracked on your PPP account. Create a free account before ordering so any eligible order counts toward your rewards.",
    answerFr:
      "Les récompenses et les points de fidélité sont suivis sur votre compte PPP. Créez un compte gratuit avant de commander pour qu'une commande admissible compte pour vos récompenses.",
    tags: ["rewards", "loyalty", "points", "guest"],
  },
  {
    id: "gift-cards-how",
    category: "gift-cards",
    questionEn: "How do gift cards work?",
    questionFr: "Comment fonctionnent les cartes-cadeaux?",
    answerEn:
      "PPP gift cards can be sent by email or picked up in store. Choose an amount, add a message, and the card is ready to use for pickup, delivery or dine-in at participating locations. Online gift card checkout is coming soon — call the restaurant to buy one today.",
    answerFr:
      "Les cartes-cadeaux PPP peuvent être envoyées par courriel ou remises en magasin. Choisissez un montant, ajoutez un message, et la carte est prête pour la cueillette, la livraison ou sur place dans les emplacements participants. Le paiement en ligne arrive bientôt — appelez le restaurant pour en acheter une dès maintenant.",
    tags: ["gift card", "gift certificate"],
  },
  {
    id: "franchise-info",
    category: "franchise",
    questionEn: "How do I ask about a PPP franchise?",
    questionFr: "Comment me renseigner sur une franchise PPP?",
    answerEn:
      "Use the franchise contact option on the Contact or Support page to send a request. A member of the PPP team will follow up with next steps.",
    answerFr:
      "Utilisez l'option de contact franchise sur la page Contact ou Support pour envoyer une demande. Un membre de l'équipe PPP fera un suivi avec les prochaines étapes.",
    tags: ["franchise", "own a ppp", "franchising"],
  },
  {
    id: "careers-apply",
    category: "careers",
    questionEn: "How do I apply for a job at PPP?",
    questionFr: "Comment postuler pour un emploi chez PPP?",
    answerEn:
      "Use the careers contact option to reach out about kitchen, counter or delivery roles. Mention the location you'd like to work at.",
    answerFr:
      "Utilisez l'option de contact carrières pour vous informer sur les postes en cuisine, au comptoir ou en livraison. Mentionnez l'emplacement souhaité.",
    tags: ["careers", "job", "apply", "hiring"],
  },
  {
    id: "privacy-data",
    category: "privacy",
    questionEn: "How is my information used?",
    questionFr: "Comment mes renseignements sont-ils utilisés?",
    answerEn:
      "Account and order information is used to process orders, manage your account and, where applicable, track rewards. Contact PPP support with any privacy question.",
    answerFr:
      "Les renseignements de compte et de commande servent à traiter les commandes, gérer votre compte et, le cas échéant, suivre vos récompenses. Contactez le support PPP pour toute question de confidentialité.",
    tags: ["privacy", "data", "personal information"],
  },
  {
    id: "phone-not-published",
    category: "locations",
    questionEn: "A location's phone number isn't showing — why?",
    questionFr: "Le numéro de téléphone d'un emplacement ne s'affiche pas — pourquoi?",
    answerEn:
      "Some newer or upcoming locations don't have a published phone number yet. Once confirmed by the restaurant, it will appear on that location's page.",
    answerFr:
      "Certains emplacements récents ou à venir n'ont pas encore de numéro publié. Une fois confirmé par le restaurant, il apparaîtra sur la page de cet emplacement.",
    tags: ["phone", "not published", "no number"],
  },
  {
    id: "track-ppp-order",
    category: "ordering",
    questionEn: "How do I track my PPP order?",
    questionFr: "Comment suivre ma commande PPP?",
    answerEn:
      "For an order placed directly on this site (PPP Direct), use the Track Order page and choose PPP Direct. For a phone order, choose Phone order on the same page. Orders placed on Uber Eats, DoorDash or SkipTheDishes are tracked inside that app, not on this site.",
    answerFr:
      "Pour une commande passée directement sur ce site (PPP Direct), utilisez la page Suivi de commande et choisissez PPP Direct. Pour une commande par téléphone, choisissez Commande téléphonique sur la même page. Les commandes passées sur Uber Eats, DoorDash ou SkipTheDishes se suivent dans cette application, pas sur ce site.",
    tags: ["track", "tracking", "where is my order", "status"],
    ctaEn: "Go to Support",
    ctaFr: "Aller au Support",
    ctaHref: "/support",
  },
  {
    id: "phone-order-how",
    category: "ordering",
    questionEn: "How do I order by phone?",
    questionFr: "Comment commander par téléphone?",
    answerEn:
      "Call the PPP location you'd like to order from and place your order with the team. Phone numbers are listed on each location's page — some newer locations don't have a published number yet.",
    answerFr:
      "Appelez l'emplacement PPP où vous souhaitez commander et passez votre commande avec l'équipe. Les numéros sont indiqués sur la page de chaque emplacement — certains nouveaux emplacements n'ont pas encore de numéro publié.",
    tags: ["phone order", "call to order", "order by phone"],
    ctaEn: "Find a location's number",
    ctaFr: "Trouver le numéro d'un emplacement",
    ctaHref: "/contact",
  },
  {
    id: "callback-request",
    category: "ordering",
    questionEn: "Can I request a callback?",
    questionFr: "Puis-je demander un rappel?",
    answerEn:
      "A dedicated callback request feature is coming. For now, the fastest way to reach a PPP location is to call it directly during open hours — see the Contact page for numbers.",
    answerFr:
      "Une fonction de demande de rappel dédiée s'en vient. Pour l'instant, le moyen le plus rapide de joindre un emplacement PPP est de l'appeler directement pendant les heures d'ouverture — voir la page Contact pour les numéros.",
    tags: ["callback", "call me back", "request a call"],
    ctaEn: "Go to Contact",
    ctaFr: "Aller à Contact",
    ctaHref: "/contact",
  },
  {
    id: "marketplace-vs-direct",
    category: "ordering",
    questionEn: "What's the difference between PPP Direct and ordering through a delivery app?",
    questionFr: "Quelle est la différence entre PPP Direct et une application de livraison?",
    answerEn:
      "PPP Direct means you're ordering straight from this website or by phone — PPP handles the whole order. Uber Eats, DoorDash and SkipTheDishes are separate marketplaces: they own the order, the courier and the refund process for anything placed through them.",
    answerFr:
      "PPP Direct signifie que vous commandez directement sur ce site ou par téléphone — PPP gère toute la commande. Uber Eats, DoorDash et SkipTheDishes sont des plateformes distinctes : elles gèrent la commande, le livreur et le remboursement pour tout ce qui y est commandé.",
    tags: ["marketplace", "ppp direct", "difference", "third party"],
  },
  {
    id: "refund-ppp-direct",
    category: "payment",
    questionEn: "How do I get a refund for a PPP Direct order?",
    questionFr: "Comment obtenir un remboursement pour une commande PPP Direct?",
    answerEn:
      "Call the location you ordered from with your order details. For a marketplace order (Uber Eats, DoorDash, Skip), the refund must be requested in that app — PPP cannot issue a refund on an order it doesn't control.",
    answerFr:
      "Appelez l'emplacement où vous avez commandé avec les détails de votre commande. Pour une commande sur une plateforme (Uber Eats, DoorDash, Skip), le remboursement doit être demandé dans cette application — PPP ne peut pas rembourser une commande qu'il ne contrôle pas.",
    tags: ["refund", "money back", "payment issue"],
  },
];

export const uberEatsHelpUrl = uberEats.supportUrl;
export const doorDashHelpUrl = doorDash.supportUrl;
export const skipHelpUrl = skip.supportUrl;

export function faqByCategory(category: FaqCategory) {
  return faqEntries.filter((f) => f.category === category);
}

export { comingSoonLocations, pastLocations };
