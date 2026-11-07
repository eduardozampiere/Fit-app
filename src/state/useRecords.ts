// Recordes na interface: o livro do histórico inteiro e a faixa de aviso da tela Hoje.

import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listAllSetRows } from '../db/repo';
import type { SetRow } from '../domain/analytics';
import {
  computeRecordBook,
  EMPTY_RECORD_BOOK,
  noticeKey,
  recordNotice,
  type RecordBook,
  type RecordNotice,
  type RecordPrefs,
} from '../domain/records';
import { useAppData } from './AppData';

/**
 * Linhas de todo o histórico e o livro de recordes, recarregados a cada `version`. Mantém o livro
 * anterior enquanto recarrega (a medalha não pisca) e, se o cálculo falhar, devolve o vazio:
 * registrar série nunca depende disto.
 */
export function useRecordBook(): { rows: SetRow[] | null; book: RecordBook; loading: boolean } {
  const db = useSQLiteContext();
  const { version } = useAppData();
  const [rows, setRows] = useState<SetRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    listAllSetRows(db)
      .then((all) => alive && setRows(all))
      // Sem histórico legível, segue sem medalhas (a tela não fica em "Carregando…" para sempre).
      .catch((e) => {
        console.warn('Falha ao ler o histórico para os recordes', e);
        if (alive) setRows((prev) => prev ?? []);
      });
    return () => {
      alive = false;
    };
  }, [db, version]);

  const book = useMemo(() => {
    if (!rows) return EMPTY_RECORD_BOOK;
    try {
      return computeRecordBook(rows);
    } catch (e) {
      console.warn('Falha ao calcular os recordes', e);
      return EMPTY_RECORD_BOOK;
    }
  }, [rows]);

  return { rows, book, loading: rows === null };
}

/**
 * Faixa "Novo recorde" da tela Hoje. A tela avisa antes de gravar quais séries o usuário mexeu
 * (`expectRecords`); quando o livro novo chega, só essas séries podem gerar aviso. Desmarcar, cascata
 * e retroativo nunca avisam. Cada tipo de uma série é avisado uma vez por treino aberto.
 */
export function useRecordNotices(
  book: RecordBook,
  sessionLogId: string | null,
  prefs: RecordPrefs,
): { notice: RecordNotice | null; seq: number; expectRecords: (setIds: readonly string[]) => void; dismiss: () => void } {
  // A faixa guarda o treino em que apareceu: ao trocar de treino ela deixa de valer, sem efeito para limpar.
  const [shown, setShown] = useState<{ notice: RecordNotice; sessionId: string | null } | null>(null);
  const [seq, setSeq] = useState(0);
  const previous = useRef(book);
  const expected = useRef<string[]>([]);
  const announced = useRef(new Set<string>());
  const visible = useRef<RecordNotice | null>(null);
  const lastSession = useRef(sessionLogId);

  // Troca de um treino para outro zera o que foi avisado. Do "ainda sem treino" para o treino recém-criado
  // (o primeiro ✓ cria o log) não zera: a ação do usuário já está esperando o livro novo.
  useEffect(() => {
    const before = lastSession.current;
    lastSession.current = sessionLogId;
    if (before === null || before === sessionLogId) return;
    announced.current = new Set();
    expected.current = [];
    visible.current = null;
  }, [sessionLogId]);

  useEffect(() => {
    const before = previous.current;
    previous.current = book;
    if (before === book || expected.current.length === 0) return;
    const ids = expected.current;
    expected.current = [];
    const next = recordNotice(before, book, ids, announced.current, visible.current);
    if (!next) return;
    // Com o aviso desligado o tipo conta como avisado: religar no meio do treino não mostra faixa velha.
    for (const type of next.types) announced.current.add(noticeKey(next.setId, type));
    if (!prefs.alerts) return;
    visible.current = next;
    setShown({ notice: next, sessionId: sessionLogId });
    setSeq((s) => s + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [book, prefs.alerts, sessionLogId]);

  const expectRecords = useCallback((setIds: readonly string[]) => {
    expected.current = [...expected.current, ...setIds];
  }, []);

  const dismiss = useCallback(() => {
    visible.current = null;
    setShown(null);
  }, []);

  // `sessionId` nulo: a faixa saiu antes de o treino recém-criado chegar à tela; continua valendo.
  const notice = shown && (shown.sessionId === null || shown.sessionId === sessionLogId) ? shown.notice : null;
  return { notice, seq, expectRecords, dismiss };
}
