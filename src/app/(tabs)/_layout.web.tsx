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
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        tabBarLabelStyle: { fontSize: 14, fontWeight: '700' },
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="checkin" options={{ title: 'Check-in' }} />
      <Tabs.Screen name="plano" options={{ title: 'Plano' }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
