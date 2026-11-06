import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { migrateDbIfNeeded } from '../db/schema';
import { AppDataProvider } from '../state/AppData';
import { RestTimerProvider } from '../state/RestTimer';
import { useTheme } from '../ui/theme';

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export default function RootLayout() {
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName="diario.db" onInit={migrateDbIfNeeded} useSuspense>
          <AppDataProvider>
            <RestTimerProvider>
              <StatusBar style="auto" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  headerStyle: { backgroundColor: t.bg },
                  headerTintColor: t.accent,
                  headerTitleStyle: { color: t.text },
                  contentStyle: { backgroundColor: t.bg },
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="ajustes" options={{ headerShown: true, title: 'Ajustes', presentation: 'modal' }} />
                <Stack.Screen name="exercicio" options={{ headerShown: true, title: 'Exercício', headerBackButtonDisplayMode: 'minimal' }} />
                <Stack.Screen name="dados" options={{ headerShown: true, title: 'Dados e Claude', presentation: 'modal' }} />
              </Stack>
            </RestTimerProvider>
          </AppDataProvider>
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}
