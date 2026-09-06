import type { Dictionary } from "./en";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export const fr: DeepPartial<Dictionary> = {
  common: {
    continue: "Continuer",
    close: "Fermer",
    signIn: "Se connecter",
    createAccount: "Créer un compte",
    continueAsGuest: "Continuer comme invité",
    email: "Courriel",
    language: "Langue",
  },
  navigation: {
    home: "Accueil",
    menu: "Menu",
    offers: "Offres",
    locations: "Emplacements",
    account: "Compte",
    orderNow: "Commander",
    support: "Aide",
    trackOrder: "Suivre ma commande",
  },
  popup: {
    welcome: "Bienvenue chez PPP",
    chooseLanguage: "Choisissez votre langue",
    yourPpp: "Votre PPP.",
    yourOrders: "Vos commandes.",
    yourFavourites: "Vos favoris.",
    description:
      "Créez votre compte PPP pour commander plus rapidement, enregistrer vos favoris et retrouver votre expérience PPP au même endroit.",
    emailAddress: "Adresse courriel",
    continue: "Continuer",
    alreadyMember: "Vous avez déjà un compte?",
    signIn: "Se connecter",
    guest: "Continuer comme invité",
    benefitFavourites: "Enregistrez vos favoris",
    benefitOrders: "Retrouvez vos commandes PPP",
    benefitAddresses: "Enregistrez vos adresses",
    benefitMembership: "Profitez des avantages admissibles aux membres",
  },
  auth: {
    invalidEmail: "Entrez une adresse courriel valide.",
  },
};
