// "Plus": language, our kitchen (hours, directions, call), help and privacy links, clear data, version.
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { Badge, Button, Card, tap } from '../../components/ui';
import { useStore } from '../../lib/store';
import { call, openWeb } from '../../lib/actions';
import { formatTime, isOpenAt, montrealMinutes } from '../../lib/logic';
import { APP_VERSION } from '../../lib/config';
import { colors, space, type } from '../../lib/theme';

function LinkRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 54, paddingHorizontal: space(4), borderBottomWidth: 1, borderColor: colors.line }, pressed && { backgroundColor: colors.card2 }]} accessibilityRole="link" accessibilityLabel={label}>
      <Icon name={icon} size={20} color={colors.gold} />
      <Text style={[type.body, { flex: 1 }]}>{label}</Text>
      <Icon name="external" size={17} color={colors.muted} />
    </Pressable>
  );
}

export default function More() {
  const insets = useSafeAreaInsets();
  const { t, tx, lang, setLang, catalog, wipe } = useStore();
  const now = montrealMinutes();

  const clear = () => {
    Alert.alert(t('clearData'), t('clearConfirm'), [
      { text: t('no'), style: 'cancel' },
      { text: t('yes'), style: 'destructive', onPress: () => void wipe() },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: space(4), paddingBottom: Math.max(insets.bottom, 60), gap: space(5) }}>
      <View style={{ paddingHorizontal: space(4), gap: space(2) }}>
        <Text style={type.label}>{t('language')}</Text>
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.line }}>
          {(['fr', 'en'] as const).map((l) => (
            <Pressable key={l} onPress={() => { tap(); setLang(l); }} style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: lang === l ? colors.red : 'transparent' }} accessibilityRole="button" accessibilityState={{ selected: lang === l }}>
              <Text style={[type.chip, { color: lang === l ? colors.white : colors.muted }]}>{l === 'fr' ? 'Français' : 'English'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {catalog?.kitchens.length ? (
        <View style={{ paddingHorizontal: space(4), gap: space(2) }}>
          <Text style={type.label}>{t('ourKitchen')}</Text>
          {catalog.kitchens.map((k) => {
            const open = isOpenAt(k.hours, now);
            const loc = catalog.locations.find((l) => l.kitchen === k.id && l.mapsUrl) ?? catalog.locations.find((l) => l.kitchen === k.id);
            return (
              <Card key={k.id} style={{ gap: space(2) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={[type.cardTitle, { flex: 1 }]}>{tx(k.label)}</Text>
                  {open === null ? null : <Badge label={open ? t('openNow') : t('closedNow')} tone={open ? 'green' : 'muted'} />}
                </View>
                <Text style={type.small}>{k.address}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="clock" size={16} color={colors.muted} />
                  <Text style={type.small}>{k.hours ? `${t('everyDay')} · ${formatTime(k.hours.opens, lang)} – ${formatTime(k.hours.closes, lang)}` : t('hoursUnknown')}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: space(2), marginTop: 4 }}>
                  {loc?.mapsUrl ? <Button title={t('directions')} icon="nav" variant="secondary" onPress={() => openWeb(loc.mapsUrl!)} style={{ flex: 1 }} /> : null}
                  {catalog.phone ? <Button title={t('call')} icon="phone" variant="secondary" onPress={() => call(loc?.phone ?? catalog.phone.e164)} style={{ flex: 1 }} /> : null}
                </View>
              </Card>
            );
          })}
        </View>
      ) : null}

      <View style={{ borderTopWidth: 1, borderColor: colors.line }}>
        {catalog ? <LinkRow icon="info" label={t('help')} onPress={() => openWeb(catalog.legal.help)} /> : null}
        {catalog ? <LinkRow icon="shield" label={t('privacy')} onPress={() => openWeb(catalog.legal.privacy)} /> : null}
        {catalog ? <LinkRow icon="trash" label={t('dataDeletion')} onPress={() => openWeb(catalog.legal.dataDeletion)} /> : null}
        <LinkRow icon="globe" label={`${t('website')} · pppmtl.com`} onPress={() => openWeb(catalog?.site ?? 'https://pppmtl.com')} />
      </View>

      <View style={{ paddingHorizontal: space(4), gap: space(3) }}>
        <Button title={t('clearData')} icon="trash" variant="ghost" onPress={clear} />
        <Text style={[type.small, { textAlign: 'center' }]}>{t('madeBy')}</Text>
        <Text style={[type.small, { textAlign: 'center', color: colors.faint }]}>{t('version')} {APP_VERSION}</Text>
      </View>
    </ScrollView>
  );
}
