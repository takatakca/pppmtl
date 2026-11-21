import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '../../components/Icon';
import { BrandMark } from '../../components/ui';
import { useStore } from '../../lib/store';
import { colors, space, type } from '../../lib/theme';

export default function Restaurants() {
  const { catalog, t, tx, lang } = useStore();
  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(4), gap: space(3) }}
      data={catalog?.brands ?? []}
      keyExtractor={(b) => b.id}
      ListHeaderComponent={
        <View style={{ marginBottom: space(2), gap: 6 }}>
          <Text style={type.label}>{t('restaurantsKicker')}</Text>
          <Text style={[type.body, { color: colors.muted }]}>{t('restaurantsSub')}</Text>
        </View>
      }
      renderItem={({ item: b }) => {
        const count = b.rails.reduce((n, r) => n + r.itemIds.length, 0);
        return (
          <Pressable
            onPress={() => (b.id === 'ppp' ? router.push('/menu') : router.push({ pathname: '/brand/[id]', params: { id: b.id } }))}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: space(3) }, pressed && { backgroundColor: colors.card2 }]}
            accessibilityRole="button"
            accessibilityLabel={b.name}
          >
            <BrandMark brand={b} size={64} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.cardTitle}>{b.name}</Text>
              <Text style={type.small} numberOfLines={1}>{(lang === 'fr' ? b.cuisine.fr : b.cuisine.en).join(' · ')}</Text>
              <Text style={[type.small, { color: b.id === 'ppp' ? colors.gold : b.colors.accent }]} numberOfLines={1}>{b.id === 'ppp' ? tx(b.description) : `${count} ${t('items')}`}</Text>
            </View>
            <Icon name="chevron" size={20} color={colors.muted} />
          </Pressable>
        );
      }}
    />
  );
}
