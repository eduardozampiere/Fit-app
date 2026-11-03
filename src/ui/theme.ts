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
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Alvo de toque mínimo (uso com a mão suja de giz). */
export const TOUCH = 56;
