import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold, Barlow_800ExtraBold } from '@expo-google-fonts/barlow';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../lib/store';
import { colors, fonts } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined);

function Navigator() {
  const { t, catalogState } = useStore();
  useEffect(() => {
    if (catalogState !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
    const timer = setTimeout(() => SplashScreen.hideAsync().catch(() => undefined), 2500);
    return () => clearTimeout(timer);
  }, [catalogState]);
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="item/[id]" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="brand/[id]" options={{ title: '' }} />
      <Stack.Screen name="cart" options={{ title: t('yourOrder').toUpperCase(), presentation: 'modal' }} />
      <Stack.Screen name="checkout" options={{ title: t('checkoutTitle').toUpperCase() }} />
      <Stack.Screen name="search" options={{ title: t('search').toUpperCase(), animation: 'fade' }} />
      <Stack.Screen name="order/[id]" options={{ title: t('order').toUpperCase() }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Anton_400Regular, Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold, Barlow_800ExtraBold });
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <StoreProvider>
          <Navigator />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
