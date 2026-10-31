/**
 * Order failures, translated into human sentences.
 *
 * Rule: a customer never sees a provider error, a status code or a stack.
 * Every failure resolves to one of these codes and one calm sentence.
 */

export type OrderErrorCode =
  | "empty_cart"
  | "no_location"
  | "location_not_mapped"
  | "location_closed"
  | "missing_name"
  | "missing_phone"
  | "missing_address"
  | "outside_delivery_area"
  | "unsupported_order_type"
  | "item_unavailable"
  | "menu_changed"
  | "provider_unavailable"
  | "provider_error"
  | "timeout"
  | "payment_unavailable"
  | "duplicate_submission"
  | "order_not_found"
  | "not_cancellable";

interface Message {
  en: string;
  fr: string;
  es: string;
}

const MESSAGES: Record<OrderErrorCode, Message> = {
  empty_cart: {
    en: "Your order is empty. Add something delicious first.",
    fr: "Votre commande est vide. Ajoutez quelque chose d'abord.",
    es: "Tu pedido está vacío. Agrega algo primero.",
  },
  no_location: {
    en: "Choose a restaurant before finishing your order.",
    fr: "Choisissez un restaurant avant de terminer votre commande.",
    es: "Elige un restaurante antes de terminar tu pedido.",
  },
  location_not_mapped: {
    en: "This restaurant is not taking online orders yet. Call us and we will take care of you.",
    fr: "Ce restaurant ne prend pas encore les commandes en ligne. Appelez-nous, on s'occupe de vous.",
    es: "Este restaurante aún no toma pedidos en línea. Llámanos y te atendemos.",
  },
  location_closed: {
    en: "This restaurant is closed right now. Try again during opening hours.",
    fr: "Ce restaurant est fermé en ce moment. Réessayez pendant les heures d'ouverture.",
    es: "Este restaurante está cerrado ahora. Inténtalo durante el horario de apertura.",
  },
  missing_name: {
    en: "Tell us who the order is for.",
    fr: "Dites-nous à quel nom est la commande.",
    es: "Dinos a nombre de quién es el pedido.",
  },
  missing_phone: {
    en: "Add a phone number so the kitchen can reach you.",
    fr: "Ajoutez un numéro de téléphone pour que la cuisine puisse vous joindre.",
    es: "Agrega un teléfono para que la cocina pueda contactarte.",
  },
  missing_address: {
    en: "Add a delivery address.",
    fr: "Ajoutez une adresse de livraison.",
    es: "Agrega una dirección de entrega.",
  },
  outside_delivery_area: {
    en: "We don't deliver to this address yet. Choose pickup, or order delivery on Uber Eats, DoorDash or Skip.",
    fr: "Nous ne livrons pas encore à cette adresse. Choisissez la cueillette, ou commandez la livraison sur Uber Eats, DoorDash ou Skip.",
    es: "Aún no entregamos en esta dirección. Elige recoger, o pide entrega en Uber Eats, DoorDash o Skip.",
  },
  unsupported_order_type: {
    en: "That way of ordering is not open yet. Choose pickup or delivery.",
    fr: "Ce mode de commande n'est pas encore ouvert. Choisissez cueillette ou livraison.",
    es: "Esa forma de pedir aún no está abierta. Elige recoger o entrega.",
  },
  item_unavailable: {
    en: "Something on your order just sold out. Please review it.",
    fr: "Un article de votre commande vient de s'épuiser. Veuillez la revoir.",
    es: "Algo de tu pedido se acaba de agotar. Revísalo, por favor.",
  },
  menu_changed: {
    en: "Something changed with your order. Please review it.",
    fr: "Quelque chose a changé dans votre commande. Veuillez la revoir.",
    es: "Algo cambió en tu pedido. Revísalo, por favor.",
  },
  provider_unavailable: {
    en: "Online ordering is temporarily unavailable. Please choose another ordering method.",
    fr: "La commande en ligne est temporairement indisponible. Veuillez choisir un autre mode de commande.",
    es: "El pedido en línea no está disponible por el momento. Elija otro método de pedido.",
  },

  provider_error: {
    en: "We could not send your order to the kitchen. Please try again or call us.",
    fr: "Nous n'avons pas pu envoyer votre commande à la cuisine. Réessayez ou appelez-nous.",
    es: "No pudimos enviar tu pedido a la cocina. Inténtalo de nuevo o llámanos.",
  },
  timeout: {
    en: "The kitchen is taking longer than usual to answer. Please try again.",
    fr: "La cuisine met plus de temps que d'habitude à répondre. Veuillez réessayer.",
    es: "La cocina tarda más de lo normal en responder. Inténtalo de nuevo.",
  },
  payment_unavailable: {
    en: "Card payment is not switched on yet. You pay at the restaurant.",
    fr: "Le paiement par carte n'est pas encore activé. Vous payez au restaurant.",
    es: "El pago con tarjeta aún no está activo. Pagas en el restaurante.",
  },
  duplicate_submission: {
    en: "This order was already sent — we did not send it twice.",
    fr: "Cette commande a déjà été envoyée — nous ne l'avons pas envoyée deux fois.",
    es: "Este pedido ya fue enviado — no lo enviamos dos veces.",
  },
  order_not_found: {
    en: "We could not find that order.",
    fr: "Nous n'avons pas trouvé cette commande.",
    es: "No encontramos ese pedido.",
  },
  not_cancellable: {
    en: "This order is already with the kitchen and can no longer be cancelled online.",
    fr: "Cette commande est déjà en cuisine et ne peut plus être annulée en ligne.",
    es: "Este pedido ya está en la cocina y no se puede cancelar en línea.",
  },
};

export interface OrderError {
  code: OrderErrorCode;
  messageEn: string;
  messageFr: string;
  messageEs: string;
}

export function orderError(code: OrderErrorCode): OrderError {
  const m = MESSAGES[code];
  return { code, messageEn: m.en, messageFr: m.fr, messageEs: m.es };
}

export type OrderResult<T> = { ok: true; data: T } | { ok: false; error: OrderError };

export function orderFailure<T>(code: OrderErrorCode): OrderResult<T> {
  return { ok: false, error: orderError(code) };
}

/** Never leak a raw provider message: classify it, then speak human. */
export function classifyProviderFailure(raw: string): OrderErrorCode {
  const value = raw.toLowerCase();
  if (value.includes("timeout") || value.includes("etimedout")) return "timeout";
  if (value.includes("not_configured") || value.includes("not configured")) {
    return "provider_unavailable";
  }
  if (value.includes("unavailable") || value.includes("sold out") || value.includes("86")) {
    return "item_unavailable";
  }
  if (value.includes("closed")) return "location_closed";
  if (value.includes("menu") || value.includes("price")) return "menu_changed";
  return "provider_error";
}
