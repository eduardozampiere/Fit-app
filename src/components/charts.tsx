import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { Point } from '../domain/analytics';
import { formatNumber } from '../domain/format';
import { useTheme } from '../ui/theme';
import { Card } from './ui';

const PAD = { top: 12, right: 56, bottom: 22, left: 40 };

/** Passo "redondo" (1, 2, 2,5, 5 × 10^n) para ~3 divisões. */
function niceStep(span: number, divisions = 3): number {
  const raw = span / divisions;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

interface Scale {
  lo: number;
  hi: number;
  step: number;
}

function niceScale(values: number[], includeZero = false): Scale {
  let min = Math.min(...values, ...(includeZero ? [0] : []));
  let max = Math.max(...values);
  if (min === max) {
    const pad = Math.max(1, Math.abs(max) * 0.05);
    min -= pad;
    max += pad;
  }
  const step = niceStep(max - min);
  return { lo: includeZero ? 0 : Math.floor(min / step) * step, hi: Math.ceil(max / step) * step, step };
}

function ticks({ lo, hi, step }: Scale): number[] {
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 1000; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

const FONT = Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' });

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <Card>
      <Text style={{ color: t.text, fontSize: 17, fontWeight: '600' }} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={{ color: t.muted, fontSize: 13 }}>{subtitle}</Text> : null}
      {children}
    </Card>
  );
}

export interface LineSeries {
  name: string;
  points: Point[];
  /** índice na paleta categórica (ordem fixa: a cor segue a entidade) */
  slot: number;
  style?: 'line' | 'dots' | 'line+dots';
}

/** Linhas (uma escala só). Toque/arraste mostra os valores daquele ponto. */
export function LineChart({
  series,
  height = 180,
  yFormat = (v: number) => formatNumber(v, 0),
  xFormat = (x: string) => (x.length === 10 ? `${x.slice(8, 10)}/${x.slice(5, 7)}` : x),
  empty = 'Sem dados ainda.',
}: {
  series: LineSeries[];
  height?: number;
  yFormat?: (v: number) => string;
  xFormat?: (x: string) => string;
  empty?: string;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort();
  const values = series.flatMap((s) => s.points.map((p) => p.y));
  if (!values.length) return <Text style={{ color: t.muted, fontSize: 14 }}>{empty}</Text>;

  const scale = niceScale(values);
  const { lo, hi } = scale;
  const multi = series.length > 1;
  // Uma série só: o rótulo do último ponto vai acima dele, então a linha pode ir até a borda do cartão.
  const padRight = multi ? PAD.right : 8;
  const w = Math.max(0, width - PAD.left - padRight);
  const h = height - PAD.top - PAD.bottom;
  const xAt = (i: number) => PAD.left + (xs.length === 1 ? w / 2 : (i / (xs.length - 1)) * w);
  const yAt = (v: number) => PAD.top + h - ((v - lo) / (hi - lo)) * h;
  const onTouch = (e: GestureResponderEvent) => {
    if (xs.length === 0 || w <= 0) return;
    const x = e.nativeEvent.locationX;
    const i = xs.length === 1 ? 0 : Math.round(((x - PAD.left) / w) * (xs.length - 1));
    setSel(Math.max(0, Math.min(xs.length - 1, i)));
  };

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {multi ? (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.name} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: t.series[s.slot] }]} />
              <Text style={{ color: t.muted, fontSize: 13 }}>{s.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.tooltipRow}>
        {sel !== null ? (
          <Text style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>
            {xFormat(xs[sel])}:{' '}
            {series
              .map((s) => {
                const p = s.points.find((pp) => pp.x === xs[sel]);
                return p ? `${multi ? `${s.name} ` : ''}${yFormat(p.y)}` : null;
              })
              .filter(Boolean)
              .join(' · ') || '—'}
          </Text>
        ) : (
          <Text style={{ color: t.muted, fontSize: 12 }}>Toque no gráfico para ver os valores</Text>
        )}
      </View>
      {width > 0 ? (
        <Pressable onPressIn={onTouch} onTouchMove={onTouch} accessibilityLabel="Gráfico de linhas" accessibilityHint="Toque para ver os valores">
          <Svg width={width} height={height}>
            {ticks(scale).map((v) => (
              <Line key={v} x1={PAD.left} x2={PAD.left + w} y1={yAt(v)} y2={yAt(v)} stroke={t.grid} strokeWidth={1} />
            ))}
            {ticks(scale).map((v) => (
              <SvgText fontFamily={FONT} key={`l${v}`} x={PAD.left - 6} y={yAt(v) + 4} fontSize={11} fill={t.muted} textAnchor="end">
                {yFormat(v)}
              </SvgText>
            ))}
            {[0, xs.length - 1].filter((i, k, a) => a.indexOf(i) === k).map((i) => (
              <SvgText fontFamily={FONT} key={`x${i}`} x={xAt(i)} y={height - 6} fontSize={11} fill={t.muted} textAnchor={i === 0 && xs.length > 1 ? 'start' : 'end'}>
                {xFormat(xs[i])}
              </SvgText>
            ))}
            {sel !== null ? <Line x1={xAt(sel)} x2={xAt(sel)} y1={PAD.top} y2={PAD.top + h} stroke={t.muted} strokeWidth={1} /> : null}
            {series.map((s) => {
              const color = t.series[s.slot];
              const pts = s.points.map((p) => ({ x: xAt(xs.indexOf(p.x)), y: yAt(p.y), raw: p }));
              const style = s.style ?? 'line+dots';
              const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
              const last = pts[pts.length - 1];
              return (
                <G key={s.name}>
                  {style !== 'dots' && pts.length > 1 ? <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
                  {style !== 'line'
                    ? pts.map((p) => <Circle key={p.raw.x} cx={p.x} cy={p.y} r={4} fill={color} stroke={t.card} strokeWidth={2} />)
                    : null}
                  {last ? (
                    <SvgText
                      fontFamily={FONT}
                      x={multi ? last.x + 8 : Math.min(last.x, width - 4)}
                      y={multi ? last.y + 4 : last.y > PAD.top + 14 ? last.y - 10 : last.y + 18}
                      fontSize={11}
                      fontWeight="700"
                      fill={t.text}
                      textAnchor={multi ? 'start' : last.x > width - 28 ? 'end' : 'middle'}
                    >
                      {multi ? s.name : yFormat(last.raw.y)}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}
          </Svg>
        </Pressable>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}

export interface BarDatum {
  x: string;
  value: number;
  /** referência (planejado / alvo): desenhada como traço tracejado neutro */
  ref?: number;
}

/** Barras com linha de referência opcional (alvo / planejado). */
export function BarChart({
  data,
  height = 170,
  slot = 0,
  refLabel = 'alvo',
  yFormat = (v: number) => formatNumber(v, 0),
  xFormat = (x: string) => (x.length === 10 ? `${x.slice(8, 10)}/${x.slice(5, 7)}` : x),
  empty = 'Sem dados ainda.',
}: {
  data: BarDatum[];
  height?: number;
  slot?: number;
  refLabel?: string;
  yFormat?: (v: number) => string;
  xFormat?: (x: string) => string;
  empty?: string;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  if (!data.length) return <Text style={{ color: t.muted, fontSize: 14 }}>{empty}</Text>;
  const bscale = niceScale(data.flatMap((d) => [d.value, d.ref ?? 0]), true);
  const hi = bscale.hi;
  const w = Math.max(0, width - PAD.left - 12);
  const h = height - PAD.top - PAD.bottom;
  const slotW = w / data.length;
  const barW = Math.max(4, Math.min(28, slotW - 2)); // ≥ 2px de vão entre barras
  const yAt = (v: number) => PAD.top + h - (v / hi) * h;
  const color = t.series[slot];
  const onTouch = (e: GestureResponderEvent) => {
    const i = Math.floor((e.nativeEvent.locationX - PAD.left) / slotW);
    setSel(Math.max(0, Math.min(data.length - 1, i)));
  };
  const hasRef = data.some((d) => d.ref !== undefined);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {hasRef ? (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: color }]} />
            <Text style={{ color: t.muted, fontSize: 13 }}>feito</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dash, { borderColor: t.reference }]} />
            <Text style={{ color: t.muted, fontSize: 13 }}>{refLabel}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.tooltipRow}>
        {sel !== null ? (
          <Text style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>
            {xFormat(data[sel].x)}: {yFormat(data[sel].value)}
            {data[sel].ref !== undefined ? ` de ${yFormat(data[sel].ref!)} (${refLabel})` : ''}
          </Text>
        ) : (
          <Text style={{ color: t.muted, fontSize: 12 }}>Toque numa barra para ver o valor</Text>
        )}
      </View>
      {width > 0 ? (
        <Pressable onPressIn={onTouch} onTouchMove={onTouch} accessibilityLabel="Gráfico de barras" accessibilityHint="Toque para ver os valores">
          <Svg width={width} height={height}>
            {ticks(bscale).map((v) => (
              <Line key={v} x1={PAD.left} x2={PAD.left + w} y1={yAt(v)} y2={yAt(v)} stroke={t.grid} strokeWidth={1} />
            ))}
            {ticks(bscale).map((v) => (
              <SvgText fontFamily={FONT} key={`l${v}`} x={PAD.left - 6} y={yAt(v) + 4} fontSize={11} fill={t.muted} textAnchor="end">
                {yFormat(v)}
              </SvgText>
            ))}
            {data.map((d, i) => {
              const cx = PAD.left + slotW * i + slotW / 2;
              const top = yAt(d.value);
              const bh = Math.max(0, PAD.top + h - top);
              const r = Math.min(4, barW / 2, bh);
              // topo arredondado (4px), base reta no eixo
              const path =
                bh > 0
                  ? `M${cx - barW / 2},${PAD.top + h} V${top + r} Q${cx - barW / 2},${top} ${cx - barW / 2 + r},${top} H${cx + barW / 2 - r} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + r} V${PAD.top + h} Z`
                  : '';
              return (
                <G key={d.x}>
                  {bh > 0 ? <Path d={path} fill={color} opacity={sel === null || sel === i ? 1 : 0.55} /> : null}
                  {d.ref !== undefined ? (
                    <Line
                      x1={cx - slotW / 2 + 1}
                      x2={cx + slotW / 2 - 1}
                      y1={yAt(d.ref)}
                      y2={yAt(d.ref)}
                      stroke={t.reference}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  ) : null}
                </G>
              );
            })}
            {[0, data.length - 1].filter((i, k, a) => a.indexOf(i) === k).map((i) => (
              <SvgText
                fontFamily={FONT}
                key={`x${i}`}
                x={PAD.left + slotW * i + slotW / 2}
                y={height - 6}
                fontSize={11}
                fill={t.muted}
                textAnchor={i === 0 && data.length > 1 ? 'start' : 'end'}
              >
                {xFormat(data[i].x)}
              </SvgText>
            ))}
            <Rect x={PAD.left} y={PAD.top + h} width={w} height={1} fill={t.separator} />
          </Svg>
        </Pressable>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  dash: { width: 16, height: 0, borderTopWidth: 2, borderStyle: 'dashed' },
  tooltipRow: { minHeight: 20, justifyContent: 'center' },
});
