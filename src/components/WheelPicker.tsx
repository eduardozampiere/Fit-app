import * as Haptics from 'expo-haptics';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { radius, useTheme } from '../ui/theme';

const ITEM_H = 44;
const VISIBLE = 5;

/**
 * Roda de valores no estilo do seletor do iOS/Hevy: o item do meio (na faixa) é o escolhido, a rolagem
 * encaixa em cada item e vibra a cada troca. Só JavaScript (sem módulo nativo). `index` é só o ponto
 * de partida; o pai guarda o valor em `onChange`.
 */
export function WheelPicker({
  labels,
  index,
  onChange,
  label,
}: {
  labels: readonly string[];
  index: number;
  onChange: (index: number) => void;
  label: string;
}) {
  const t = useTheme();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [live, setLive] = useState(index);
  const lastTick = useRef(index);
  const max = labels.length - 1;
  const at = (e: NativeSyntheticEvent<NativeScrollEvent>) => Math.min(max, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));

  const goTo = (i: number) => {
    const next = Math.min(max, Math.max(0, i));
    scroll.current?.scrollTo({ y: next * ITEM_H, animated: true });
    setLive(next);
    onChange(next);
  };

  return (
    <View
      style={{ height: ITEM_H * VISIBLE }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: labels[live] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => goTo(live + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
    >
      <View pointerEvents="none" style={[styles.band, { backgroundColor: t.surface, top: ITEM_H * 2, height: ITEM_H }]} />
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentOffset={{ x: 0, y: index * ITEM_H }}
        onLayout={() => scroll.current?.scrollTo({ y: index * ITEM_H, animated: false })}
        onScroll={(e) => {
          const i = at(e);
          if (i !== lastTick.current) {
            lastTick.current = i;
            setLive(i);
            Haptics.selectionAsync().catch(() => {});
          }
        }}
        onMomentumScrollEnd={(e) => onChange(at(e))}
        onScrollEndDrag={(e) => onChange(at(e))}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
      >
        {labels.map((text, i) => {
          const d = Math.abs(i - live);
          return (
            <Pressable key={text} accessible={false} onPress={() => goTo(i)} style={styles.item}>
              <Text
                style={[styles.text, { color: d === 0 ? t.text : t.muted, opacity: d === 0 ? 1 : d === 1 ? 0.7 : 0.4, fontSize: d === 0 ? 24 : 20 }]}
                maxFontSizeMultiplier={1.2}
              >
                {text}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 0, right: 0, borderRadius: radius.button },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '600', fontVariant: ['tabular-nums'] },
});
