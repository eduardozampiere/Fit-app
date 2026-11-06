// Tipos de série da tela de treino: aquecimento, normal, até a falha e drop set.

import type { SetLog, SetType } from './types';

export type SetChoice = 'warmup' | SetType;

export interface SetChoiceInfo {
  key: SetChoice;
  label: string;
  /** letra no lugar do número da série; `null` = o número */
  letter: string | null;
  help: string;
}

export const SET_CHOICES: readonly SetChoiceInfo[] = [
  {
    key: 'warmup',
    label: 'Série de aquecimento',
    letter: 'A',
    help: 'Série leve para preparar o corpo. Não conta no volume, nas regras de segurança nem nas análises.',
  },
  { key: 'normal', label: 'Série normal', letter: null, help: 'Série de trabalho, como no plano.' },
  {
    key: 'failure',
    label: 'Série até a falha',
    letter: 'F',
    help: 'Série levada até a falha: não deu para fazer mais nenhuma repetição com boa técnica.',
  },
  {
    key: 'dropset',
    label: 'Drop set',
    letter: 'D',
    help: 'Logo depois de uma série, você reduz a carga e continua sem descansar.',
  },
];

export function choiceOf(s: Pick<SetLog, 'warmup' | 'setType'>): SetChoice {
  return s.warmup ? 'warmup' : s.setType;
}

/** Texto da primeira coluna da tabela: "A", "F", "D" ou o número da série. */
export function setRowLabel(choice: SetChoice, setIndex: number): string {
  return SET_CHOICES.find((c) => c.key === choice)?.letter ?? String(setIndex);
}

/** Aquecimento e drop set não disparam o descanso (a próxima série vem logo). */
export function startsRest(choice: SetChoice): boolean {
  return choice !== 'warmup' && choice !== 'dropset';
}
