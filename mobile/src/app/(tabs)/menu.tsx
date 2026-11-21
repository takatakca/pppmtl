import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, SectionList, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { Chip, Empty, ItemRow, tap } from '../../components/ui';
import { CartBar } from '../../components/CartBar';
import { useStore } from '../../lib/store';
import { openItem } from '../../lib/actions';
import { colors, space, type } from '../../lib/theme';
import type { Item } from '../../lib/types';

export default function Menu() {
  const insets = useSafeAreaInsets();
  const { catalog, t, tx, mode, setMode } = useStore();
  const params = useLocalSearchParams<{ category?: string }>();
  const list = useRef<SectionList<Item>>(null);
  const chips = useRef<ScrollView>(null);
  const [active, setActive] = useState<string | null>(null);

  const sections = useMemo(
    () => (catalog?.categories ?? []).map((c) => ({ key: c.id, title: tx(c.name), count: c.count, data: catalog!.items.filter((i) => i.categoryId === c.id) })).filter((s) => s.data.length),
    [catalog, tx],
  );

  const jump = (categoryId: string) => {
    const index = sections.findIndex((s) => s.key === categoryId);
    if (index < 0) return;
    setActive(categoryId);
    list.current?.scrollToLocation({ sectionIndex: index, itemIndex: 0, viewOffset: 0, animated: true });
  };

  useEffect(() => {
    if (params.category && sections.length) setTimeout(() => jump(params.category!), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.category, sections.length]);

  if (!catalog) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: space(4), paddingTop: space(2), paddingBottom: space(3), gap: space(3), borderBottomWidth: 1, borderColor: colors.line }}>
        <Text style={type.display}>{t('tabMenu')} <Text style={{ color: colors.flame }}>NDG</Text></Text>
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.line }}>
          {(['pickup', 'delivery'] as const).map((m) => (
            <Pressable key={m} onPress={() => { tap(); setMode(m); }} style={{ flex: 1, height: 44, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === m ? colors.red : 'transparent' }} accessibilityRole="button" accessibilityState={{ selected: mode === m }}>
              <Icon name={m === 'pickup' ? 'bag' : 'bike'} size={17} color={mode === m ? colors.white : colors.muted} />
              <Text style={[type.chip, { color: mode === m ? colors.white : colors.muted }]}>{t(m)}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => router.push('/search')} style={{ height: 48, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }} accessibilityRole="search">
          <Icon name="search" size={19} color={colors.muted} />
          <Text style={[type.body, { color: colors.faint }]}>{t('searchPlaceholder')}</Text>
        </Pressable>
        <ScrollView ref={chips} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {sections.map((s) => <Chip key={s.key} label={s.title} active={active === s.key} onPress={() => jump(s.key)} />)}
        </ScrollView>
      </View>
      <SectionList
        ref={list}
        sections={sections}
        keyExtractor={(i) => i.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        onScrollToIndexFailed={() => undefined}
        onViewableItemsChanged={({ viewableItems }) => {
          const first = viewableItems.find((v) => v.section)?.section as { key?: string } | undefined;
          if (first?.key && first.key !== active) setActive(first.key);
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
        renderSectionHeader={({ section }) => (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: space(4), paddingTop: space(7), paddingBottom: space(3), backgroundColor: colors.bg }}>
            <Text style={[type.display, { flex: 1 }]}>{section.title}</Text>
            <Text style={[type.chip, { color: colors.muted }]}>{section.count} {section.count > 1 ? t('items') : t('item')}</Text>
          </View>
        )}
        renderItem={({ item }) => <View style={{ paddingHorizontal: space(4) }}><ItemRow item={item} onOpen={() => openItem(item)} /></View>}
        ListEmptyComponent={<Empty icon="menu" title={t('noResults')} />}
      />
      <CartBar />
    </View>
  );
}
