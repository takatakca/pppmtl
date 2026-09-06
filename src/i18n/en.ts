/** English is the canonical dictionary — every other language falls back to it. */
export const en = {
  common: {
    continue: "Continue",
    close: "Close",
    signIn: "Sign in",
    createAccount: "Create account",
    continueAsGuest: "Continue as guest",
    email: "Email",
    language: "Language",
  },
  navigation: {
    home: "Home",
    menu: "Menu",
    offers: "Offers",
    locations: "Locations",
    account: "Account",
    orderNow: "Order now",
    support: "Help",
    trackOrder: "Track order",
  },
  popup: {
    welcome: "Welcome to PPP",
    chooseLanguage: "Choose your language",
    yourPpp: "Your PPP.",
    yourOrders: "Your orders.",
    yourFavourites: "Your favourites.",
    description:
      "Create your PPP account to order faster, save the food you love and keep your PPP experience together.",
    emailAddress: "Email address",
    continue: "Continue",
    alreadyMember: "Already have an account?",
    signIn: "Sign in",
    guest: "Continue as guest",
    benefitFavourites: "Save your favourites",
    benefitOrders: "Keep your PPP orders together",
    benefitAddresses: "Save addresses",
    benefitMembership: "Access eligible member benefits",
  },
  auth: {
    invalidEmail: "Enter a valid email address.",
  },
};

export type Dictionary = typeof en;
