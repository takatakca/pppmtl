// One of the 17 restaurant names: hero in its own colours, its menu rails (same NDG cart), phone-only extras,
// and its delivery-app links.
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../../components/Icon';
import { BrandMark, Button, Card, Empty, ItemRow } from '../../components/ui';
import { CartBar } from '../../components/CartBar';
import { useStore } from '../../lib/store';
import { call, openItem, openWeb } from '../../lib/actions';
import { dollars, money } from '../../lib/logic';
import { colors, space, type } from '../../lib/theme';

export default function BrandScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { brand: find, item, tx, t, lang } = useStore();
  const brand = find(id);

  if (!brand) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><Empty icon="store" title={t('noResults')} action={<Button title={t('close')} variant="secondary" onPress={() => router.back()} />} /></View>;
  }
  const hook = lang === 'fr' ? brand.hook.fr : brand.hook.en;
  const links = brand.kitchens.flatMap((k) => k.links);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: brand.name.toUpperCase(), headerStyle: { backgroundColor: brand.colors.primary }, headerShadowVisible: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={[brand.colors.primary, colors.bg]} style={{ padding: space(4), paddingTop: space(3), paddingBottom: space(7), gap: space(3) }}>
          <BrandMark brand={brand} size={84} />
          <Text style={[type.label, { color: brand.colors.accent }]}>{(lang === 'fr' ? brand.cuisine.fr : brand.cuisine.en).join(' · ')}</Text>
          <Text style={[type.display, { fontSize: 38, lineHeight: 42 }]}>{hook[0]}{'\n'}<Text style={{ color: brand.colors.accent }}>{hook[1]}</Text></Text>
          {tx(brand.description) ? <Text style={[type.body, { color: colors.text, opacity: 0.85 }]}>{tx(brand.description)}</Text> : null}
        </LinearGradient>

        {brand.rails.map((rail, ri) => {
          const dishes = rail.itemIds.map((i) => item(i)).filter((d): d is NonNullable<typeof d> => !!d);
          if (!dishes.length && !rail.extras.length) return null;
          return (
            <View key={ri} style={{ paddingHorizontal: space(4), marginTop: space(5), gap: 0 }}>
              <Text style={[type.display, { fontSize: 24, marginBottom: space(3) }]}>{tx(rail.title)}</Text>
              {dishes.map((d) => <ItemRow key={d.id} item={d} onOpen={() => openItem(d)} />)}
              {rail.extras.length ? (
                <Card style={{ gap: space(2), marginTop: dishes.length ? space(3) : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="phone" size={16} color={colors.gold} />
                    <Text style={type.label}>{t('phoneOnly')}</Text>
                  </View>
                  {rail.extras.map((x) => (
                    <View key={x.id} style={{ gap: 2 }}>
                      <Text style={type.cardTitle}>{tx(x.name)}</Text>
                      <Text style={type.small}>{x.sizes.map((sz) => `${tx(sz.label)} ${money(dollars(sz.price), lang)}`).join(' · ')}</Text>
                    </View>
                  ))}
                  <Button title={t('callToOrder')} icon="phone" variant="secondary" onPress={() => call(brand.phone.e164)} />
                </Card>
              ) : null}
            </View>
          );
        })}

        {links.length ? (
          <View style={{ paddingHorizontal: space(4), marginTop: space(6), gap: space(2) }}>
            <Text style={type.label}>{t('orderOnApps')}</Text>
            {links.map((l, i) => (
              <Pressable key={`${l.platform}-${i}`} onPress={() => openWeb(tx(l.url))} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: space(3), borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }, pressed && { backgroundColor: colors.card2 }]} accessibilityRole="link" accessibilityLabel={l.name}>
                <Icon name="bike" size={18} color={brand.colors.accent} />
                <Text style={[type.body, { flex: 1 }]}>{l.name}</Text>
                <Icon name="external" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <CartBar />
    </View>
  );
}
