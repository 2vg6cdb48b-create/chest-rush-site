import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { DialogHost } from '@/components/dialog-host';
import { useTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StockProvider, useStock } from '@/lib/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: c.primary, background: c.background, card: c.card },
  };
  return (
    <ThemeProvider value={navTheme}>
      <StockProvider>
        <HideSplashWhenLoaded />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: c.background },
            ...(Platform.OS === 'web' ? { headerStatusBarHeight: 0 } : null),
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="item/[id]" options={{ presentation: 'modal', title: 'Item' }} />
        </Stack>
        <DialogHost />
      </StockProvider>
    </ThemeProvider>
  );
}

function HideSplashWhenLoaded() {
  const { loaded } = useStock();
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  return null;
}
