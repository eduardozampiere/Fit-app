import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { radius, space, useTheme } from '../ui/theme';

/** Distância do arraste (pt) que apaga ao soltar. */
const DELETE_AT = 120;
/** Para onde a linha desliza ao apagar (além da largura de qualquer iPhone). */
const OFFSCREEN = 600;

/**
 * Arrastar a linha para a direita mostra uma lixeira por baixo; soltar depois de `DELETE_AT` apaga.
 * Feito com PanResponder (sem pacote nativo). Só reage a gesto claramente horizontal, para não
 * brigar com a rolagem da tela. Leitores de tela têm a ação "Remover".
 */
export function SwipeToDelete({ onDelete, label, children }: { onDelete: () => void; label: string; children: ReactNode }) {
  const t = useTheme();
  const [x] = useState(() => new Animated.Value(0));

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => x.setValue(Math.max(0, g.dx)),
        onPanResponderRelease: (_, g) => {
          if (g.dx >= DELETE_AT) {
            Animated.timing(x, { toValue: OFFSCREEN, duration: 150, useNativeDriver: true }).start(() => {
              onDelete();
              x.setValue(0);
            });
          } else {
            Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [x, onDelete],
  );

  const reveal = x.interpolate({ inputRange: [0, 16, DELETE_AT], outputRange: [0, 1, 1], extrapolate: 'clamp' });
  const iconScale = x.interpolate({ inputRange: [0, DELETE_AT], outputRange: [0.6, 1.15], extrapolate: 'clamp' });

  return (
    <View
      style={{ overflow: 'hidden', borderRadius: radius.cell }}
      accessibilityActions={[{ name: 'delete', label: `Remover ${label}` }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'delete') onDelete();
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.under, { backgroundColor: t.danger, opacity: reveal }]}>
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Ionicons name="trash" size={22} color={t.accentText} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: x }], backgroundColor: t.bg, borderRadius: radius.cell }} {...responder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  under: { borderRadius: radius.cell, justifyContent: 'center', paddingLeft: space.lg },
});
