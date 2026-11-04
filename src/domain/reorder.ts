/**
 * Reordenar por arraste: mover itens numa lista, agrupar exercício com seus filhos e a geometria
 * do arraste (para onde o item cai e quanto os outros abrem espaço). Tudo puro.
 */

/** Posição nova de quem estava em `p` quando o item de `from` vai para `to` (qualquer base). */
export function movedPosition(p: number, from: number, to: number): number {
  if (p === from) return to;
  if (from < to && p > from && p <= to) return p - 1;
  if (to < from && p >= to && p < from) return p + 1;
  return p;
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Exercício principal seguido dos seus filhos (a parte de um complexo anda junto). */
export function itemBlocks<T extends { id: string; parentId: string | null }>(items: readonly T[]): T[][] {
  const ids = new Set(items.map((i) => i.id));
  const blocks: T[][] = [];
  for (const item of items) {
    if (item.parentId && ids.has(item.parentId)) {
      blocks.find((b) => b[0].id === item.parentId)?.push(item);
    } else {
      blocks.push([item]);
    }
  }
  return blocks;
}

/**
 * Blocos na ordem salva do dia (ids dos primeiros itens). Os que não estão na ordem salva (item
 * novo no plano) vão para o fim, na ordem do plano.
 */
export function orderBlocks<T extends { id: string }>(blocks: T[][], order: readonly string[] | undefined): T[][] {
  if (!order?.length) return blocks;
  const rank = new Map(order.map((id, i) => [id, i]));
  const known = blocks.filter((b) => rank.has(b[0].id)).sort((a, b) => rank.get(a[0].id)! - rank.get(b[0].id)!);
  return [...known, ...blocks.filter((b) => !rank.has(b[0].id))];
}

export interface Slot {
  y: number;
  h: number;
}

/** Índice onde o item arrastado cai: quantos dos outros têm o meio acima do centro dele. */
export function dropIndex(slots: readonly Slot[], active: number, center: number): number {
  return slots.filter((s, i) => i !== active && s.y + s.h / 2 < center).length;
}

/** Deslocamento de um item parado enquanto `active` está sobre `target` (abre espaço de `size`). */
export function dragShift(i: number, active: number, target: number, size: number): number {
  if (i === active) return 0;
  if (active < target && i > active && i <= target) return -size;
  if (target < active && i >= target && i < active) return size;
  return 0;
}

/** Espaço que o item arrastado ocupa: a altura dele mais o intervalo entre itens. */
export function slotSize(slots: readonly Slot[], active: number): number {
  const gap = slots.length >= 2 ? Math.max(0, slots[1].y - slots[0].y - slots[0].h) : 0;
  return (slots[active]?.h ?? 0) + gap;
}

/** Deslocamento que põe o item arrastado exatamente no lugar onde vai ficar (animação ao soltar). */
export function settleOffset(slots: readonly Slot[], active: number, target: number): number {
  const a = slots[active];
  const t = slots[target];
  if (!a || !t || target === active) return 0;
  return target > active ? t.y + t.h - (a.y + a.h) : t.y - a.y;
}
