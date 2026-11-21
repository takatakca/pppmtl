import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { BrandMark, Button, Chip, Empty, ItemCard, Notice, SectionHead, tap } from '../../components/ui';
import { CartBar } from '../../components/CartBar';
import { useStore } from '../../lib/store';
import { openItem, quickAdd, call } from '../../lib/actions';
import { dollars, formatTime, isOpenAt, money, montrealMinutes } from '../../lib/logic';
import { colors, radius, space, type } from '../../lib/theme';

const QUICK = [
  { fr: 'Poutine', en: 'Poutine', q: 'poutine' },
  { fr: 'Poulet', en: 'Chicken', q: 'poulet' },
  { fr: 'Pizza', en: 'Pizza', q: 'pizza' },
  { fr: 'Shawarma', en: 'Shawarma', q: 'shawarma' },
  { fr: 'Burger', en: 'Burger', q: 'burger' },
  { fr: 'Combos', en: 'Combos', q: 'combo' },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { catalog, catalogState, t, tx, lang, mode, setMode, item, addLine, offline, reloadCatalog } = store;

  const popular = useMemo(() => (catalog?.popularItemIds ?? []).map((id) => item(id)).filter((i) => i !== undefined), [catalog, item]);
  const location = catalog?.locations[0];
  const kitchen = catalog?.kitchens.find((k) => k.id === 'ndg');
  const open = isOpenAt(kitchen?.hours ?? null, montrealMinutes());

  if (!catalog) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, justifyContent: 'center' }}>
        {catalogState === 'error' ? (
          <Empty icon="wifiOff" title={t('loadError')} action={<Button title={t('retry')} icon="refresh" onPress={reloadCatalog} style={{ alignSelf: 'stretch', marginTop: 8 }} />} />
        ) : (
          <View style={{ alignItems: 'center', gap: 16 }}>
            <ActivityIndicator color={colors.red} size="large" />
            <Text style={type.small}>{t('loading')}</Text>
          </View>
        )}
      </View>
    );
  }

  const ppp = catalog.brands.find((b) => b.id === 'ppp');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reloadCatalog} tintColor={colors.red} />}
      >
        <LinearGradient colors={['#2a0606', '#140707', colors.bg]} style={{ paddingTop: insets.top + space(2) }}>
          {/* Top bar, like the website header: logo, kitchen, search. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space(4) }}>
            {ppp ? <BrandMark brand={ppp} size={48} /> : null}
            <Pressable onPress={() => router.push('/more')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, height: 48, paddingHorizontal: 12, backgroundColor: '#00000066' }} accessibilityRole="button">
              <Icon name="pin" size={18} color={colors.red} />
              <Text style={[type.chip, { fontSize: 13 }]} numberOfLines={1}>Notre-Dame-de-Grâce</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/search')} style={{ width: 48, height: 48, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000066' }} accessibilityRole="button" accessibilityLabel={t('search')}>
              <Icon name="search" size={21} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: space(4), paddingTop: space(8), paddingBottom: space(4) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={type.label}>Notre-Dame-de-Grâce · 6280 Somerled</Text>
              {location?.rating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="star" size={13} color={colors.gold} />
                  <Text style={[type.label, { letterSpacing: 1.5 }]}>{location.rating.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[type.hero, { marginTop: 8 }]}>{t('craving')}</Text>
            <Text style={[type.hero, { color: colors.red, marginTop: -6 }]}>PPP?</Text>
            <Text style={[type.body, { color: colors.muted, marginTop: 6 }]}>{t('heroSub')}</Text>
          </View>

          {/* Order panel: pickup / delivery, search, quick picks, start. */}
          <View style={{ marginHorizontal: space(4), borderWidth: 1, borderColor: colors.line, padding: space(3), gap: space(3), backgroundColor: '#0a0a0acc' }}>
            <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.line }}>
              {(['pickup', 'delivery'] as const).map((m) => (
                <Pressable key={m} onPress={() => { tap(); setMode(m); }} style={{ flex: 1, height: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === m ? colors.red : 'transparent' }} accessibilityRole="button" accessibilityState={{ selected: mode === m }}>
                  <Icon name={m === 'pickup' ? 'bag' : 'bike'} size={18} color={mode === m ? colors.white : colors.muted} />
                  <Text style={[type.chip, { color: mode === m ? colors.white : colors.muted }]}>{t(m)}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => router.push('/search')} style={{ height: 56, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }} accessibilityRole="search">
              <Icon name="search" size={20} color={colors.muted} />
              <Text style={[type.body, { color: colors.faint }]}>{t('searchPlaceholder')}</Text>
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {QUICK.map((q) => <Chip key={q.q} label={lang === 'fr' ? q.fr : q.en} onPress={() => router.push({ pathname: '/search', params: { q: q.q } })} />)}
            </ScrollView>
            <Button title={mode === 'pickup' ? t('startPickup') : t('startDelivery')} onPress={() => router.push('/menu')} />
          </View>
        </LinearGradient>

        {offline ? <View style={{ padding: space(4) }}><Notice text={t('offline')} tone="warn" icon="wifiOff" /></View> : null}

        {/* Kitchen status strip. */}
        {kitchen ? (
          <Pressable onPress={() => router.push('/more')} style={{ marginHorizontal: space(4), marginTop: space(5), flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: open === null ? colors.faint : open ? colors.green : colors.danger }} />
            <Text style={[type.chip, { color: open ? colors.green : colors.muted }]}>
              {open === null ? t('hoursUnknown') : open ? t('openNow') : t('closedNow')}
            </Text>
            {kitchen.hours ? <Text style={type.small}>· {formatTime(kitchen.hours.opens, lang)} – {formatTime(kitchen.hours.closes, lang)}</Text> : null}
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => call(catalog.phone.e164)} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityRole="button">
              <Icon name="phone" size={16} color={colors.gold} />
              <Text style={[type.label, { letterSpacing: 1.2 }]}>{catalog.phone.display}</Text>
            </Pressable>
          </Pressable>
        ) : null}

        {popular.length ? (
          <View style={{ marginTop: space(8) }}>
            <SectionHead kicker={t('mostOrderedKicker')} icon="flame" title={t('mostOrdered')} action={t('seeAll')} onAction={() => router.push('/menu')} />
            <FlatList
              horizontal
              data={popular}
              keyExtractor={(i) => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: space(4), gap: space(3) }}
              renderItem={({ item: dish }) => <ItemCard item={dish} onOpen={() => openItem(dish)} onAdd={() => quickAdd(dish, addLine)} />}
            />
          </View>
        ) : null}

        {catalog.offers.length ? (
          <View style={{ marginTop: space(8) }}>
            <SectionHead kicker={t('offersKicker')} icon="tag" title={t('offers')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space(4), gap: space(3) }}>
              {catalog.offers.map((o) => {
                const target = catalog.items.find((i) => o.image && i.image === o.image) ?? catalog.items.find((i) => i.name.fr === o.title.fr);
                return (
                  <Pressable key={o.id} onPress={() => target && openItem(target)} style={{ width: 280, height: 170, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
                    <Image source={{ uri: o.image }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} contentFit="cover" />
                    <LinearGradient colors={['transparent', '#000000ee']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 40 }} />
                    <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, gap: 4 }}>
                      <Text style={type.cardTitle} numberOfLines={2}>{tx(o.title)}</Text>
                      <Text style={[type.price, { color: colors.gold }]}>{money(dollars(o.price), lang)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ marginTop: space(8) }}>
          <SectionHead kicker={t('browseKitchen')} title={t('everyCategory')} action={t('tabMenu')} onAction={() => router.push('/menu')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space(4), gap: space(3) }}>
            {catalog.categories.map((c) => (
              <Pressable key={c.id} onPress={() => router.push({ pathname: '/menu', params: { category: c.id } })} style={({ pressed }) => [{ width: '48%', flexGrow: 1, height: 110, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', borderRadius: radius.sm }, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                <Image source={{ uri: c.image }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" />
                <LinearGradient colors={['#00000022', '#000000dd']} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                <View style={{ position: 'absolute', left: 10, right: 10, bottom: 8 }}>
                  <Text style={type.cardTitle} numberOfLines={2}>{tx(c.name)}</Text>
                  <Text style={[type.label, { letterSpacing: 1.5, fontSize: 10 }]}>{c.count} {c.count > 1 ? t('items') : t('item')}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ marginTop: space(8) }}>
          <SectionHead kicker={t('restaurantsKicker')} title={t('ourRestaurants')} action={t('seeAll')} onAction={() => router.push('/restaurants')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space(4), gap: space(3) }}>
            {catalog.brands.filter((b) => b.id !== 'ppp').map((b) => (
              <Pressable key={b.id} onPress={() => router.push({ pathname: '/brand/[id]', params: { id: b.id } })} style={{ width: 110, alignItems: 'center', gap: 8 }} accessibilityRole="button" accessibilityLabel={b.name}>
                <BrandMark brand={b} size={84} />
                <Text style={[type.chip, { fontSize: 11, textAlign: 'center' }]} numberOfLines={2}>{b.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
      <CartBar />
    </View>
  );
}
