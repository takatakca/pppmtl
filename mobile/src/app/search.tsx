// Search the whole kitchen, accent-free ("poutine", "taouk", "pizza toute garnie").
import { useEffect, useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Icon } from '../components/Icon';
import { Empty, ItemRow } from '../components/ui';
import { CartBar } from '../components/CartBar';
import { useStore } from '../lib/store';
import { openItem } from '../lib/actions';
import { searchItems } from '../lib/logic';
import { colors, space, type } from '../lib/theme';

export default function Search() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { catalog, t } = useStore();
  const [query, setQuery] = useState(params.q ?? '');
  useEffect(() => { if (params.q) setQuery(params.q); }, [params.q]);
  const results = useMemo(() => searchItems(catalog?.items ?? [], query), [catalog, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: space(4), borderBottomWidth: 1, borderColor: colors.line }}>
        <View style={{ height: 50, borderWidth: 1, borderColor: colors.lineStrong, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: colors.card }}>
          <Icon name="search" size={19} color={colors.muted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={colors.faint}
            style={[type.body, { flex: 1, color: colors.text, paddingVertical: 0 }]}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel={t('search')}
          />
        </View>
      </View>
      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space(4), gap: 0, paddingBottom: 110 }}
        renderItem={({ item }) => <ItemRow item={item} onOpen={() => openItem(item)} />}
        ListEmptyComponent={query.trim().length > 1 ? <Empty icon="search" title={t('noResults')} /> : null}
      />
      <CartBar />
    </View>
  );
}
