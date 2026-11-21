// One order placed from this phone: live status, receipt, pay / cancel / call / order again.
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Icon } from '../../components/Icon';
import { Badge, Button, Card, Empty, Notice, Row } from '../../components/ui';
import { useStore } from '../../lib/store';
import { api } from '../../lib/api';
import { call, openWeb } from '../../lib/actions';
import { ACTIVE_STATUSES, money, statusStep } from '../../lib/logic';
import { colors, space, type } from '../../lib/theme';
import type { StringKey } from '../../lib/i18n';

const STEPS: StringKey[] = ['stepPlaced', 'stepAccepted', 'stepPreparing', 'stepReady', 'stepDone'];

export default function OrderScreen() {
  const { id, paid, payment } = useLocalSearchParams<{ id: string; paid?: string; payment?: string }>();
  const { receipts, refreshReceipts, setReceiptOrder, t, lang, catalog, addLine, item } = useStore();
  const receipt = receipts.find((r) => r.id === id);
  const order = receipt?.order ?? null;
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await refreshReceipts([id]).catch(() => undefined);
    setRefreshing(false);
  }, [id, refreshReceipts]);

  // Fresh status on open and every 20 s while the order is moving.
  useFocusEffect(useCallback(() => {
    void refresh();
    const timer = setInterval(() => {
      if (!order || ACTIVE_STATUSES.includes(order.status)) void refreshReceipts([id]).catch(() => undefined);
    }, 20000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]));
  useEffect(() => { if (paid === '1') setTimeout(() => void refresh(), 2500); }, [paid, refresh]);

  if (!receipt) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><Empty icon="receipt" title={t('noOrders')} action={<Button title={t('tabOrders')} onPress={() => router.replace('/orders')} />} /></View>;
  }

  const step = order ? statusStep(order.status) : 0;
  const unpaid = order?.paymentStatus === 'UNPAID' && order.paymentMethod === 'CARD' && order.status !== 'CANCELLED' && order.status !== 'FAILED';
  const expired = Date.now() - new Date(receipt.placedAt).getTime() > 14 * 24 * 3600 * 1000;
  const phone = catalog?.phone;

  const pay = async () => {
    if (!order?.paymentUrl) return;
    await WebBrowser.openAuthSessionAsync(order.paymentUrl, 'montrealhub://').catch(() => openWeb(order.paymentUrl!));
    void refresh();
  };
  const cancel = () => {
    Alert.alert(t('cancelOrder'), t('cancelConfirm'), [
      { text: t('no'), style: 'cancel' },
      {
        text: t('yes'), style: 'destructive', onPress: async () => {
          setBusy(true);
          const result = await api.cancel(receipt.id, receipt.token, 'Cancelled in the MontrealHub app').catch(() => null);
          if (result?.order) setReceiptOrder(result.order);
          setBusy(false);
        },
      },
    ]);
  };
  const reorder = () => {
    for (const line of order?.items ?? []) if (item(line.productId)?.orderable) addLine(line.productId, line.quantity, line.selections, line.notes);
    router.push('/cart');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: 60 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.red} />}>
      {paid === '1' ? <Notice text={t('thanks')} tone="ok" /> : null}
      {payment && payment !== 'paid' && unpaid ? <Notice text={t('paymentBack')} tone="warn" /> : null}
      {expired ? <Notice text={t('receiptExpired')} /> : null}

      <View style={{ gap: 6 }}>
        <Text style={type.label}>{t('order')} {order?.orderNumber ?? ''}</Text>
        <Text style={type.display}>{order ? t(`status${order.status}` as StringKey) : '…'}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Badge label={order?.orderType === 'DELIVERY' ? t('delivery') : t('pickup')} tone="muted" />
          {order ? <Badge label={order.paymentStatus === 'PAID' ? t('paid') : order.paymentStatus === 'UNPAID' ? t('unpaid') : order.paymentStatus} tone={order.paymentStatus === 'PAID' ? 'green' : 'gold'} /> : null}
        </View>
      </View>

      {order && step >= 0 ? (
        <Card style={{ gap: 0 }}>
          {STEPS.map((key, i) => {
            const done = i < step || (i === step && order.paymentStatus === 'PAID') || order.status === 'COMPLETED';
            const current = i === step && !done;
            return (
              <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: done ? colors.green : current ? colors.gold : colors.lineStrong, backgroundColor: done ? colors.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {done ? <Icon name="check" size={15} color={colors.black} strokeWidth={3} /> : current ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }} /> : null}
                </View>
                <Text style={[type.chip, { color: done || current ? colors.text : colors.faint }]}>{t(key)}</Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      {unpaid && order?.paymentUrl ? <Button title={t('payNow')} icon="card" right={money(order.total, lang)} onPress={pay} /> : null}
      {order?.paymentMethod === 'INTERAC' && order.interac && order.paymentStatus !== 'PAID' ? (
        <View style={{ gap: space(3) }}>
          <Notice text={t('interacWaiting')} icon="bank" />
          {order.interac.payUrl ? <Button title={t('interacPay')} icon="bank" onPress={() => openWeb(order.interac!.payUrl!)} /> : null}
        </View>
      ) : null}

      {order ? (
        <Card style={{ gap: space(2) }}>
          {order.items.map((line, i) => (
            <View key={`${line.productId}-${i}`} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={[type.cardTitle, { color: colors.gold, width: 30 }]}>{line.quantity}×</Text>
              <View style={{ flex: 1 }}>
                <Text style={type.cardTitle}>{line.name}</Text>
                {line.options.map((o) => <Text key={o} style={type.small}>{o}</Text>)}
                {line.notes ? <Text style={[type.small, { fontStyle: 'italic' }]}>« {line.notes} »</Text> : null}
              </View>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 6 }} />
          <Row label={t('subtotal')} value={money(order.subtotal, lang)} />
          {order.deliveryFee ? <Row label={t('deliveryFee')} value={money(order.deliveryFee, lang)} /> : null}
          {order.tax !== null ? <Row label={t('taxes')} value={money(order.tax, lang)} /> : null}
          {order.tip ? <Row label={t('tip')} value={money(order.tip, lang)} /> : null}
          {order.total !== null ? <Row label={t('total')} value={money(order.total, lang)} strong /> : null}
          {order.deliveryAddress ? <Text style={[type.small, { marginTop: 6 }]}>{t('deliverTo')} : {order.deliveryAddress}</Text> : null}
          <Text style={[type.small, { marginTop: 2 }]}>{new Date(order.createdAt).toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA')}</Text>
        </Card>
      ) : null}

      <View style={{ gap: space(3) }}>
        {phone ? <Button title={t('callRestaurant')} icon="phone" variant="secondary" onPress={() => call(phone.e164)} /> : null}
        {order && order.items.length ? <Button title={t('reorder')} icon="refresh" variant="secondary" onPress={reorder} /> : null}
        {unpaid ? <Button title={t('cancelOrder')} icon="close" variant="ghost" loading={busy} onPress={cancel} /> : null}
      </View>
    </ScrollView>
  );
}
