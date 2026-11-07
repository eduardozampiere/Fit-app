import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space, useTheme } from '../ui/theme';

/** Tempo na tela sem toque (ms). */
const VISIBLE_MS = 5000;
/** Distância do arraste lateral (pt) que dispensa a faixa. */
const DISMISS_AT = 60;

/**
 * Faixa "Novo recorde" no alto da tela. Não bloqueia nada fora dela (`box-none`), some sozinha em 5 s,
 * desliza para o lado para dispensar, é anunciada pelo leitor de tela e nunca toca som. O pai a remonta
 * com `key={seq}` a cada aviso, então uma segunda faixa substitui a primeira.
 */
export function RecordBanner({
  text,
  onPress,
  onDismiss,
}: {
  text: { title: string; line: string; a11y: string };
  onPress: () => void;
  onDismiss: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(-120));
  const [x] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive) return;
      if (reduce) y.setValue(0);
      else Animated.timing(y, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    });
    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [y, onDismiss]);

  const a11y = text.a11y;
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(a11y);
  }, [a11y]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderMove: (_, g) => x.setValue(g.dx),
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) >= DISMISS_AT) onDismiss();
          else Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [x, onDismiss],
  );

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        {...responder.panHandlers}
        accessibilityLiveRegion="polite"
        style={[
          styles.banner,
          { top: insets.top + space.sm, backgroundColor: t.card, borderColor: t.gold, transform: [{ translateY: y }, { translateX: x }] },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${text.a11y}. Abrir detalhes.`}
          onPress={onPress}
          style={styles.content}
        >
          <Ionicons name="medal" size={28} color={t.gold} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: t.text }]}>{text.title}</Text>
            <Text style={[styles.line, { color: t.muted }]}>{text.line}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    borderRadius: radius.card,
    borderWidth: 1.5,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  title: { fontSize: 16, fontWeight: '700' },
  line: { fontSize: 13 },
});
