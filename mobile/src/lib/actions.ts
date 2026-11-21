// Shared navigation helpers.
import { router } from 'expo-router';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { defaultSelections, missingGroups } from './logic';
import type { Item, Selections } from './types';
import { colors } from './theme';

export function openItem(item: Item) {
  router.push({ pathname: '/item/[id]', params: { id: item.id } });
}

/** "+ Add": straight into the cart when nothing must be chosen, else the dish sheet. */
export function quickAdd(item: Item, add: (itemId: string, q: number, s: Selections, n: string) => void) {
  const selections = defaultSelections(item.modifierGroups);
  if (!item.orderable) return openItem(item);
  if (item.modifierGroups.length && missingGroups(item.modifierGroups, selections).length) return openItem(item);
  if (item.modifierGroups.some((g) => g.choices.some((c) => (c.priceDelta ?? 0) > 0))) return openItem(item);
  add(item.id, 1, selections, '');
}

export function call(e164: string) {
  Linking.openURL(`tel:${e164}`).catch(() => undefined);
}

export function openWeb(url: string) {
  WebBrowser.openBrowserAsync(url, { controlsColor: colors.red, toolbarColor: colors.bg, enableBarCollapsing: true }).catch(() => Linking.openURL(url).catch(() => undefined));
}
