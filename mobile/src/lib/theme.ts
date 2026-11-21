// PPP / MontrealHub look, taken from the website (src/styles.css): near-black ground, flame red, gold labels,
// Anton for the big condensed titles, Barlow for the text.
import { Platform } from 'react-native';

export const colors = {
  bg: '#0a0a0a',
  bg2: '#110d0d',
  card: '#171212',
  card2: '#1e1818',
  secondary: '#241d1d',
  line: '#332c2c',
  lineStrong: '#4a4040',
  text: '#f8f8f8',
  muted: '#aba2a2',
  faint: '#7d7474',
  red: '#d90000',
  redDark: '#a80000',
  flame: '#f76400',
  gold: '#f6b900',
  green: '#2fb36b',
  greenBg: '#10281b',
  amber: '#f6b900',
  amberBg: '#2a2108',
  danger: '#ff5a4f',
  dangerBg: '#2c1010',
  white: '#ffffff',
  black: '#000000',
};

export const fonts = {
  display: 'Anton_400Regular',
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  heavy: 'Barlow_800ExtraBold',
};

export const radius = { sm: 4, md: 8, lg: 12, xl: 18, pill: 999 };
export const space = (n: number) => n * 4;

export const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  default: { elevation: 6 },
});

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 54, lineHeight: 58, color: colors.text, textTransform: 'uppercase' as const },
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.text, textTransform: 'uppercase' as const },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.text, textTransform: 'uppercase' as const },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22, color: colors.text, textTransform: 'uppercase' as const },
  price: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: colors.red },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.text },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.gold, letterSpacing: 3, textTransform: 'uppercase' as const },
  button: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.white, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  chip: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.text, letterSpacing: 1.6, textTransform: 'uppercase' as const },
};
