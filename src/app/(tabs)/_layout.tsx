import { NativeTabs } from 'expo-router/native-tabs';
import { FloatingBars } from '../../components/FloatingBars';
import { useTheme } from '../../ui/theme';

/**
 * Abas nativas: no iOS 26+ o sistema desenha a barra em Liquid Glass e a encolhe ao rolar.
 * Treino em andamento e timer de descanso são cartões retangulares flutuantes (FloatingBars) acima da
 * barra, visíveis em qualquer aba (a cápsula do "bottom accessory" não deixava mudar a forma).
 */
export default function TabsLayout() {
  const t = useTheme();
  return (
    <>
      <NativeTabs minimizeBehavior="onScrollDown" tintColor={t.accent}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Hoje</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }} md="fitness_center" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="comida">
          <NativeTabs.Trigger.Label>Comida</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'fork.knife.circle', selected: 'fork.knife.circle.fill' }} md="restaurant" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="corpo">
          <NativeTabs.Trigger.Label>Corpo</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'heart.text.square', selected: 'heart.text.square.fill' }} md="monitor_heart" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="analises">
          <NativeTabs.Trigger.Label>Análises</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="chart.xyaxis.line" md="monitoring" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="plano">
          <NativeTabs.Trigger.Label>Plano</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        </NativeTabs.Trigger>
      </NativeTabs>
      <FloatingBars />
    </>
  );
}
