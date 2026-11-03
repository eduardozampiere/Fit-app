import { useColorScheme } from 'react-native';

const light = {
  bg: '#F4F4F2',
  card: '#FFFFFF',
  text: '#16181D',
  muted: '#5F6470',
  border: '#DADCE0',
  accent: '#1F6FEB',
  accentText: '#FFFFFF',
  success: '#1E8E3E',
  successBg: '#E6F4EA',
  warn: '#B26A00',
  warnBg: '#FFF4E0',
  danger: '#C5221F',
  dangerBg: '#FCE8E6',
  chip: '#ECEDEF',
  // Gráficos: categóricas 1–3 da paleta de referência (validadas para daltonismo, modo claro)
  series: ['#2a78d6', '#eb6834', '#1baf7a'],
  grid: '#E6E6E3',
  reference: '#A3A29C',
};

const dark: typeof light = {
  bg: '#0E0F12',
  card: '#1A1C21',
  text: '#F1F2F4',
  muted: '#A2A7B2',
  border: '#2E3138',
  accent: '#4C8DFF',
  accentText: '#FFFFFF',
  success: '#4CC26E',
  successBg: '#16301F',
  warn: '#F2B04A',
  warnBg: '#33270F',
  danger: '#FF6B61',
  dangerBg: '#3A1715',
  chip: '#262930',
  series: ['#3987e5', '#d95926', '#199e70'],
  grid: '#2B2D33',
  reference: '#6E6D68',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Alvo de toque mínimo (uso com a mão suja de giz). */
export const TOUCH = 56;
