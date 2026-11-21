// Checkout, same rules as pppmtl.com/checkout: pickup or delivery (NDG postal areas), contact, tip, card on
// Clover's page or Interac. The server checks and prices everything again before any payment.
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Button, Card, Field, Notice, Row, tap } from '../components/ui';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { call, openWeb } from '../lib/actions';
import { checkoutTotals, deliveryAddressLine, deliversTo, money, postalCodeOf, tipFromPercent, validEmail, validPhone } from '../lib/logic';
import { colors, space, type } from '../lib/theme';
import type { PlaceOrderInput } from '../lib/types';

type Tip = { kind: 'percent'; percent: number } | { kind: 'none' };

export default function Checkout() {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { catalog, cart, cartSubtotal, t, lang, mode, setMode, details, saveDetails, addReceipt, clearCart } = store;
  const [tip, setTip] = useState<Tip>({ kind: 'percent', percent: catalog?.checkout.defaultTipPercent ?? 15 });
  const [payWith, setPayWith] = useState<'card' | 'interac'>('card');
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const location = catalog?.locations[0];
  const rules = catalog?.checkout;
  const deliveryOk = Boolean(location?.delivery);
  const delivery = mode === 'delivery' && deliveryOk;
  const postal = postalCodeOf(details.postalCode);
  const inArea = deliversTo(postal, rules?.deliveryAreas ?? []);
  const tipCents = tip.kind === 'percent' ? Math.min(rules?.maxTipCents ?? 20000, tipFromPercent(cartSubtotal, tip.percent)) : 0;
  const totals = checkoutTotals({ subtotal: cartSubtotal, deliveryFee: delivery ? (rules?.deliveryFeeCents ?? 0) : 0, tip: tipCents, taxRates: rules?.taxRates });

  const errors = useMemo(() => ({
    name: details.name.trim().length < 2 ? t('errName') : null,
    phone: !validPhone(details.phone) ? t('errPhone') : null,
    email: (payWith === 'interac' || details.email.trim()) && !validEmail(details.email) ? t('errEmail') : null,
    address: delivery && (!details.street.trim() || !postal) ? t('errAddress') : delivery && !inArea ? t('outsideArea') : null,
  }), [details, payWith, delivery, postal, inArea, t]);
  const invalid = Object.values(errors).some(Boolean);

  if (!catalog || !rules || !location) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const place = async () => {
    setTried(true);
    setServerError(null);
    if (invalid || !cart.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      return;
    }
    const input: PlaceOrderInput = {
      locationId: location.id,
      orderType: delivery ? 'DELIVERY' : 'PICKUP',
      lines: cart.map((l) => ({ itemId: l.itemId, quantity: l.quantity, notes: l.notes, selections: l.selections })),
      customer: { customerId: null, takatakCustomerId: null, name: details.name.trim(), phone: details.phone.trim(), email: details.email.trim() || null, isGuest: true },
      deliveryAddress: delivery ? deliveryAddressLine({ street: details.street, unit: details.unit, city: details.city, postalCode: details.postalCode, instructions: details.instructions }) : null,
      notes: notes.trim().slice(0, 480),
      tip: tipCents,
      paymentMethod: payWith,
    };
    setBusy(true);
    try {
      const result = await api.place(input);
      if (!result.ok || !result.order || !result.token) {
        setServerError(result.error ? (lang === 'fr' ? result.error.messageFr : result.error.messageEn) : t('loadError'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        return;
      }
      const order = result.order;
      addReceipt({ id: order.id, token: result.token, placedAt: new Date().toISOString(), order });
      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.replace({ pathname: '/order/[id]', params: { id: order.id } });
      if (order.paymentUrl) {
        // Clover's secure page; it returns to the app (montrealhub://order/<id>) when done.
        await WebBrowser.openAuthSessionAsync(order.paymentUrl, 'montrealhub://').catch(() => openWeb(order.paymentUrl!));
      }
    } catch (e) {
      setServerError(e instanceof ApiError && e.status === 0 ? t('loadError') : lang === 'fr' ? 'La commande n’a pas pu être envoyée. Réessayez.' : 'The order could not be sent. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const show = (key: keyof typeof errors) => (tried ? errors[key] : null);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(5), paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
        {!rules.onlineOrdering ? (
          <View style={{ gap: space(3) }}>
            <Notice text={t('onlineOff')} tone="warn" />
            <Button title={`${t('call')} ${catalog.phone.display}`} icon="phone" onPress={() => call(catalog.phone.e164)} />
            {location.marketplaces.map((m) => <Button key={m.id} title={m.name} icon="external" variant="secondary" onPress={() => openWeb(m.url)} />)}
          </View>
        ) : null}

        <View style={{ gap: space(3) }}>
          <Text style={type.title}>{t('howTo')}</Text>
          <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.line }}>
            {(['pickup', 'delivery'] as const).map((m) => {
              const disabled = m === 'delivery' && !deliveryOk;
              const on = (m === 'delivery') === delivery;
              return (
                <Pressable key={m} disabled={disabled} onPress={() => { tap(); setMode(m); }} style={{ flex: 1, height: 50, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.red : 'transparent', opacity: disabled ? 0.4 : 1 }} accessibilityRole="button" accessibilityState={{ selected: on, disabled }}>
                  <Icon name={m === 'pickup' ? 'bag' : 'bike'} size={18} color={on ? colors.white : colors.muted} />
                  <Text style={[type.chip, { color: on ? colors.white : colors.muted }]}>{t(m)}</Text>
                </Pressable>
              );
            })}
          </View>
          {!delivery ? (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name="pin" color={colors.red} />
              <View style={{ flex: 1 }}>
                <Text style={type.label}>{t('pickupAt')}</Text>
                <Text style={type.cardTitle}>{location.name}</Text>
                <Text style={type.small}>{location.address}</Text>
              </View>
            </Card>
          ) : (
            <View style={{ gap: space(3) }}>
              <Field label={t('street')} value={details.street} onChangeText={(v) => saveDetails({ street: v })} autoComplete="street-address" textContentType="streetAddressLine1" error={show('address') && !details.street.trim() ? t('errAddress') : null} />
              <View style={{ flexDirection: 'row', gap: space(3) }}>
                <View style={{ flex: 1 }}><Field label={t('unit')} value={details.unit} onChangeText={(v) => saveDetails({ unit: v })} /></View>
                <View style={{ flex: 1 }}><Field label={t('postalCode')} value={details.postalCode} onChangeText={(v) => saveDetails({ postalCode: v.toUpperCase() })} autoCapitalize="characters" autoComplete="postal-code" textContentType="postalCode" maxLength={7} /></View>
              </View>
              <Field label={t('city')} value={details.city} onChangeText={(v) => saveDetails({ city: v })} textContentType="addressCity" />
              <Field label={t('deliveryNote')} value={details.instructions} onChangeText={(v) => saveDetails({ instructions: v.slice(0, 120) })} />
              {postal ? <Notice text={inArea ? t('insideArea') : t('outsideArea')} tone={inArea ? 'ok' : 'warn'} /> : null}
              {postal && !inArea && location.marketplaces.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {location.marketplaces.map((m) => <Button key={m.id} title={m.name} variant="secondary" icon="external" onPress={() => openWeb(m.url)} style={{ minHeight: 44 }} />)}
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={{ gap: space(3) }}>
          <Text style={type.title}>{t('yourDetails')}</Text>
          <Field label={t('name')} value={details.name} onChangeText={(v) => saveDetails({ name: v.slice(0, 120) })} autoComplete="name" textContentType="name" error={show('name')} />
          <Field label={t('phone')} value={details.phone} onChangeText={(v) => saveDetails({ phone: v.slice(0, 20) })} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" error={show('phone')} />
          <Field label={payWith === 'interac' ? t('emailRequired') : t('emailOptional')} value={details.email} onChangeText={(v) => saveDetails({ email: v.trim().slice(0, 254) })} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" error={show('email')} />
          <Field label={t('orderNotes')} value={notes} onChangeText={(v) => setNotes(v.slice(0, 480))} multiline />
        </View>

        <View style={{ gap: space(3) }}>
          <Text style={type.title}>{t('tip')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[...rules.tipPercents.map((p) => ({ kind: 'percent' as const, percent: p })), { kind: 'none' as const }].map((choice) => {
              const on = choice.kind === tip.kind && (choice.kind === 'none' || (tip.kind === 'percent' && tip.percent === choice.percent));
              return (
                <Pressable key={choice.kind === 'none' ? 'none' : choice.percent} onPress={() => { tap(); setTip(choice); }} style={{ flex: 1, height: 58, borderWidth: 1, borderColor: on ? colors.red : colors.line, backgroundColor: on ? colors.red : colors.card, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[type.cardTitle, { fontSize: 16 }]}>{choice.kind === 'none' ? t('noTip') : `${choice.percent} %`}</Text>
                  {choice.kind === 'percent' ? <Text style={[type.small, { fontSize: 11, color: on ? colors.white : colors.muted }]}>{money(tipFromPercent(cartSubtotal, choice.percent), lang)}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: space(3) }}>
          <Text style={type.title}>{t('payWith')}</Text>
          {([['card', 'card', t('card'), t('cardSub')], ...(rules.interac ? [['interac', 'bank', t('interac'), t('interacSub')]] : [])] as Array<['card' | 'interac', 'card' | 'bank', string, string]>).map(([id, icon, title, sub]) => {
            const on = payWith === id;
            return (
              <Pressable key={id} onPress={() => { tap(); setPayWith(id); }} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: space(4), borderWidth: 1, borderColor: on ? colors.red : colors.line, backgroundColor: colors.card }} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                <Icon name={icon} color={on ? colors.red : colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={type.cardTitle}>{title}</Text>
                  <Text style={type.small}>{sub}</Text>
                </View>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? colors.red : colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}>{on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red }} /> : null}</View>
              </Pressable>
            );
          })}
        </View>

        <Card style={{ gap: 2 }}>
          <Row label={t('subtotal')} value={money(totals.subtotal, lang)} />
          {delivery ? <Row label={t('deliveryFee')} value={money(totals.deliveryFee, lang)} /> : null}
          <Row label={t('taxes')} value={money(totals.taxes, lang)} />
          <Row label={t('tip')} value={money(totals.tip, lang)} />
          <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 6 }} />
          <Row label={t('total')} value={money(totals.total, lang)} strong />
          <Text style={[type.small, { marginTop: 4 }]}>{t('taxesNote')}</Text>
        </Card>

        {serverError ? <Notice text={serverError} tone="error" /> : null}
        {tried && invalid ? <Notice text={Object.values(errors).filter(Boolean)[0] as string} tone="error" /> : null}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space(4), paddingBottom: Math.max(insets.bottom, space(4)), backgroundColor: colors.bg, borderTopWidth: 1, borderColor: colors.line }}>
        <Button
          title={busy ? t('placing') : payWith === 'interac' ? t('placeInterac') : t('placeOrder')}
          right={busy ? undefined : money(totals.total, lang)}
          icon={payWith === 'interac' ? 'bank' : 'card'}
          loading={busy}
          disabled={!rules.onlineOrdering || !cart.length}
          onPress={place}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
