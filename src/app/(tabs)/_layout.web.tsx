import { Tabs } from 'expo-router';
import { useTheme } from '../../ui/theme';

/** Só para a pré-visualização no navegador: abas em JS. No iPhone valem as abas nativas (_layout.tsx). */
export default function TabsLayoutWeb() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.separator },
        tabBarLabelStyle: { fontSize: 14, fontWeight: '700' },
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="comida" options={{ title: 'Comida' }} />
      <Tabs.Screen name="corpo" options={{ title: 'Corpo' }} />
      <Tabs.Screen name="analises" options={{ title: 'Análises' }} />
      <Tabs.Screen name="plano" options={{ title: 'Plano' }} />
    </Tabs>
  );
}
