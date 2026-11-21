// The dish sheet (the website's item sheet): photo, description, Clover options with their rules and prices,
// quantity, kitchen note, then "Add · total".
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon } from '../../components/Icon';
import { Badge, Button, Field, Notice, Stepper, tap } from '../../components/ui';
import { useStore } from '../../lib/store';
import { call } from '../../lib/actions';
import { chosenIds, defaultSelections, dollars, groupMax, groupMin, groupRule, missingGroups, money, toggleChoice, unitCents } from '../../lib/logic';
import { colors, radius, space, type } from '../../lib/theme';
import type { Selections } from '../../lib/types';

export default function ItemSheet() {
  const { id, line } = useLocalSearchParams<{ id: string; line?: string }>();
  const insets = useSafeAreaInsets();
  const { item: find, tx, t, lang, addLine, updateLine, cart, catalog } = useStore();
  const item = find(id);
  const editing = line ? cart.find((l) => l.lineId === line) : undefined;
  const [selections, setSelections] = useState<Selections>(() => editing?.selections ?? (item ? defaultSelections(item.modifierGroups) : {}));
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [tried, setTried] = useState(false);

  const missing = useMemo(() => (item ? missingGroups(item.modifierGroups, selections) : []), [item, selections]);
  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Button title={t('close')} variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }
  const unit = unitCents(item, selections);
  const total = unit === null ? null : unit * quantity;

  const submit = () => {
    setTried(true);
    if (missing.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      return;
    }
    if (editing) updateLine(editing.lineId, { selections, quantity, notes: notes.trim() });
    else addLine(item.id, quantity, selections, notes.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <View>
          <Image source={{ uri: item.image }} placeholder={{ uri: item.thumb }} style={{ width: '100%', aspectRatio: 1.25, backgroundColor: colors.card }} contentFit="cover" transition={200} />
          <LinearGradient colors={['#00000088', 'transparent']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 90 }} />
          <Pressable onPress={() => router.back()} style={{ position: 'absolute', top: Platform.OS === 'android' ? insets.top + 8 : 14, right: 14, width: 42, height: 42, borderRadius: 21, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={t('close')}>
            <Icon name="close" size={22} />
          </Pressable>
        </View>
        <View style={{ padding: space(4), gap: space(2) }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {item.badges.includes('popular') ? <Badge label={t('popular')} /> : null}
            {item.badges.includes('deal') ? <Badge label={t('deal')} tone="red" /> : null}
          </View>
          <Text style={type.display}>{tx(item.name)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text style={[type.price, { fontSize: 24 }]}>{money(dollars(item.price), lang)}</Text>
            {item.compareAtPrice ? <Text style={[type.small, { textDecorationLine: 'line-through' }]}>{money(dollars(item.compareAtPrice), lang)}</Text> : null}
          </View>
          {tx(item.description) ? <Text style={[type.body, { color: colors.muted }]}>{tx(item.description)}</Text> : null}
        </View>

        {!item.orderable ? (
          <View style={{ paddingHorizontal: space(4), gap: space(3) }}>
            <Notice text={t('notOrderable')} tone="warn" />
            {catalog ? <Button title={t('callToOrder')} icon="phone" onPress={() => call(catalog.phone.e164)} /> : null}
          </View>
        ) : (
          <>
            {item.modifierGroups.map((group) => {
              const chosen = chosenIds(selections, group.id);
              const needs = tried && missing.includes(group);
              const multi = groupMax(group) > 1;
              return (
                <View key={group.id} style={{ marginTop: space(4) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space(4), paddingVertical: space(3), backgroundColor: colors.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: needs ? colors.danger : colors.line }}>
                    <View style={{ flex: 1 }}>
                      <Text style={type.cardTitle}>{lang === 'fr' ? group.labelFr : group.labelEn}</Text>
                      <Text style={[type.small, needs && { color: colors.danger }]}>{groupRule(group, lang === 'fr')}</Text>
                    </View>
                    {groupMin(group) >= 1 ? <Badge label={chosen.length >= groupMin(group) ? '✓' : t('required')} tone={chosen.length >= groupMin(group) ? 'green' : 'gold'} /> : null}
                  </View>
                  {group.choices.filter((c) => c.available !== false).map((choice) => {
                    const on = chosen.includes(choice.id);
                    return (
                      <Pressable
                        key={choice.id}
                        onPress={() => { tap(); setSelections((cur) => toggleChoice(cur, group, choice.id)); }}
                        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space(4), minHeight: 54, borderBottomWidth: 1, borderColor: colors.line }, pressed && { backgroundColor: colors.card }]}
                        accessibilityRole={multi ? 'checkbox' : 'radio'}
                        accessibilityState={{ checked: on }}
                      >
                        <View style={{ width: 24, height: 24, borderRadius: multi ? radius.sm : 12, borderWidth: 2, borderColor: on ? colors.red : colors.lineStrong, backgroundColor: on ? colors.red : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          {on ? <Icon name="check" size={15} color={colors.white} strokeWidth={3} /> : null}
                        </View>
                        <Text style={[type.body, { flex: 1 }]}>{lang === 'fr' ? choice.labelFr : choice.labelEn}</Text>
                        {choice.priceDelta ? <Text style={[type.body, { color: colors.muted }]}>+ {money(dollars(choice.priceDelta), lang)}</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
            <View style={{ padding: space(4), gap: space(4), marginTop: space(2) }}>
              <Field label={t('instructions')} placeholder={t('instructionsPlaceholder')} value={notes} onChangeText={(v) => setNotes(v.slice(0, 240))} multiline maxLength={240} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={type.cardTitle}>{t('quantity')}</Text>
                <Stepper value={quantity} onChange={setQuantity} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
      {item.orderable ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space(4), paddingBottom: Math.max(insets.bottom, space(4)), backgroundColor: colors.bg, borderTopWidth: 1, borderColor: colors.line }}>
          {tried && missing.length ? <Text style={[type.small, { color: colors.danger, marginBottom: 8 }]}>{t('chooseRequired')}</Text> : null}
          <Button title={editing ? t('edit') : t('addToOrder')} icon={editing ? 'check' : 'plus'} right={money(total, lang)} onPress={submit} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
