import * as Haptics from 'expo-haptics';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { dragShift, dropIndex, settleOffset, slotSize, type Slot } from '../domain/reorder';
import { useTheme } from '../ui/theme';

/** Props para espalhar no Pressable que serve de alça (segurar para arrastar). */
export interface DragHandleProps {
  onLongPress: () => void;
  delayLongPress: number;
  accessibilityActions: { name: string; label: string }[];
  onAccessibilityAction: (e: AccessibilityActionEvent) => void;
}

const LONG_PRESS_MS = 300;

type Shift = { target: number; size: number };
type Measurable = { measureInWindow: (cb: (x: number, y: number) => void) => void };

/**
 * Estado de um arraste, lido e escrito só nos callbacks de gesto (fora do render). Fica num objeto
 * próprio porque o PanResponder é criado uma vez e precisa sempre do valor atual.
 */
class DragSession {
  active: number | null = null;
  private target: number | null = null;
  private granted = false;
  private settling = false;
  private top = 0;
  private slots: Slot[] = [];
  private node: Measurable | null = null;
  private onMove: (from: number, to: number) => void = () => {};
  private onDragChange: ((dragging: boolean) => void) | undefined;

  constructor(
    readonly dragY: Animated.Value,
    private readonly setActive: (i: number | null) => void,
    private readonly setShift: (s: Shift | null) => void,
  ) {}

  update(count: number, onMove: (from: number, to: number) => void, onDragChange?: (dragging: boolean) => void) {
    // A lista pode ter encolhido (série apagada): medidas de itens que não existem mais saem.
    this.slots.length = Math.min(this.slots.length, count);
    this.onMove = onMove;
    this.onDragChange = onDragChange;
  }

  setSlot(index: number, slot: Slot) {
    this.slots[index] = slot;
  }

  /** Os cartões recolhem ao começar o arraste: a lista muda de lugar na tela. */
  containerLayout(node: Measurable) {
    this.node = node;
    if (this.active !== null) this.measureTop();
  }

  private measureTop() {
    this.node?.measureInWindow((_x, y) => (this.top = y));
  }

  start(index: number) {
    if (this.settling) return;
    this.active = index;
    this.target = index;
    this.granted = false;
    this.measureTop();
    this.setActive(index);
    this.setShift(null);
    this.onDragChange?.(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }

  grant() {
    this.granted = true;
  }

  move(pageY: number) {
    const slot = this.active !== null ? this.slots[this.active] : undefined;
    if (this.active === null || !slot) return;
    // O item fica centrado no dedo (os cartões podem ter encolhido depois do toque longo).
    const center = pageY - this.top;
    this.dragY.setValue(center - (slot.y + slot.h / 2));
    const next = dropIndex(this.slots, this.active, center);
    if (next !== this.target) {
      this.target = next;
      this.setShift({ target: next, size: slotSize(this.slots, this.active) });
      Haptics.selectionAsync().catch(() => {});
    }
  }

  /** Soltou sem mexer depois do toque longo: o PanResponder nem chegou a assumir. */
  touchEnd() {
    if (this.active !== null && !this.granted) this.finish();
  }

  /**
   * Encaixa o item no lugar novo e só então troca a ordem (o pai atualiza os dados na hora): assim o
   * item não volta à origem por um quadro. O `dragY` zera depois do commit (efeito no DragList).
   */
  finish() {
    const { active, target } = this;
    if (active === null || this.settling) return;
    this.settling = true;
    const to = target ?? active;
    Animated.timing(this.dragY, { toValue: settleOffset(this.slots, active, to), duration: 120, useNativeDriver: true }).start(() => {
      if (to !== active) this.onMove(active, to);
      this.active = null;
      this.target = null;
      this.granted = false;
      this.settling = false;
      this.setActive(null);
      this.setShift(null);
      this.onDragChange?.(false);
    });
  }
}

/**
 * Lista reordenável: segurar a alça de um item (`handle`) e arrastar. O item segue o dedo, os
 * outros abrem espaço e, ao soltar, `onMove(de, para)` é chamado; o pai atualiza os dados na hora
 * (otimista) para não piscar. Feito com PanResponder e Animated, sem pacote nativo.
 * `onDragChange` avisa o pai para travar a rolagem (e, no caso dos exercícios, recolher os cartões).
 * Leitores de tela têm as ações "Mover para cima/baixo".
 */
export function DragList<T>({
  items,
  keyOf,
  renderItem,
  onMove,
  onDragChange,
  style,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number, handle: DragHandleProps, active: boolean) => ReactNode;
  onMove: (from: number, to: number) => void;
  onDragChange?: (dragging: boolean) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const [active, setActive] = useState<number | null>(null);
  // Onde o item arrastado está agora e o espaço que os outros abrem para ele.
  const [shift, setShift] = useState<Shift | null>(null);
  const [session] = useState(() => new DragSession(new Animated.Value(0), setActive, setShift));
  useEffect(() => session.update(items.length, onMove, onDragChange), [session, items.length, onMove, onDragChange]);
  // Depois do commit da ordem nova o item já não usa o dragY: pode zerar.
  useEffect(() => {
    if (active === null) session.dragY.setValue(0);
  }, [session, active]);

  const [responder] = useState(() =>
    PanResponder.create({
      // Captura só depois do toque longo: até lá, toques e rolagem seguem normais.
      onMoveShouldSetPanResponderCapture: () => session.active !== null,
      onPanResponderGrant: () => session.grant(),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, gesture) => session.move(gesture.moveY),
      onPanResponderRelease: () => session.finish(),
      onPanResponderTerminate: () => session.finish(),
    }),
  );

  return (
    <View
      style={style}
      onLayout={(e: LayoutChangeEvent) => session.containerLayout(e.currentTarget as unknown as Measurable)}
      onTouchEnd={() => session.touchEnd()}
      {...responder.panHandlers}
    >
      {items.map((item, index) => {
        const isActive = index === active;
        const handle: DragHandleProps = {
          onLongPress: () => session.start(index),
          delayLongPress: LONG_PRESS_MS,
          accessibilityActions: [
            ...(index > 0 ? [{ name: 'moveUp', label: 'Mover para cima' }] : []),
            ...(index < items.length - 1 ? [{ name: 'moveDown', label: 'Mover para baixo' }] : []),
          ],
          onAccessibilityAction: (e) => {
            if (e.nativeEvent.actionName === 'moveUp') onMove(index, index - 1);
            if (e.nativeEvent.actionName === 'moveDown') onMove(index, index + 1);
          },
        };
        return (
          <DragItem
            key={keyOf(item)}
            dragY={isActive ? session.dragY : null}
            shift={active !== null && shift ? dragShift(index, active, shift.target, shift.size) : 0}
            animate={active !== null}
            lift={{ bg: t.card, shadow: t.shadow }}
            onLayout={(slot) => session.setSlot(index, slot)}
          >
            {renderItem(item, index, handle, isActive)}
          </DragItem>
        );
      })}
    </View>
  );
}

function DragItem({
  dragY,
  shift,
  animate,
  lift,
  onLayout,
  children,
}: {
  /** Só o item arrastado recebe: ele segue o dedo. */
  dragY: Animated.Value | null;
  shift: number;
  animate: boolean;
  lift: { bg: string; shadow: string };
  onLayout: (slot: Slot) => void;
  children: ReactNode;
}) {
  const [offset] = useState(() => new Animated.Value(0));
  useEffect(() => {
    // Ao soltar, os dados já vêm na ordem nova: voltar ao lugar sem animação evita o "pulo".
    if (animate) Animated.spring(offset, { toValue: shift, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
    else offset.setValue(0);
  }, [offset, shift, animate]);

  return (
    <Animated.View
      onLayout={(e) => onLayout({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}
      style={
        dragY
          ? {
              zIndex: 10,
              backgroundColor: lift.bg,
              transform: [{ translateY: dragY }, { scale: 1.02 }],
              shadowColor: lift.shadow,
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
            }
          : { transform: [{ translateY: offset }] }
      }
    >
      {children}
    </Animated.View>
  );
}
