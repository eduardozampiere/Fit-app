import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../ui/theme';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: t.accent,
          tabBarInactiveTintColor: t.muted,
          tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Hoje', tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color as string} size={size} /> }}
        />
        <Tabs.Screen
          name="plano"
          options={{ title: 'Plano', tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color as string} size={size} /> }}
        />
        <Tabs.Screen
          name="ajustes"
          options={{ title: 'Ajustes', tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color as string} size={size} /> }}
        />
      </Tabs>
    </View>
  );
}
