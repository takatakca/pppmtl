import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { useStore } from '../../lib/store';
import { colors, fonts } from '../../lib/theme';

const icon = (name: IconName) => ({ color }: { color: unknown }) => <Icon name={name} size={23} color={String(color)} />;

export default function TabsLayout() {
  const { t, receipts } = useStore();
  const active = receipts.filter((r) => r.order && ['SUBMITTED', 'ACCEPTED', 'PREPARING', 'READY'].includes(r.order.status) && r.order.paymentStatus !== 'UNPAID').length;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.red,
        tabBarLabelStyle: { fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line, height: Platform.OS === 'ios' ? 88 : 66, paddingTop: 0 },
        tabBarItemStyle: { paddingTop: 6 },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabHome'), headerShown: false, tabBarIcon: icon('home') }} />
      <Tabs.Screen name="menu" options={{ title: t('tabMenu'), headerShown: false, tabBarIcon: icon('menu') }} />
      <Tabs.Screen name="restaurants" options={{ title: t('tabBrands'), headerTitle: t('ourRestaurants').toUpperCase(), tabBarIcon: icon('store') }} />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabOrders'),
          headerTitle: t('ordersTitle').toUpperCase(),
          tabBarIcon: ({ color }) => (
            <View>
              <Icon name="receipt" size={23} color={String(color)} />
              {active ? <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: colors.gold, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: fonts.bold, fontSize: 10, color: colors.black }}>{active}</Text></View> : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen name="more" options={{ title: t('tabMore'), headerTitle: t('moreTitle').toUpperCase(), tabBarIcon: icon('more') }} />
    </Tabs>
  );
}
