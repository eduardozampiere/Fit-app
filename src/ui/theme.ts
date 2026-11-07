import { useColorScheme } from 'react-native';

const light = {
  bg: '#FFFFFF',
  /** Botão secundário, campo, pílula, célula. */
  surface: '#F2F3F5',
  /** Cartão flutuante (alerta, rotina). */
  card: '#FFFFFF',
  separator: '#E4E5E8',
  text: '#111214',
  muted: '#6B7078',
  accent: '#2B7CF6',
  accentText: '#FFFFFF',
  /** Série concluída. */
  done: '#3FAE4F',
  doneBg: '#DDF6CF',
  /** Medalha de recorde (contraste ≥ 3:1 sobre `doneBg`, `card` e `bg`). */
  gold: '#A87700',
  warn: '#B26A00',
  warnBg: '#FFF4E0',
  danger: '#D93025',
  dangerBg: '#FCE8E6',
  // Gráficos: categóricas 1–3 da paleta de referência (validadas para daltonismo, modo claro)
  series: ['#2a78d6', '#eb6834', '#1baf7a'],
  grid: '#ECEDEF',
  reference: '#A3A29C',
  // Sombra do item levantado no arraste
  shadow: '#000000',
};

const dark: typeof light = {
  bg: '#0B0B0C',
  surface: '#28282B',
  card: '#151517',
  separator: '#2E2E31',
  text: '#F2F2F3',
  muted: '#9A9EA6',
  accent: '#3D8BFF',
  accentText: '#FFFFFF',
  done: '#4CC262',
  doneBg: '#1D3320',
  gold: '#F2C14E',
  warn: '#F2B04A',
  warnBg: '#33270F',
  danger: '#FF6B61',
  dangerBg: '#3A1715',
  series: ['#3987e5', '#d95926', '#199e70'],
  grid: '#232326',
  reference: '#6E6D68',
  shadow: '#000000',
};

export type Theme = typeof light;

const themes = { light, dark };

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? themes.dark : themes.light;
}

/** Alvo de toque mínimo dos controles principais (uso com a mão suja de giz). */
export const TOUCH = 56;

/** Escala de texto: tamanho e peso. Cor vem do tema. */
export const font = {
  largeTitle: { fontSize: 28, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '600' },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  label: { fontSize: 13, fontWeight: '500' },
  caption: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { cell: 8, button: 12, card: 16 } as const;
