import type { SQLiteDatabase } from 'expo-sqlite';
import { Alert } from 'react-native';
import { countSets, discardSession, finishSession, lastSetAt } from '../db/repo';
import { formatNumber } from '../domain/format';
import type { SessionLog } from '../domain/types';

/** Pergunta e, se confirmado, apaga o treino e as séries dele. Não dá para desfazer. */
export async function confirmDiscard(db: SQLiteDatabase, log: SessionLog, onDone: () => void): Promise<void> {
  const n = await countSets(db, log.id);
  const what = n === 0 ? 'Nenhuma série foi registrada.' : `${formatNumber(n, 0)} ${n === 1 ? 'série registrada será apagada' : 'séries registradas serão apagadas'}.`;
  Alert.alert('Descartar este treino?', `${what} Não dá para desfazer.`, [
    {
      text: 'Descartar',
      style: 'destructive',
      onPress: async () => {
        await discardSession(db, log.id);
        onDone();
      },
    },
    { text: 'Voltar', style: 'cancel' },
  ]);
}

/**
 * Treino esquecido aberto: pergunta se ainda vale. Concluir usa a hora da última série como fim (e não
 * "agora"), para a duração não incluir as horas em que ele ficou parado.
 */
export function askStillTraining(db: SQLiteDatabase, log: SessionLog, hours: number, onDone: () => void, onContinue: () => void): void {
  Alert.alert('Ainda treinando?', `Este treino está aberto há ${formatNumber(hours, 0)} h.`, [
    { text: 'Continuar', onPress: onContinue },
    {
      text: 'Concluir',
      onPress: async () => {
        await finishSession(db, log.id, (await lastSetAt(db, log.id)) ?? undefined);
        onDone();
      },
    },
    { text: 'Descartar', style: 'destructive', onPress: () => void confirmDiscard(db, log, onDone) },
  ]);
}
