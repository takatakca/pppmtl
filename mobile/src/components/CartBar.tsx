// The red "View order · n   $total" bar of the website's order page, floating above the tabs.
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../lib/store';
import { money } from '../lib/logic';
import { colors, radius, shadow, space, type } from '../lib/theme';
import { Icon } from './Icon';
import { tap } from './ui';

export function CartBar({ bottom = 12 }: { bottom?: number }) {
  const { cartCount, cartSubtotal, t, lang } = useStore();
  if (!cartCount) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: space(4), right: space(4), bottom }}>
      <Pressable
        onPress={() => { tap(); router.push('/cart'); }}
        accessibilityRole="button"
        accessibilityLabel={`${t('viewOrder')} ${cartCount}`}
        style={({ pressed }) => [{ backgroundColor: colors.red, minHeight: 58, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(4), gap: 10, opacity: pressed ? 0.9 : 1 }, shadow]}
      >
        <Icon name="bag" size={20} color={colors.white} />
        <Text style={type.button}>{t('viewOrder')} · {cartCount}</Text>
        <Text style={[type.button, { marginLeft: 'auto' }]}>{money(cartSubtotal, lang)}</Text>
      </Pressable>
    </View>
  );
}
