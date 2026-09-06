import type { Dictionary } from "./en";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export const es: DeepPartial<Dictionary> = {
  common: {
    continue: "Continuar",
    close: "Cerrar",
    signIn: "Iniciar sesión",
    createAccount: "Crear cuenta",
    continueAsGuest: "Continuar como invitado",
    email: "Correo electrónico",
    language: "Idioma",
  },
  navigation: {
    home: "Inicio",
    menu: "Menú",
    offers: "Ofertas",
    locations: "Ubicaciones",
    account: "Cuenta",
    orderNow: "Pedir ahora",
    support: "Ayuda",
    trackOrder: "Seguir mi pedido",
  },
  popup: {
    welcome: "Bienvenido a PPP",
    chooseLanguage: "Elige tu idioma",
    yourPpp: "Tu PPP.",
    yourOrders: "Tus pedidos.",
    yourFavourites: "Tus favoritos.",
    description:
      "Crea tu cuenta PPP para pedir más rápido, guardar tus favoritos y mantener tu experiencia PPP en un solo lugar.",
    emailAddress: "Correo electrónico",
    continue: "Continuar",
    alreadyMember: "¿Ya tienes una cuenta?",
    signIn: "Iniciar sesión",
    guest: "Continuar como invitado",
    benefitFavourites: "Guarda tus favoritos",
    benefitOrders: "Mantén tus pedidos PPP en un solo lugar",
    benefitAddresses: "Guarda tus direcciones",
    benefitMembership: "Accede a beneficios para miembros cuando corresponda",
  },
  auth: {
    invalidEmail: "Ingresa un correo electrónico válido.",
  },
};
