import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';
import { RestTimerAccessory } from '../../components/RestTimerBar';
import { useRestTimer } from '../../state/RestTimer';
import { useTheme } from '../../ui/theme';

/**
 * Abas nativas: no iOS 26+ o sistema desenha a barra em Liquid Glass e a encolhe ao rolar.
 * O cronômetro de descanso fica no "bottom accessory" (como o mini player do Apple Music),
 * visível em qualquer aba enquanto estiver rodando.
 */
export default function TabsLayout() {
  const t = useTheme();
  const timer = useRestTimer();
  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={t.accent}>
      {Platform.OS === 'ios' && timer.endAt !== null ? (
        <NativeTabs.BottomAccessory>
          <RestTimerAccessory />
        </NativeTabs.BottomAccessory>
      ) : null}
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Hoje</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }} md="fitness_center" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="checkin">
        <NativeTabs.Trigger.Label>Check-in</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart.text.square', selected: 'heart.text.square.fill' }} md="monitor_heart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plano">
        <NativeTabs.Trigger.Label>Plano</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ajustes">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
