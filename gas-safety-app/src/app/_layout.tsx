import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { DialogHost } from '@/components/dialog-host';
import { NotificationTaps } from '@/components/notification-taps';
import { ReminderSync } from '@/components/reminder-sync';
import { useTheme } from '@/constants/theme';
import { setAppearance, useColorScheme } from '@/hooks/use-color-scheme';
import { StoreProvider, useStore } from '@/lib/store';

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
      <StoreProvider>
        <HideSplashWhenLoaded />
        <ApplyAppearance />
        <ReminderSync />
        <NotificationTaps />
        {/* Every screen starts with the navy band, so the status bar text is always white. */}
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: c.background },
            headerStyle: { backgroundColor: c.band },
            headerTintColor: c.bandText,
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            ...(Platform.OS === 'web' ? { headerStatusBarHeight: 0 } : null),
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Records' }} />
          <Stack.Screen name="record/[id]" options={{ title: 'Gas safety record' }} />
          <Stack.Screen name="appliance/[recordId]/[applianceId]" options={{ title: 'Appliance' }} />
        </Stack>
        <DialogHost />
      </StoreProvider>
    </ThemeProvider>
  );
}

/** Applies the Appearance setting (Automatic, Light or Dark). */
function ApplyAppearance() {
  const { engineer } = useStore();
  useEffect(() => {
    setAppearance(engineer.appearance);
  }, [engineer.appearance]);
  return null;
}

function HideSplashWhenLoaded() {
  const { loaded } = useStore();
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  return null;
}
