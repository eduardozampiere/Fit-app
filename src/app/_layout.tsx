import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { migrateDbIfNeeded } from '../db/schema';
import { AppDataProvider } from '../state/AppData';
import { RestTimerProvider } from '../state/RestTimer';

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName="diario.db" onInit={migrateDbIfNeeded} useSuspense>
          <AppDataProvider>
            <RestTimerProvider>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }} />
            </RestTimerProvider>
          </AppDataProvider>
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}
