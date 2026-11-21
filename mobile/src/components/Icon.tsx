// Line icons drawn for the app (same family as the website's lucide icons: 2 px stroke, round caps).
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../lib/theme';

const P = {
  home: <Path d="M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9" />,
  menu: <Path d="M7 3v7a2 2 0 0 0 4 0V3M9 10v11M17 3c-1.7 0-3 2.2-3 5.5S15 13 17 13v8" />,
  store: <><Path d="M3 9.5 4.5 4h15L21 9.5M3 9.5c0 1.4 1.1 2.5 2.5 2.5S8 10.9 8 9.5c0 1.4 1.1 2.5 2.5 2.5S13 10.9 13 9.5c0 1.4 1.1 2.5 2.5 2.5S18 10.9 18 9.5c0 1.4 1.1 2.5 2.5 2.5" /><Path d="M5 12v8h14v-8M10 20v-5h4v5" /></>,
  receipt: <><Path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z" /><Path d="M9 8h6M9 12h6M9 16h3" /></>,
  more: <><Circle cx="5" cy="12" r="1.4" /><Circle cx="12" cy="12" r="1.4" /><Circle cx="19" cy="12" r="1.4" /></>,
  bag: <><Path d="M5 8h14l-1 12H6z" /><Path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  bike: <><Circle cx="6" cy="16" r="3.5" /><Circle cx="18" cy="16" r="3.5" /><Path d="M6 16 9.5 9h5l3.5 7M9.5 9 8 6H6M14.5 9 12 16" /></>,
  search: <><Circle cx="11" cy="11" r="6.5" /><Path d="m16 16 4.5 4.5" /></>,
  pin: <><Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><Circle cx="12" cy="10" r="2.3" /></>,
  plus: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  chevron: <Path d="m9 5 7 7-7 7" />,
  back: <Path d="m15 5-7 7 7 7" />,
  check: <Path d="m5 12.5 4.5 4.5L19 7" />,
  clock: <><Circle cx="12" cy="12" r="8.5" /><Path d="M12 7.5V12l3 2" /></>,
  phone: <Path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.5 1.5A16.5 16.5 0 0 1 3.5 5.5 1.5 1.5 0 0 1 5 4z" />,
  card: <><Rect x="3" y="5.5" width="18" height="13" rx="2" /><Path d="M3 10h18M7 15h3" /></>,
  bank: <Path d="M3 9.5 12 4l9 5.5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3.5 20h17" />,
  flame: <Path d="M12 21c-3.9 0-7-2.8-7-6.6 0-3.3 2.4-5.4 3.6-7.6.3 1.7 1.2 2.9 2.4 3.4C11 7.4 12.6 4.6 15.5 3c-.7 3 1 4.8 2.3 6.6 1 1.3 1.2 2.6 1.2 4.1 0 4-3.1 7.3-7 7.3z" />,
  tag: <><Path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5z" /><Circle cx="8" cy="8.5" r="1.4" /></>,
  globe: <><Circle cx="12" cy="12" r="8.5" /><Path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z" /></>,
  info: <><Circle cx="12" cy="12" r="8.5" /><Path d="M12 11v5.5M12 7.8v.2" /></>,
  shield: <Path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z" />,
  trash: <Path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />,
  refresh: <Path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4" />,
  external: <Path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  star: <Path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />,
  nav: <Path d="M3 11 21 3l-8 18-2-8z" />,
  edit: <Path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  wifiOff: <Path d="M3 3l18 18M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 4.2-2.4M19 12.9a10 10 0 0 0-3-2M2 9.3A15 15 0 0 1 7 6.4M22 9.3a15 15 0 0 0-9.5-3.8M12 20h.01" />,
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, color = colors.text, strokeWidth = 2 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const filled = name === 'more';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </Svg>
  );
}
