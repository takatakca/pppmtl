import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Icon } from '../../components/Icon';
import { Badge, Button, Empty } from '../../components/ui';
import { useStore } from '../../lib/store';
import { money } from '../../lib/logic';
import { colors, space, type } from '../../lib/theme';
import type { StringKey } from '../../lib/i18n';

export default function Orders() {
  const { receipts, refreshReceipts, t, lang } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await refreshReceipts().catch(() => undefined);
    setRefreshing(false);
  }, [refreshReceipts]);
  useFocusEffect(useCallback(() => { void refreshReceipts().catch(() => undefined); }, [refreshReceipts]));

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(4), gap: space(3), flexGrow: 1 }}
      data={receipts}
      keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.red} />}
      ListEmptyComponent={<View style={{ flex: 1, justifyContent: 'center' }}><Empty icon="receipt" title={t('noOrders')} sub={t('noOrdersSub')} action={<Button title={t('browseMenu')} onPress={() => router.push('/menu')} style={{ alignSelf: 'stretch', marginTop: 8 }} />} /></View>}
      renderItem={({ item: r }) => {
        const o = r.order;
        const count = o?.items.reduce((n, l) => n + l.quantity, 0) ?? 0;
        const tone = !o ? 'muted' : o.status === 'CANCELLED' || o.status === 'FAILED' ? 'muted' : o.paymentStatus === 'UNPAID' ? 'gold' : 'green';
        return (
          <Pressable onPress={() => router.push({ pathname: '/order/[id]', params: { id: r.id } })} style={({ pressed }) => [{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: space(4), gap: 6 }, pressed && { backgroundColor: colors.card2 }]} accessibilityRole="button">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[type.label, { flex: 1 }]}>{t('order')} {o?.orderNumber ?? ''}</Text>
              <Badge label={o ? t(`status${o.status}` as StringKey) : '…'} tone={tone} />
            </View>
            <Text style={type.cardTitle} numberOfLines={1}>{o?.items.map((l) => `${l.quantity}× ${l.name}`).join(' · ')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name={o?.orderType === 'DELIVERY' ? 'bike' : 'bag'} size={16} color={colors.muted} />
              <Text style={type.small}>{new Date(r.placedAt).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {count} {count > 1 ? t('items') : t('item')}</Text>
              <Text style={[type.price, { fontSize: 17, marginLeft: 'auto' }]}>{money(o?.total ?? o?.subtotal ?? null, lang)}</Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
