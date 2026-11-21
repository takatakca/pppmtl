import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Button, Empty, Row, Stepper, tap } from '../components/ui';
import { useStore } from '../lib/store';
import { money, selectionSummary, unitCents } from '../lib/logic';
import { colors, space, type } from '../lib/theme';

export default function Cart() {
  const insets = useSafeAreaInsets();
  const { cart, item, tx, t, lang, updateLine, removeLine, cartSubtotal } = useStore();

  if (!cart.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <Empty icon="bag" title={t('emptyCart')} sub={t('emptyCartSub')} action={<Button title={t('browseMenu')} onPress={() => { router.back(); router.push('/menu'); }} style={{ alignSelf: 'stretch', marginTop: 8 }} />} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(3), paddingBottom: 160 }}>
        {cart.map((line) => {
          const dish = item(line.itemId);
          if (!dish) return null;
          const unit = unitCents(dish, line.selections);
          const options = selectionSummary(dish.modifierGroups, line.selections, lang === 'fr');
          return (
            <View key={line.lineId} style={{ flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: space(3) }}>
              <Image source={{ uri: dish.thumb }} style={{ width: 72, height: 72, backgroundColor: colors.card2 }} contentFit="cover" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={type.cardTitle} numberOfLines={2}>{tx(dish.name)}</Text>
                {options.map((o) => <Text key={o} style={type.small} numberOfLines={2}>{o}</Text>)}
                {line.notes ? <Text style={[type.small, { fontStyle: 'italic' }]} numberOfLines={2}>« {line.notes} »</Text> : null}
                <Text style={[type.price, { fontSize: 18 }]}>{money(unit === null ? null : unit * line.quantity, lang)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
                  <Stepper value={line.quantity} onChange={(q) => updateLine(line.lineId, { quantity: q })} />
                  <Pressable onPress={() => router.push({ pathname: '/item/[id]', params: { id: dish.id, line: line.lineId } })} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('edit')}>
                    <Icon name="edit" size={20} color={colors.muted} />
                  </Pressable>
                  <Pressable onPress={() => { tap(); removeLine(line.lineId); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('remove')}>
                    <Icon name="trash" size={20} color={colors.muted} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
        <View style={{ marginTop: space(2) }}>
          <Row label={t('subtotal')} value={money(cartSubtotal, lang)} />
          <Text style={[type.small, { marginTop: 4 }]}>{t('taxesNote')}</Text>
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space(4), paddingBottom: Math.max(insets.bottom, space(4)), backgroundColor: colors.bg, borderTopWidth: 1, borderColor: colors.line }}>
        <Button title={t('checkout')} right={money(cartSubtotal, lang)} onPress={() => { router.back(); router.push('/checkout'); }} />
      </View>
    </View>
  );
}
