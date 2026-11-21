// Building blocks of the MontrealHub screens, in the website's style (square red buttons, gold kicker labels,
// Anton titles in capitals, dark cards with a thin border).
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Icon, type IconName } from './Icon';
import { colors, fonts, radius, space, type } from '../lib/theme';
import { dollars, money } from '../lib/logic';
import { useStore } from '../lib/store';
import type { Brand, Item } from '../lib/types';

export const tap = () => { Haptics.selectionAsync().catch(() => undefined); };

export function Button({ title, onPress, icon, variant = 'primary', disabled, loading, style, right }: {
  title: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'ghost' | 'gold'; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; right?: string;
}) {
  const bg = variant === 'primary' ? colors.red : variant === 'gold' ? colors.gold : variant === 'secondary' ? colors.card2 : 'transparent';
  const fg = variant === 'gold' ? colors.black : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      onPress={() => { tap(); onPress(); }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: bg, borderColor: variant === 'secondary' || variant === 'ghost' ? colors.line : bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text style={[type.button, { color: fg, flexShrink: 1 }]} numberOfLines={1}>{title}</Text>
      {right ? <Text style={[type.button, { color: fg, marginLeft: 'auto' }]}>{right}</Text> : null}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [s.chip, active && { backgroundColor: colors.red, borderColor: colors.red }, pressed && { opacity: 0.8 }]}
    >
      {icon ? <Icon name={icon} size={16} color={colors.white} /> : null}
      <Text style={type.chip}>{label}</Text>
    </Pressable>
  );
}

export function SectionHead({ kicker, title, action, onAction, icon }: { kicker?: string; title: string; action?: string; onAction?: () => void; icon?: IconName }) {
  return (
    <View style={s.sectionHead}>
      <View style={{ flex: 1 }}>
        {kicker ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            {icon ? <Icon name={icon} size={14} color={colors.gold} /> : null}
            <Text style={type.label}>{kicker}</Text>
          </View>
        ) : null}
        <Text style={type.display}>{title}</Text>
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={[type.label, { letterSpacing: 2.5 }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Badge({ label, tone = 'gold' }: { label: string; tone?: 'gold' | 'red' | 'green' | 'muted' }) {
  const bg = tone === 'gold' ? colors.gold : tone === 'red' ? colors.red : tone === 'green' ? colors.greenBg : colors.secondary;
  const fg = tone === 'gold' ? colors.black : tone === 'green' ? colors.green : colors.white;
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[type.chip, { color: fg, fontSize: 10, letterSpacing: 1.4 }]}>{label}</Text>
    </View>
  );
}

/** Rail card, like "Most ordered" on the website: photo, badge, name, price, red "+ Add". */
export function ItemCard({ item, onOpen, onAdd, width = 200 }: { item: Item; onOpen: () => void; onAdd: () => void; width?: number }) {
  const { tx, t, lang } = useStore();
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [s.card, { width }, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={tx(item.name)}>
      <View>
        <Image source={{ uri: item.thumb }} style={{ width: '100%', height: width * 0.68, backgroundColor: colors.card2 }} contentFit="cover" transition={150} />
        {item.badges.includes('popular') ? <View style={{ position: 'absolute', top: 0, left: 0 }}><Badge label={t('popular')} /></View> : null}
        {item.badges.includes('deal') ? <View style={{ position: 'absolute', top: 0, right: 0 }}><Badge label={t('deal')} tone="red" /></View> : null}
      </View>
      <View style={{ padding: space(3), gap: 6, flex: 1 }}>
        <Text style={type.cardTitle} numberOfLines={2}>{tx(item.name)}</Text>
        <Text style={type.price}>{money(dollars(item.price), lang)}</Text>
        <View style={{ flex: 1 }} />
        {item.orderable ? (
          <Pressable onPress={() => { tap(); onAdd(); }} style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={`${t('add')} ${tx(item.name)}`}>
            <Icon name="plus" size={16} color={colors.white} strokeWidth={2.6} />
            <Text style={[type.button, { fontSize: 15 }]}>{t('add')}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Menu row, like the website's order page: words left, photo right. */
export function ItemRow({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const { tx, t, lang } = useStore();
  const desc = tx(item.description);
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.card2 }]} accessibilityRole="button" accessibilityLabel={tx(item.name)}>
      <View style={{ flex: 1, padding: space(3.5), gap: 5 }}>
        {item.badges.includes('popular') ? <View style={s.outlineBadge}><Text style={[type.chip, { color: colors.gold, fontSize: 10 }]}>{t('popular')}</Text></View> : null}
        <Text style={type.cardTitle} numberOfLines={2}>{tx(item.name)}</Text>
        {desc ? <Text style={type.small} numberOfLines={2}>{desc}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={type.price}>{money(dollars(item.price), lang)}</Text>
          {item.compareAtPrice ? <Text style={[type.small, { textDecorationLine: 'line-through' }]}>{money(dollars(item.compareAtPrice), lang)}</Text> : null}
        </View>
      </View>
      <View>
        <Image source={{ uri: item.thumb }} style={s.rowImage} contentFit="cover" transition={150} />
        {item.orderable ? <View style={s.rowPlus}><Icon name="plus" size={16} color={colors.white} strokeWidth={2.6} /></View> : null}
      </View>
    </Pressable>
  );
}

/** A brand's square mark: PPP's own artwork, or the brand's text-logo SVG (same as its website). */
export function BrandMark({ brand, size = 56 }: { brand: Brand; size?: number }) {
  if (brand.logo) return <Image source={{ uri: brand.logo }} style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: colors.black }} contentFit="contain" />;
  if (brand.markSvg) return <View style={{ width: size, height: size, borderRadius: radius.md, overflow: 'hidden' }}><SvgXml xml={brand.markSvg} width={size} height={size} /></View>;
  return <View style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: brand.colors.primary }} />;
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[type.chip, { color: colors.muted, fontSize: 11 }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.faint}
        selectionColor={colors.red}
        {...props}
        style={[s.input, error ? { borderColor: colors.danger } : null, props.multiline ? { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 } : null, props.style]}
      />
      {error ? <Text style={[type.small, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

export function Notice({ text, tone = 'info', icon }: { text: string; tone?: 'info' | 'warn' | 'ok' | 'error'; icon?: IconName }) {
  const bg = tone === 'warn' ? colors.amberBg : tone === 'ok' ? colors.greenBg : tone === 'error' ? colors.dangerBg : colors.card2;
  const fg = tone === 'warn' ? colors.amber : tone === 'ok' ? colors.green : tone === 'error' ? colors.danger : colors.muted;
  return (
    <View style={[s.notice, { backgroundColor: bg, borderColor: fg + '55' }]}>
      <Icon name={icon ?? (tone === 'ok' ? 'check' : 'info')} size={18} color={fg} />
      <Text style={[type.small, { color: tone === 'info' ? colors.text : fg, flex: 1 }]}>{text}</Text>
    </View>
  );
}

export function Empty({ icon, title, sub, action }: { icon: IconName; title: string; sub?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', padding: space(10), gap: space(3) }}>
      <View style={s.emptyIcon}><Icon name={icon} size={30} color={colors.gold} /></View>
      <Text style={[type.title, { textAlign: 'center' }]}>{title}</Text>
      {sub ? <Text style={[type.small, { textAlign: 'center', maxWidth: 300 }]}>{sub}</Text> : null}
      {action}
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 50 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <View style={s.stepper}>
      <Pressable onPress={() => { tap(); onChange(Math.max(min, value - 1)); }} hitSlop={8} style={s.stepBtn} accessibilityRole="button" accessibilityLabel="-"><Icon name="minus" size={18} color={value <= min ? colors.faint : colors.white} /></Pressable>
      <Text style={[type.title, { minWidth: 28, textAlign: 'center' }]}>{value}</Text>
      <Pressable onPress={() => { tap(); onChange(Math.min(max, value + 1)); }} hitSlop={8} style={s.stepBtn} accessibilityRole="button" accessibilityLabel="+"><Icon name="plus" size={18} color={colors.white} /></Pressable>
    </View>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={strong ? [type.title, { fontSize: 20 }] : [type.body, { color: colors.muted }]}>{label}</Text>
      <Text style={strong ? [type.title, { fontSize: 20 }] : type.body}>{value}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.panel, style]}>{children}</View>;
}

export const s = StyleSheet.create({
  button: { minHeight: 54, paddingHorizontal: space(4), borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.bg },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: space(4), marginBottom: space(3), gap: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4 },
  outlineBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.gold, paddingHorizontal: 7, paddingVertical: 2 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, overflow: 'hidden' },
  addBtn: { height: 40, backgroundColor: colors.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.sm },
  row: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.line, minHeight: 128 },
  rowImage: { width: 128, height: '100%', minHeight: 128, backgroundColor: colors.card2 },
  rowPlus: { position: 'absolute', right: 8, bottom: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg, color: colors.text, paddingHorizontal: 14, fontFamily: fonts.medium, fontSize: 16, borderRadius: radius.sm },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: space(3), borderWidth: 1, borderRadius: radius.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.bg },
  stepBtn: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center' },
  panel: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: space(4), gap: space(3) },
});
