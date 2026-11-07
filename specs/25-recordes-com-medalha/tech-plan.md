# 25 — Recordes com medalha: avisar na hora e marcar a série que bateu · Plano técnico

> **Técnico: como.** Dono: `tech-planner` (`/planejar`). Implementa o [pbi.md](pbi.md) sem mudar o escopo;
> mudança de escopo volta para o `/pm`. O dev (`/dev`) marca os passos e registra desvios no Andamento.

**Status:** 🚧 25a implementada (passos 1–12 e 14); falta o passo 13 no iPhone (a 25b será planejada depois do PBI 24, ver "Fatia 25b")

## Abordagem
Os recordes são **derivados do histórico a cada leitura**, nunca gravados: uma função pura nova,
`computeRecordBook(rows)` em `src/domain/records.ts`, percorre as séries elegíveis de cada exercício em ordem
cronológica e devolve, por série, os tipos de recorde que ela bateu (com o valor anterior, a data e se ainda é o
recorde atual) e, por exercício, o melhor valor de cada tipo. A lista "Recordes pessoais" (`personalRecords`) passa
a ser montada pela mesma função, então lista e medalhas não discordam. Não há migração nem dado novo no backup: só
dois ajustes (`getSetting`/`setSetting`) e três campos a mais na linha achatada `SetRow` (id, tipo e hora da série,
que já estão no banco). Um hook novo (`src/state/useRecords.ts`) carrega o histórico a cada `version`, calcula o
livro de recordes fora do caminho do ✓ e decide a faixa de aviso por diferença entre o livro anterior e o novo,
limitada às séries em que o usuário mexeu. Telas que mudam: Hoje (medalha na tabela, faixa e folha), Exercício (histórico e lista) e Ajustes (seção "Recordes").

## Decisões técnicas
- **Recorde derivado, recalculado inteiro a cada `version`** — retroativo (CP14), cascata (CP15), desmarcar/editar/
  trocar tipo (CP10) e backup restaurado (CP23) saem de graça, sem regra de sincronização. O custo é O(n log n) sobre
  as séries de trabalho (centenas a poucos milhares), medido no passo 3 (CP24). Descartado: gravar a medalha na
  série (o PBI já descartou) e recálculo incremental por exercício (complexidade sem ganho medido; fica como
  mitigação se o passo 13 mostrar lentidão no iPhone).
- **Fonte das linhas: `listAllSetRows` (já usada pela tela do exercício e pelas Análises)** — já exclui
  aquecimento (`s.warmup = 0` em `listLoggedSessions`), traz `kind` do item do plano e cobre todos os ciclos e os
  treinos importados. Descartado: consulta SQL nova só para recordes (duplicaria o achatamento e perderia o `kind`
  usado na elegibilidade antes do PBI 19).
- **`SetRow` ganha `setId`, `setType` e `doneAt`** (preenchidos em `flattenSets`) — a medalha precisa de uma chave
  estável por série (`setIndex` repete entre itens do mesmo exercício, ex.: `supino-competicao-pausa` é principal e
  variação), o tipo é o ponto de extensão do PBI 19 e `doneAt` dá a ordem "no mesmo dia, pela hora do primeiro
  registro". Um conceito, um tipo: não se cria um segundo formato de linha.
- **Ordem cronológica**: treinos por `(date, menor doneAt do treino, sessionLogId)`; séries dentro do treino por
  `(doneAt, setIndex, setId)`. "Empate dentro do treino: fica na primeira" usa essa ordem. "Treino feito conforme o
  plano" grava várias séries com o mesmo `doneAt`; o desempate por `setIndex` resolve.
- **Elegibilidade numa função só, `countsForRecords`, com duas tabelas exaustivas**: `RECORD_KIND_COUNTS:
  Record<ItemKind, boolean>` (antes do PBI 19: `activation_single`, `walkout`, `backoff`, `volume_doubles` = `false`;
  `main`, `variation`, `accessory`, `core` = `true`; `kind` nulo, de treino importado ou avulso = conta) e
  `RECORD_SET_TYPE_COUNTS: Record<SetType, boolean>` (`normal`, `failure`, `dropset` = `true`). Mais: não `failed`,
  `loadKg > 0`, `reps ≥ 1`. **Ponto de extensão do PBI 19 (CP11, CP12):** quando `SetType` ganhar `single`,
  `backoff`, `walkout`, o `Record<SetType, boolean>` deixa de compilar até alguém preencher (`backoff: true`,
  `single: false`, `walkout: false`); a tabela por `kind` some quando os itens à parte deixarem de existir.
- **Valores comparados são os que o usuário vê**: Maior peso = `loadKg`; Volume de série = `loadKg × reps`
  arredondado a 2 casas (evita "recorde" por erro de ponto flutuante, ex.: 34,05 × 2 contra 22,7 × 3); Maior 1RM =
  `epley1rm` (inteiro); Maior 1RM com RPE = `e1rmWithAssumedRpe` (1 casa). Comparação estrita (`>`).
- **Uma função única para o e1RM com RPE assumido, em `src/domain/rpe.ts`**: `e1rmWithAssumedRpe(loadKg, reps,
  rpe)` = `e1rm(loadKg, reps, rpe ?? ASSUMED_RPE)` com `ASSUMED_RPE = 10`, devolvendo também o RPE usado e se foi
  assumido. Hoje não existe (o `bestE1rm` e o `e1rmSeries` **ignoram** série sem RPE); o PBI 22 deve reutilizar esta.
  RPE informado fora da tabela RTS (abaixo de 6, ou que não seja múltiplo de 0,5, possível em importação) dá "sem
  valor" (`null`), igual ao `e1rm` atual, e não vira RPE 10 (ver Perguntas, Q2).
- **`epley1rm` muda de `exerciseStats.ts` para `rpe.ts`** (dono das estimativas de 1RM, como diz a tabela DRY) —
  `records.ts` precisa dela e `exerciseStats.ts` vai importar `records.ts`; deixá-la em `exerciseStats.ts` criaria
  importação circular. Sem reexportação: os dois usos (`exerciseStats.ts` e o teste) passam a importar de `rpe.ts`.
- **A faixa decide por diferença, só para as séries da ação do usuário** — a tela registra a "intenção" com os ids
  das séries que o usuário marcou/editou/trocou o tipo/mudou o RPE (`expectRecords(ids)`) antes de gravar; quando o
  livro novo chega, `recordNotice` compara os tipos dessas séries no livro anterior e no novo e tira os já avisados
  neste treino aberto (`announced`, chave `setId:tipo`, em memória, zerado quando muda o `sessionLogId`). Assim a
  medalha que "volta" para outra série ao desmarcar, a cascata e o retroativo nunca avisam (CP10, CP14, CP15), e
  trocar o RPE de 8 para 9 e de volta não reavisa (CP4c). Para ter o id da série recém-marcada, `insertSets` passa
  a devolver os ids que gerou.
- **Preferências no `AppData`** (`recordPrefs`, chave `records-prefs`, `{ medals: true, alerts: true }`), como
  `gym` e `targets` — valem na hora nas três telas sem reabrir o app (CP19). Padrão e normalização em
  `records.ts` (`DEFAULT_RECORD_PREFS`, `normalizeRecordPrefs`: `alerts` efetivo = `medals && alerts`).
- **Vibração: `expo-haptics` já instalado (~58.0.7, Apple ID gratuito, sem entitlement)** — `Haptics.impactAsync(
  Haptics.ImpactFeedbackStyle.Medium).catch(() => {})`, a mesma chamada já usada em `DragList.tsx`; o fim do
  descanso usa `notificationAsync(Success)` em `RestTimer.tsx`, então as duas sensações são distintas. Nenhum pacote
  novo; `ios.entitlements` não muda.
- **"Reduzir movimento" e leitor de tela com a API do React Native** (`AccessibilityInfo.isReduceMotionEnabled`,
  evento `reduceMotionChanged`, `AccessibilityInfo.announceForAccessibility`). Animação com `Animated` e gesto com
  `PanResponder`, como `SwipeToDelete.tsx` e `BottomSheet` (sem reanimated, que o projeto não usa).
- **Ícone da medalha: Ionicons `medal`** (existe no glyphmap instalado), cor nova do tema `t.gold` com contraste
  ≥ 3:1 contra `doneBg` (fundo da linha concluída) e contra `card`/`bg` (histórico). Sugestão a conferir no passo 8:
  claro `#A87700` (≈ 3,4:1 sobre `#DDF6CF`), escuro `#F2C14E` (≈ 7,8:1 sobre `#1D3320`).
- **Textos da interface montados no domínio** (`records.ts`, com `formatKg`/`formatNumber`/`formatDate`) — faixa,
  folha, rótulos do leitor de tela, legenda "calculado com RPE 8"
  ficam testáveis e iguais nas três telas.
- **Folha aberta dentro da tela do exercício não mostra "Ver recordes do exercício"** (já se está nela); na tela Hoje
  mostra. Prop opcional `onOpenExercise`.

## Passos (commits pequenos, testes verdes a cada um)

### Fatia 25a

- [x] **1. Domínio: estimativas de 1RM num lugar só** — `src/domain/rpe.ts`:
  - mover `epley1rm(loadKg: number, reps: number): number` de `src/domain/exerciseStats.ts` para cá (mesmo corpo);
    atualizar o import em `exerciseStats.ts` e em `src/domain/__tests__/exercise-stats.test.ts`.
  - nova `export const ASSUMED_RPE = 10;`
  - nova `export function e1rmWithAssumedRpe(loadKg: number, reps: number, rpe: number | null): { kg: number; rpe: number; assumed: boolean } | null`
    (reaproveita `e1rm`; `null` fora da tabela: reps fora de 1–10, RPE inválido, carga ≤ 0).
  Atende: CP3, CP4, CP21. Pronto quando: casos de `e1rmWithAssumedRpe` e `epley1rm` da seção Testes passam.

- [x] **2. Domínio: `SetRow` com id, tipo e hora** — `src/domain/analytics.ts`: acrescentar a `SetRow`
  `setId: string`, `setType: SetType`, `doneAt: string`; `flattenSets` preenche com `s.id`, `s.setType`, `s.doneAt`.
  Atualizar o helper `row()` de `src/domain/__tests__/exercise-stats.test.ts` com padrões (`setId: \`id${n}\``,
  `setType: 'normal'`, `doneAt: '2026-11-02T10:00:00.000Z'`). Conferir com `npm run typecheck` que nenhum outro
  construtor de `SetRow` quebrou (hoje só `flattenSets` e o helper do teste; `workoutsCsv` lista colunas explícitas,
  então o CSV não muda).
  Atende: CP9, CP14, CP23 (o formato exportado não muda). Pronto quando: `npm test` e `npm run typecheck` verdes.

- [x] **3. Domínio: livro de recordes** — novo `src/domain/records.ts`:
  ```ts
  export type RecordType = 'maxLoad' | 'setVolume' | 'oneRm' | 'oneRmRpe';
  export const RECORD_TYPES: readonly RecordType[] = ['maxLoad', 'setVolume', 'oneRm', 'oneRmRpe'];
  export const RECORD_LABEL: Record<RecordType, string>; // 'Maior peso', 'Maior volume de série', 'Maior 1RM', 'Maior 1RM com RPE'
  export const RECORD_KIND_COUNTS: Record<ItemKind, boolean>;
  export const RECORD_SET_TYPE_COUNTS: Record<SetType, boolean>;
  export type RecordInput = Pick<SetRow, 'setId' | 'sessionLogId' | 'exerciseId' | 'exerciseName' | 'date' | 'doneAt' | 'setIndex' | 'loadKg' | 'reps' | 'rpe' | 'failed' | 'kind' | 'setType'>;
  export function countsForRecords(s: Pick<SetRow, 'failed' | 'loadKg' | 'reps' | 'kind' | 'setType'>): boolean;
  export interface RecordValue { value: number; rpe: number | null; rpeAssumed: boolean } // rpe só no oneRmRpe
  export function recordValue(type: RecordType, s: Pick<SetRow, 'loadKg' | 'reps' | 'rpe'>): RecordValue | null;
  export interface RecordRef { setId: string; sessionLogId: string; date: string; value: number }
  export interface RecordHit { type: RecordType; value: RecordValue; previous: RecordRef; supersededBy: RecordRef | null; current: boolean }
  export interface SetRecords { set: RecordInput; hits: RecordHit[] } // hits na ordem de RECORD_TYPES
  export interface RecordHolder { set: RecordInput; value: RecordValue; hasMedal: boolean; current: true }
  export interface RecordBook {
    bySet: ReadonlyMap<string, SetRecords>;                              // só séries com pelo menos um hit
    best: ReadonlyMap<string, Record<RecordType, RecordHolder | null>>;  // por exerciseId
  }
  export const EMPTY_RECORD_BOOK: RecordBook;
  export function computeRecordBook(rows: readonly RecordInput[]): RecordBook;
  export function recordTypesOf(book: RecordBook, setId: string): RecordType[];
  ```
  Algoritmo de `computeRecordBook` (documentar no comentário da função):
  1. filtrar `countsForRecords`; agrupar por `exerciseId`, depois por `sessionLogId`;
  2. ordenar os treinos de cada exercício por `(date, menor doneAt, sessionLogId)` e as séries por
     `(doneAt, setIndex, setId)`;
  3. para cada tipo, manter o melhor anterior (`RecordRef` + série). Em cada treino: a melhor série do treino
     para o tipo (primeira em caso de empate, ignorando séries sem valor, ex.: 11 reps no `oneRmRpe`); se existe
     anterior **e** o valor é estritamente maior, a série ganha `RecordHit` com `previous` = anterior; depois do
     treino, o melhor anterior passa a ser o melhor do treino se for estritamente maior ou se não havia anterior;
  4. ao final, para cada tipo, encadear `supersededBy` (o hit seguinte do mesmo tipo e exercício) e `current = true`
     só no último hit; `best[tipo]` = o melhor anterior final, com `hasMedal` = se essa série tem hit desse tipo.
  Nada de React, expo ou SQLite; `try/catch` fica no hook (passo 7), não aqui.
  Atende: CP1–CP4, CP6–CP10, CP13–CP15, CP18, CP20, CP21, CP24 (parte de domínio); ponto de extensão de CP11/CP12.
  Pronto quando: os casos de `countsForRecords`, `recordValue` e `computeRecordBook` da seção Testes passam,
  inclusive o de 500 séries.

- [x] **4. Domínio: aviso e textos** — em `src/domain/records.ts`:
  ```ts
  export interface RecordNotice { setId: string; types: RecordType[] }
  export const noticeKey = (setId: string, type: RecordType) => `${setId}:${type}`;
  /** Tipos que as séries da ação ganharam (antes → depois), sem os já avisados. `visible` = faixa ainda na tela. */
  export function recordNotice(
    before: RecordBook, after: RecordBook, actingIds: readonly string[],
    announced: ReadonlySet<string>, visible: RecordNotice | null,
  ): RecordNotice | null;
  export interface RecordPrefs { medals: boolean; alerts: boolean }
  export const DEFAULT_RECORD_PREFS: RecordPrefs; // { medals: true, alerts: true }
  export function normalizeRecordPrefs(p: Partial<RecordPrefs> | null): RecordPrefs; // alerts só com medals
  export function recordValueText(type: RecordType, v: RecordValue): string;           // "140 kg", "123,3 kg", "420 kg"
  export function recordBannerText(notice: RecordNotice, book: RecordBook): { title: string; line: string; a11y: string };
  export function medalA11yLabel(types: readonly RecordType[]): string;
  export function recordSheetTitle(hits: readonly RecordHit[]): string;               // "Recorde" | "Recordes desta série"
  export function recordSetSubtitle(set: RecordInput): string;                         // "série 3 · 140 kg × 3 · 05 nov"
  export function hitBeforeText(hit: RecordHit): string;                               // "antes: 135 kg em 28 out"
  export function hitBadgeText(hit: RecordHit): string;                                // "Recorde atual" | "Superado em 12 nov"
  export function hitCaption(hit: RecordHit, set: RecordInput): string | null;
  //  oneRm: "estimado, sem RPE: 100 kg × 5"; oneRmRpe: "calculado com RPE 8" | "RPE não informado: calculado como RPE 10 (esforço máximo)";
  //  setVolume: "140 kg × 3"; maxLoad: null
  ```
  Regras de `recordNotice`: para cada id de `actingIds`, `ganhos = tipos(after) − tipos(before) − announced`; sem
  ganho em nenhum, `null`. Se houver mais de uma série com ganho (lote "conforme o plano"), fica a última na ordem de
  `actingIds` (uma faixa por vez, substituindo). Se `visible?.setId` é a mesma série, `types` = todos os tipos atuais
  dela (faixa única, CP4b a); senão, só os ganhos. Quem chama acrescenta os `ganhos` a `announced`.
  Textos da faixa: um tipo → título "Novo recorde", linha "Maior peso: 140 kg · antes 135 kg"; vários → "Novos
  recordes (3)", linha "Maior peso · Maior volume de série · Maior 1RM com RPE". `a11y` = "Novo recorde. Maior peso:
  140 quilos, antes 135 quilos" (troca " kg" por " quilos"). `medalA11yLabel`: "Recorde: maior peso. Abrir
  detalhes." / "Recordes: maior peso, maior volume de série e maior 1RM com RPE. Abrir detalhes." (só a primeira
  letra minúscula, para não virar "1rm").
  Atende: CP1, CP4b, CP4c, CP4d, CP5, CP10, CP13, CP15, CP16, CP17 (substituição), CP19 (normalização), CP22 (rótulos).
  Pronto quando: os casos de `recordNotice`, `normalizeRecordPrefs` e dos textos passam.

- [x] **5. Domínio: lista "Recordes pessoais" pela mesma regra** — `src/domain/exerciseStats.ts`:
  - novo tipo de retorno:
    ```ts
    export interface PersonalRecords {
      maxLoad: RecordHolder | null; oneRm: RecordHolder | null; oneRmRpe: RecordHolder | null; setVolume: RecordHolder | null;
      bestSessionVolume: { kg: number; date: string } | null;
      byReps: { reps: number; kg: number; date: string }[];
    }
    export function personalRecords(rows: readonly SetRow[], maxRepRows = 15): PersonalRecords;
    ```
    Os quatro tipos vêm de `computeRecordBook(rows).best` do exercício (as linhas já chegam filtradas por
    `exerciseRows`); `bestSessionVolume` e `byReps` passam a usar `countsForRecords` no lugar do `counts` local
    (a lista inteira segue a mesma elegibilidade da medalha). Remover `Record1` e os campos `best1rm`/`bestSetVolume`.
  - `exerciseSeries` (gráfico) continua com o `counts` atual, renomeado para `hasLoadAndReps` e exportado; o
    `countsForRecords` o reaproveita (uma regra de "tem carga e repetições").
  Atende: CP4d (duas linhas), CP18, CP21. Pronto quando: o teste "recordes pessoais" atualizado e os novos passam.

- [x] **6. Banco: id da série gravada** — `src/db/repo.ts`: `insertSets(db, sessionLogId, drafts): Promise<string[]>`
  devolve os ids gerados por `newId()` na ordem dos drafts (quem ignora o retorno não muda). **Sem migração**
  (`DATABASE_VERSION` continua 6) e nada em `TABLES` de `src/db/dataRepo.ts`.
  Atende: CP1 (faixa da série recém-marcada), CP23. Pronto quando: `npm run typecheck` verde.

- [x] **7. Estado: preferências e hooks** —
  - `src/state/AppData.tsx`: `recordPrefs: RecordPrefs` e `setRecordPrefs(p: RecordPrefs): Promise<void>`; carga
    no mesmo `useEffect` de `gym`/`targets` com `normalizeRecordPrefs(await getSetting(db, 'records-prefs', null))`;
    gravação com `setSetting(db, 'records-prefs', p)`.
  - novo `src/state/useRecords.ts`:
    ```ts
    /** Linhas de todo o histórico e o livro de recordes, recarregados a cada `version`. Mantém o livro anterior
     *  enquanto recarrega (a medalha não pisca) e, se o cálculo falhar, devolve o vazio (o registro nunca para). */
    export function useRecordBook(): { rows: SetRow[] | null; book: RecordBook; loading: boolean };
    /** Faixa da tela Hoje: intenção da ação, avisados do treino aberto, vibração. */
    export function useRecordNotices(book: RecordBook, sessionLogId: string | null, prefs: RecordPrefs): {
      notice: RecordNotice | null; seq: number; expectRecords: (setIds: readonly string[]) => void; dismiss: () => void;
    };
    ```
    `useRecordBook`: `listAllSetRows(db)` no `useEffect` com `[db, version]` (padrão `alive` da tela do exercício);
    `computeRecordBook` em `useMemo([rows])` dentro de `try/catch` (erro → `EMPTY_RECORD_BOOK` e `console.warn`).
    `useRecordNotices`: guarda em `useRef` o livro anterior, os ids esperados e `announced`; zera `announced` quando
    `sessionLogId` muda (comparação no render com estado "último id", como o `lastNav` da tela Hoje, sem `setState`
    síncrono em `useEffect`); quando chega um `book` novo com ids esperados, chama `recordNotice`, limpa os ids e,
    se `prefs.alerts` e houver aviso, publica `notice` (incrementa `seq`), soma os tipos a `announced` e vibra
    (`Haptics.impactAsync(Medium)`). Com `prefs.alerts` falso, não publica nem vibra, mas **marca como avisado**
    (religar o aviso no meio do treino não dispara faixa velha). Detecção de "livro novo" pela identidade do objeto
    (`book !== prevRef.current`), feita no corpo de um `useEffect` que só chama `setState` dentro da condição.
  - A tela do exercício troca o seu `listAllSetRows` pelo `useRecordBook` (uma leitura só).
  Atende: CP1 (sem atrasar o ✓), CP4b, CP4c, CP10, CP14, CP15, CP19, CP23, CP24. Pronto quando: typecheck e lint
  verdes; prévia web mostra as medalhas depois de marcar uma série (com os passos 8 a 10).

- [x] **8. Tema e componentes** —
  - `src/ui/theme.ts`: `gold` nos temas claro e escuro (valores sugeridos nas Decisões; conferir 3:1 contra
    `doneBg`, `card` e `bg`).
  - novo `src/components/RecordMedal.tsx`: `RecordMedal({ types, onPress, size? }: { types: readonly RecordType[]; onPress: () => void; size?: number })`
    — `Pressable` com Ionicons `medal` (`t.gold`), número pequeno ao lado quando `types.length ≥ 2`,
    `accessibilityRole="button"`, `accessibilityLabel={medalA11yLabel(types)}`, `hitSlop` para chegar a 44 pt sem
    ocupar 44 pt de largura visual (ícone ~20 pt), `maxFontSizeMultiplier` no número para não empurrar o KG.
  - novo `src/components/RecordSheet.tsx`: `RecordSheet({ records, onOpenExercise, onClose }: { records: SetRecords; onOpenExercise?: () => void; onClose: () => void })`
    — `BottomSheet` (sem Cancelar) com título `recordSheetTitle`, subtítulo `exerciseName` + `recordSetSubtitle`, uma
    linha por hit (nome, `recordValueText`, `hitCaption`, `hitBeforeText`, selo `hitBadgeText` com `Badge` de
    `ui.tsx`: `success` para "Recorde atual", `neutral` para "Superado") e, se `onOpenExercise`, `BigButton`
    "Ver recordes do exercício".
  - novo `src/components/RecordBanner.tsx`: `RecordBanner({ text, seq, onPress, onDismiss }: { text: { title: string; line: string; a11y: string }; seq: number; onPress: () => void; onDismiss: () => void })`
    — `Animated.View` absoluto no topo (`top: insets.top + space.sm`), dentro de um `View` com
    `pointerEvents="box-none"` e `StyleSheet.absoluteFill`, então nada fora da faixa é bloqueado; some em 5 s
    (`setTimeout` num `useEffect` com `[seq]`, que chama `onDismiss`); deslizar para o lado dispensa (`PanResponder`
    como `SwipeToDelete`); toque abre a folha; entrada animada só se `isReduceMotionEnabled` for falso;
    `announceForAccessibility(text.a11y)` a cada `seq`; `accessibilityLiveRegion="polite"`. Cores do tema
    (`card`, borda `gold`, ícone `medal`). Remontado com `key={seq}` pelo pai.
  - `src/components/ui.tsx`: novo `SwitchRow({ title, help, value, disabled, onChange }: { title: string; help?: string; value: boolean; disabled?: boolean; onChange: (v: boolean) => void })`
    — `Switch` do React Native com cores do tema, linha ≥ `TOUCH`, `accessibilityLabel` = título, estado desabilitado
    acinzentado (usado duas vezes em Ajustes).
  Atende: CP5, CP16, CP17, CP19, CP22. Pronto quando: typecheck e lint verdes; peças conferidas na prévia web.

- [x] **9. Tabela de séries com medalha** —
  - `src/components/SetTable.tsx`: novas props opcionais `recordTypesOf?: (log: SetLog) => readonly RecordType[]` e
    `onRecord?: (log: SetLog) => void`; repassadas a `SetRow`, que renderiza `RecordMedal` entre o texto do plano e o
    campo KG quando `log` existe e há tipos. O texto do plano já é `flex: 1` com `numberOfLines={1}`, então encolhe
    antes da medalha (CP22); a medalha não leva `flex`. Linhas de aquecimento e a linha "S" do single não recebem a
    prop (sem medalha, CP9). Incluir os tipos na `key` da linha **não** é necessário (a medalha não é estado inicial).
  - `src/components/ExerciseCard.tsx`: repassa `recordTypesOf`/`onRecord` ao `SetTable`.
  Atende: CP1, CP5, CP8, CP9, CP10, CP22. Pronto quando: prévia web mostra a medalha e o número.

- [x] **10. Tela Hoje** — `src/app/(tabs)/index.tsx`:
  - `const { book } = useRecordBook();` `const { recordPrefs } = useAppData();`
    `const notices = useRecordNotices(book, sessionLog?.id ?? null, recordPrefs);`
    `const [recordSheet, setRecordSheet] = useState<string | null>(null)` (setId).
  - intenção antes de gravar: `checkSet` usa o retorno de `insertSets` e chama `notices.expectRecords(ids)`;
    `allAsPlanned` e `sessionAsPlanned` idem com os ids do lote; `editSet`, `setRpe`, `saveEditor` (série existente)
    e `chooseSetType` (série registrada que muda de tipo ou volta de aquecimento para trabalho) chamam
    `expectRecords([log.id])`. `uncheckSet` e `removeSet` não chamam (desmarcar nunca avisa).
  - `cardProps`: `recordTypesOf: recordPrefs.medals ? (l) => recordTypesOf(book, l.id) : undefined`,
    `onRecord: (l) => setRecordSheet(l.id)`.
  - faixa: `{recordPrefs.alerts && notices.notice ? <RecordBanner key={notices.seq} … onPress={() => setRecordSheet(notices.notice.setId)} onDismiss={notices.dismiss} /> : null}`
    como último filho da `SafeAreaView` (por cima do cabeçalho, sem empurrar a tabela; o cartão do descanso fica no
    `FloatingBars`, embaixo, e não é coberto).
  - folha: `recordSheet && book.bySet.get(recordSheet)` → `RecordSheet` com
    `onOpenExercise={() => router.push({ pathname: '/exercicio', params: { id, name } })}`.
  Atende: CP1–CP10, CP16, CP17, CP19, CP20, CP24. Pronto quando: roteiro da prévia web (passo 13) passa.

- [x] **11. Tela do exercício** — `src/app/exercicio.tsx`:
  - usar `useRecordBook()` (substitui o `useEffect` com `listAllSetRows`); `rows` = `exerciseRows(rows, id)`.
  - aba Histórico: chave da linha passa a `x.setId`; com `recordPrefs.medals` e tipos na série, `RecordMedal` à
    direita do texto "140 kg × 3 · RPE 8" (antes do "falhou"); toque abre `RecordSheet` sem `onOpenExercise`.
  - aba Resumo, seção "Recordes pessoais": cinco `ListRow` na ordem do PBI — "Maior peso" (valor, subtítulo
    "05 nov · 140 kg × 3"), "Maior 1RM" (subtítulo "05 nov · 100 kg × 5 · estimado, sem RPE"), "Maior 1RM com RPE"
    ("estimado, com RPE 8" ou "estimado, RPE não informado (como RPE 10)"; sem série de 1–10 reps: valor "—"),
    "Maior volume de série" (valor "420 kg", subtítulo "05 nov · 140 kg × 3"), "Maior volume de sessão" (sem
    medalha). `onPress` só quando `holder.hasMedal` (abre a folha da série). Texto de ajuda "A medalha marca as
    séries que superaram todos os treinos anteriores." Sem séries: "Sem séries com carga e repetições." (igual).
    Os subtítulos saem de uma função de texto do domínio (`holderSubtitle(type, holder)` em `records.ts`, com teste).
  - "Recordes por repetições" continua (agora com a elegibilidade do passo 5).
  Atende: CP4d, CP13, CP14, CP16, CP18, CP19, CP21. Pronto quando: prévia web mostra a lista e as medalhas do histórico.

- [x] **12. Ajustes → "Recordes"** — `src/app/ajustes.tsx`: `SectionTitle` "Recordes" + `Card` com dois `SwitchRow`:
  "Mostrar medalhas nas séries" (ajuda "Marca com uma medalha a série que bateu um recorde do exercício.") e
  "Avisar ao bater um recorde" (ajuda "Mostra uma faixa e vibra por um instante. Não toca som.", `disabled` com
  medalhas desligadas, mostrando `value` falso). Gravam por `setRecordPrefs` do `AppData`. Colocar depois de
  "Cronômetro de descanso".
  Atende: CP19. Pronto quando: alternar na prévia web muda Hoje e Exercício sem recarregar, e a escolha volta ao reabrir.

### Fechamento

- [ ] **13. Verificação** — `npm test && npm run test:import && npm run typecheck && npx expo lint`; `npx expo
  config --type introspect` e conferir `ios.entitlements` = `{}` (nenhum pacote novo, mas o PBI exige). Prévia web
  (`npx expo export --platform web` servido com COEP/COOP, ver CONTEXTO.md) com tema claro e escuro: passos 2 a 9 e
  7b do roteiro do PBI no que a web permite (sem vibração e sem VoiceOver). iPhone (sessão local no Mac,
  `npm run iphone`): roteiro inteiro do PBI, e medir o CP24 com os dados reais (contar as séries do exercício mais
  registrado; se tiver menos de 500, registrar isso no Andamento e repetir o teste de 500 do domínio).
- [x] **14. Docs** — `pbi.md` (status, Andamento com o que foi entregue e o que ficou para depois do PBI 19),
  este arquivo (passos marcados, Andamento), `specs/PLANO.md` (linha 25 e ordem), `specs/CONTEXTO.md` (decisão
  "recordes são derivados do histórico; nada gravado"). `docs/`: nenhum formato muda (ciclo, ajustes e backup iguais).
  Um commit, no branch `claude/chat-conversations-access-x7i6nh`.

## Fatia 25b (fora deste plano)
O resumo ao concluir o treino (CP25: "Você bateu N recordes neste treino." e a folha "Recordes do treino") depende
do PBI 24 e será planejado depois dele, como replanejamento deste arquivo. O que esta fatia deixa pronto para ela:
o livro de recordes (`computeRecordBook`, passo 3) já dá os hits por série de um treino, e os textos e a folha de
série (passos 4 e 8) são reaproveitáveis. Nenhum passo da 25a depende da 25b.

## Arquivos
| Arquivo | Novo/alterado | O que muda |
|---|---|---|
| `src/domain/rpe.ts` | alterado | recebe `epley1rm`; novos `ASSUMED_RPE` e `e1rmWithAssumedRpe` |
| `src/domain/analytics.ts` | alterado | `SetRow` com `setId`, `setType`, `doneAt`; `flattenSets` os preenche |
| `src/domain/records.ts` | novo | tipos, elegibilidade, valores, `computeRecordBook`, `recordNotice`, preferências, textos |
| `src/domain/exerciseStats.ts` | alterado | `epley1rm` sai; `hasLoadAndReps` exportado; `personalRecords` com os quatro tipos via `computeRecordBook` e elegibilidade única |
| `src/domain/__tests__/records.test.ts` | novo | testes dos passos 1, 3, 4 |
| `src/domain/__tests__/exercise-stats.test.ts` | alterado | import de `epley1rm`, helper `row()` com campos novos, "recordes pessoais" no formato novo |
| `src/domain/__tests__/domain.test.ts` | alterado | só se o dev preferir pôr aqui os casos de `e1rmWithAssumedRpe` (padrão: `records.test.ts`) |
| `src/db/repo.ts` | alterado | `insertSets` devolve `string[]` |
| `src/state/AppData.tsx` | alterado | `recordPrefs`/`setRecordPrefs` (chave `records-prefs`) |
| `src/state/useRecords.ts` | novo | `useRecordBook`, `useRecordNotices` |
| `src/ui/theme.ts` | alterado | cor `gold` nos dois temas |
| `src/components/ui.tsx` | alterado | `SwitchRow` |
| `src/components/RecordMedal.tsx` | novo | medalha com contador e rótulo |
| `src/components/RecordSheet.tsx` | novo | folha de detalhes da série |
| `src/components/RecordBanner.tsx` | novo | faixa "Novo recorde" (5 s, deslizar, anúncio, reduzir movimento) |
| `src/components/SetTable.tsx` | alterado | props `recordTypesOf`/`onRecord`; medalha na linha de trabalho |
| `src/components/ExerciseCard.tsx` | alterado | repassa as duas props |
| `src/app/(tabs)/index.tsx` | alterado | livro, intenção nas ações, faixa, folha |
| `src/app/exercicio.tsx` | alterado | `useRecordBook`, medalha no histórico, lista com cinco linhas |
| `src/app/ajustes.tsx` | alterado | seção "Recordes" com dois interruptores |
| `specs/25-recordes-com-medalha/pbi.md`, este arquivo, `specs/PLANO.md`, `specs/CONTEXTO.md` | alterado | status e decisões (passo 14) |

## Dados
- **Migração: nenhuma.** `DATABASE_VERSION` continua 6; `set_logs` já tem `id`, `set_type`, `done_at`, `warmup`,
  `failed`, que é tudo o que o cálculo usa.
- **Ajuste novo:** `settings['records-prefs']` = `{"medals": true, "alerts": true}`; ausente = padrão ligado. É uma
  linha da tabela `settings`, que já vai no backup (`fitapp.backup/v1`) como as outras preferências; restaurar um
  backup antigo (sem a chave) volta ao padrão.
- **Backup, exportação CSV/JSON, pacote do Claude, formatos `fitapp.cycle/v1` e `fitapp.adjustments/v1`: sem
  mudança.** As medalhas não são gravadas; um backup restaurado reproduz as mesmas medalhas porque o cálculo é o
  mesmo sobre as mesmas séries (CP23). `SetRow` ganha campos, mas `workoutsCsv` escreve colunas explícitas.
- **Importados (Hevy, planilha):** entram pelo `listAllSetRows` com `kind` nulo (contam) e `set_type` padrão
  `normal`; ordem pela data do treino e hora de registro.

## Testes
Arquivo `src/domain/__tests__/records.test.ts`, com um helper `row(p: Partial<SetRow>)` igual ao de
`exercise-stats.test.ts` (padrões: exercício `supino`, `kind: 'main'`, `setType: 'normal'`, `failed: false`,
`rpe: null`, `doneAt` crescente por chamada). "s1, s2…" = treinos em datas crescentes.

| Função | Caso | Entrada → esperado |
|---|---|---|
| `epley1rm` | conta de hoje | (100, 1) → 100; (100, 5) → 117; (110, 3) → 121; (100, 8) → 127 |
| `e1rmWithAssumedRpe` | com RPE | (100, 5, 8) → `{ kg: 123.3, rpe: 8, assumed: false }` |
| `e1rmWithAssumedRpe` | sem RPE | (100, 5, null) → `{ kg: 115.9, rpe: 10, assumed: true }` |
| `e1rmWithAssumedRpe` | borda: fora da tabela | (100, 11, null) → `null`; (100, 5, 5.5) → `null`; (0, 5, 8) → `null` |
| `countsForRecords` | tipos que contam | `normal`, `failure`, `dropset` com `kind: 'main'` → `true` |
| `countsForRecords` | itens à parte (antes do 19) | `kind` `activation_single`, `walkout`, `backoff`, `volume_doubles` → `false`; `kind: null` → `true` |
| `countsForRecords` | inelegíveis | `failed: true`; `loadKg` null, 0; `reps` null, 0 → `false` |
| `recordValue` | os quatro tipos | 100×5 RPE 8 → maxLoad 100; setVolume 500; oneRm 117; oneRmRpe 123,3 (rpe 8) |
| `recordValue` | volume com decimal | 22,7×3 e 34,05×2 → os dois 68,1 (arredondado a 2 casas, iguais) |
| `recordValue` | CP3: RPE não muda o 1RM | 100×5 com RPE null, 8, 10 → oneRm sempre 117 |
| `computeRecordBook` | CP1 maior peso | s1 135×3; s2 140×3 → s2 tem `maxLoad`, `previous.value` 135, `previous.date` de s1, `current` true |
| `computeRecordBook` | CP2 volume sem peso | s1 110×5; s2 100×12 → s2 tem `setVolume` (1200 > 550), não tem `maxLoad` |
| `computeRecordBook` | CP3 1RM sem peso | s1 110×3 (121); s2 100×8 (127) → s2 tem `oneRm`, não `maxLoad` |
| `computeRecordBook` | CP4 com RPE | s1 100×5 RPE 9 (119,5); s2 100×5 RPE 8 → s2 tem `oneRmRpe` 123,3; s2 sem RPE (115,9) → não tem |
| `computeRecordBook` | CP4/CP21 > 10 reps | s1 100×5; s2 100×11 → s2 tem `setVolume` e `oneRm`, nunca `oneRmRpe`; s1 só com 11 reps e s2 100×5 → s2 sem `oneRmRpe` (não havia referência) |
| `computeRecordBook` | CP5 vários tipos | s1 100×5 RPE 8; s2 110×5 RPE 8 → s2 com os 4 tipos, na ordem de `RECORD_TYPES` |
| `computeRecordBook` | CP6 empate | s1 100×5; s2 100×5 → nenhum hit; s2 100×5 RPE igual → nenhum |
| `computeRecordBook` | CP7 primeira vez | s1 100, 105, 110 ×5 → nenhum hit; `best.maxLoad` = 110 com `hasMedal` false |
| `computeRecordBook` | CP8 melhor do treino | s1 95×5; s2 100, 105, 110 ×5 → só 110 tem `maxLoad`; s2 só com 100 e 105 → só 105; s2 com 110 e 110 → a primeira |
| `computeRecordBook` | CP9 referência inelegível | s1 single 180×1 (`kind: 'activation_single'`) e 150×3 normal; s2 155×3 → s2 tem `maxLoad` com `previous` 150; série `failed` 200 em s1 → ignorada |
| `computeRecordBook` | CP9 F e D contam | s2 com `setType: 'failure'` 140×3 acima do histórico → tem hit; `dropset` idem |
| `computeRecordBook` | CP10 desmarcar | s2 105 e 110 (ambos acima); sem a linha 110 → 105 recebe `maxLoad` |
| `computeRecordBook` | CP13 recorde no momento | s1 100; s2 105; s3 110 → s2 `supersededBy.date` = data de s3, `current` false; s3 `current` true; um só `current` por tipo |
| `computeRecordBook` | CP14 ordem e importados | linhas embaralhadas, treino `extra:2026-10-20:Hevy` no meio → mesmo resultado que em ordem; dois treinos no mesmo dia ordenados pelo menor `doneAt` |
| `computeRecordBook` | CP15 cascata | s1 120; s2 115; s3 118 → nenhum hit; tirar s1 → s3 ganha `maxLoad` (previous 115) |
| `computeRecordBook` | CP20 por exercício | `outro` 100×5 em s1; `supino` 150×5 em s2 → nenhum hit (primeira vez do supino) |
| `computeRecordBook` | CP24 desempenho | 500 séries de um exercício em 100 treinos + 2.000 de outros → termina em < 200 ms no Vitest e o resultado é determinístico |
| `recordNotice` | CP1 ganhou no ✓ | antes sem a série; depois com `maxLoad`; acting [id] → `{ setId: id, types: ['maxLoad'] }` |
| `recordNotice` | CP10 medalha que volta | desmarcar 110 (acting vazio) → `null`, mesmo com 105 ganhando |
| `recordNotice` | CP15 cascata | acting = série antiga editada; ganhos só em série posterior → `null` |
| `recordNotice` | CP4b(a) RPE depois, faixa visível | antes `['maxLoad']`, depois `['maxLoad','oneRmRpe']`, `visible` da mesma série → `types` = `['maxLoad','oneRmRpe']` |
| `recordNotice` | CP4b(b) já tinha | antes e depois com `oneRmRpe` (valor sobe de 121,7 para 129,5) → `null` |
| `recordNotice` | CP4c sem duplicar | perde `oneRmRpe` (RPE 9,5) → `null`; volta (RPE 8) com `announced` contendo a chave → `null` |
| `recordNotice` | lote | acting [a, b, c], ganhos em a e c → aviso de c |
| `normalizeRecordPrefs` | padrão e regra | `null` → ligados; `{ medals: false, alerts: true }` → `alerts` false |
| `recordBannerText` | CP1/CP5 | um tipo → "Novo recorde" / "Maior peso: 140 kg · antes 135 kg" / a11y "Novo recorde. Maior peso: 140 quilos, antes 135 quilos"; três → "Novos recordes (3)" / "Maior peso · Maior volume de série · Maior 1RM com RPE" |
| `medalA11yLabel` | CP22 | `['maxLoad']` → "Recorde: maior peso. Abrir detalhes."; três tipos → "Recordes: maior peso, maior volume de série e maior 1RM com RPE. Abrir detalhes." |
| `hitCaption` | CP4d | oneRm 100×5 → "estimado, sem RPE: 100 kg × 5"; oneRmRpe RPE 8 → "calculado com RPE 8"; sem RPE → "RPE não informado: calculado como RPE 10 (esforço máximo)" |
| `hitBeforeText` / `hitBadgeText` | CP13/CP16 | "antes: 135 kg em 28 out"; "Recorde atual"; "Superado em 12 nov" (datas com `formatDate` e `now` fixo) |
| `recordSheetTitle` / `recordSetSubtitle` | CP16 | 1 hit → "Recorde"; 2+ → "Recordes desta série"; "série 3 · 140 kg × 3 · 05 nov" |
| `holderSubtitle` | CP18 | maxLoad → "05 nov · 140 kg × 3"; oneRmRpe sem RPE → "05 nov · 100 kg × 5 · estimado, RPE não informado (como RPE 10)" |
| `personalRecords` | CP18 lista = medalha | `oneRm`, `oneRmRpe`, `maxLoad`, `setVolume` iguais a `best` do livro; `hasMedal` só quando a série tem o hit; byReps e sessão ignoram série de `kind: 'backoff'` |
| `personalRecords` | sem séries | `[{ loadKg: null }]` → os quatro `null`, `bestSessionVolume` null, `byReps` [] |

Ajustar em `exercise-stats.test.ts` o caso "recordes pessoais": `maxLoad` 110 × 3 (02 nov), `oneRm` 123 (105×4 =
119; 105×5 = 122,5 → 123, 05 nov), `setVolume` 525 (105×5, 05 nov); os valores de `byReps` e de sessão não mudam.

## Rastreabilidade
| Critério (PBI) | Passos | Como é verificado |
|---|---|---|
| CP1 | 3, 4, 6, 7, 9, 10 | `records.test.ts` (maior peso, notice no ✓) + roteiro PBI passo 3 |
| CP2 | 3, 10 | `records.test.ts` (100×12 depois de 110×5) |
| CP3 | 1, 3, 11 | `epley1rm`, `recordValue` (RPE não muda) + roteiro passo 7 |
| CP4 | 1, 3, 11 | `e1rmWithAssumedRpe` (123,3 / 115,9 / 11 reps) + roteiro passo 7b |
| CP4b | 4, 7, 10 | `recordNotice` (a) e (b) + roteiro passo 7b |
| CP4c | 4, 7, 10 | `recordNotice` sem duplicar + roteiro passo 7b |
| CP4d | 4, 5, 8, 11 | `hitCaption`, `holderSubtitle` + prévia web (folha e lista) + roteiro passo 7b |
| CP5 | 3, 4, 8, 9 | `computeRecordBook` vários tipos, `recordBannerText` + prévia web + roteiro passo 7 |
| CP6 | 3 | `records.test.ts` empate + roteiro passo 2 |
| CP7 | 3 | `records.test.ts` primeira vez + roteiro passo 8 |
| CP8 | 3, 10 | `records.test.ts` melhor do treino + roteiro passo 5 |
| CP9 | 3, 9 | `countsForRecords`, referência inelegível, F/D + roteiro passo 6 |
| CP10 | 3, 4, 10 | desmarcar no livro e no notice + roteiro passos 5 e 6 |
| CP11 (depois do PBI 19) | 3 (ponto de extensão) | **pendente do PBI 19**: `RECORD_SET_TYPE_COUNTS` ganha `single: false`; teste novo "single 180 não conta; trocado para normal ganha e avisa" + roteiro passo 13 |
| CP12 (depois do PBI 19) | 3 (ponto de extensão) | **pendente do PBI 19**: `RECORD_SET_TYPE_COUNTS.backoff = true` e back-off convertido no exercício principal; teste novo no `records.test.ts` |
| CP13 | 3, 4, 8, 11 | `supersededBy`/`current`, `hitBadgeText` + roteiro passo 4 |
| CP14 | 3, 7, 11 | ordem embaralhada e importados; notice não roda sem intenção + roteiro passo 1 |
| CP15 | 3, 4, 7 | cascata no livro e no notice + editar treino antigo na prévia web |
| CP16 | 4, 8, 10, 11 | textos da folha + prévia web + roteiro passo 4 |
| CP17 | 4, 8, 10 | substituição no `recordNotice` + prévia web (5 s, deslizar, tocar no ✓ com a faixa) + roteiro passo 3 |
| CP18 | 5, 11 | `personalRecords` = `best` + roteiro passo 1 |
| CP19 | 4, 7, 8, 12 | `normalizeRecordPrefs` + prévia web + roteiro passo 9 |
| CP20 | 3 | `records.test.ts` por exercício (troca "só este treino" muda o `exerciseId` via `retagSetLogs`, então a história é a do novo) |
| CP21 | 1, 3, 5 | bordas de `countsForRecords`/`e1rmWithAssumedRpe` + `personalRecords` vazio |
| CP22 | 4, 8, 9 | `medalA11yLabel`, `recordBannerText.a11y` + prévia web com texto grande + roteiro passo 10 (VoiceOver, só iPhone) |
| CP23 | 2, 6, 13 | nada novo no backup (seção Dados) + comandos do passo 13 + roteiro passo 11 |
| CP24 | 3, 7, 13 | teste de 500 séries + medição no iPhone (passo 13) |
| CP25 (25b) | — | **pendente (25b, depois do PBI 24)**; será planejado num replanejamento deste arquivo |

## Riscos técnicos
- **Desempenho no iPhone (CP24)** — a cada `bump` a tela Hoje relê `listAllSetRows` (todos os ciclos, `JSON.parse`
  de cada ciclo) e recalcula tudo. Mitigação: o ✓ não espera nada disso (o `insertSets` + `bump` atuais seguem
  iguais); livro em `useMemo([rows])`; o anterior fica na tela durante a recarga. Se o iPhone passar de 1 s,
  próximo passo é guardar em memória os ciclos lidos por `id` dentro de `useRecordBook` (só os `set_logs` mudam a cada
  ✓) e, se ainda faltar, recalcular só os exercícios do treino aberto.
- **Memoização em cascata de render** — `recordTypesOf` como função nova a cada render re-renderiza todas as
  `SetRow`; a tabela já re-renderiza a cada `bump`, então não piora. Não usar o livro em `key` de linha (remontaria o
  campo em edição).
- **Corrida entre a intenção e o livro** — `expectRecords` antes da gravação e duas ações rápidas (✓ e RPE em
  sequência) podem chegar num único livro novo. `recordNotice` trata vários ids e a substituição; o pior caso é uma
  faixa com a união dos tipos, nunca um aviso falso (o diff é sempre contra o livro anterior realmente mostrado).
- **Faixa por cima do cabeçalho** — durante 5 s cobre o botão Iniciar/Concluir do `WorkoutHeader` (o PBI pede a
  faixa "por cima do topo"). Mitigação: deslizar dispensa; não cobre a tabela nem o cartão do descanso.
- **Largura da linha no iPhone menor com texto grande** — medalha visual de ~20 pt com `hitSlop` até 44 pt; o
  texto do plano encolhe primeiro. Conferir na prévia web com largura 320 e no iPhone com Dynamic Type grande.
- **`SetRow` com campos novos** — qualquer construtor manual de `SetRow` quebra na compilação (bom); hoje só o
  helper do teste.
- **Importados com data errada ou duplicados** criam ou apagam medalhas (risco do PBI); nada a fazer no código além
  da ordem determinística.

## Perguntas (não bloqueiam; suposições adotadas)
- **Suposições do PBI adotadas como recomendado pelo PM:** P3 (F e D contam; ✗ não), P4 (retroativo, sem aviso),
  P6 (nomes "Maior 1RM" e "Maior 1RM com RPE"), P5 fora (sem medalha apagada no single).
- **Q1 — Lista dos exercícios "à parte" fica vazia.** Como a lista segue a elegibilidade da medalha, a tela do
  exercício de "Supino back-off", "Agacho duplas de volume", "Agachamento walkout" e dos singles passa a mostrar
  "Sem séries com carga e repetições." em "Recordes pessoais" até o PBI 19 (o gráfico continua mostrando os
  pontos). É o que o PBI pede ("a lista inteira segue a mesma regra"), mas é uma perda visível para o back-off.
  Confirmar com o PM; a alternativa barata é a lista usar a elegibilidade só por tipo de série (sem a tabela por
  `kind`), e então lista e medalha discordariam nesses exercícios.
- **Q2 — RPE informado fora da tabela RTS** (abaixo de 6 ou fora de meio em meio, só por importação): adotado "sem
  valor de 1RM com RPE", como o `e1rm` atual das Análises, e não "RPE 10 assumido". O PBI 22 deve seguir o mesmo.
- **Q3 — Rótulo do gráfico** "1RM estimado" (chips da tela do exercício, `STAT_METRIC_LABEL`) não foi pedido; fica
  como está. Se o PM quiser alinhar a "Maior 1RM", é uma linha.

## Andamento
| Data | Nota |
|---|---|
| 07/11/2026 | Plano criado só para a 25a (a 25b fica para depois do PBI 24, por decisão da sessão principal). Investigação: `bestE1rm`/`e1rmSeries` ignoram série sem RPE, então a função com RPE 10 assumido é nova (`e1rmWithAssumedRpe`, para o PBI 22 reutilizar); `SetRow` não tinha id, tipo nem hora da série; `listAllSetRows` já exclui aquecimento; single/walkout/back-off/duplas têm `exerciseId` próprio no plano atual; `expo-haptics` já instalado e usado com `impactAsync(Medium)` em `DragList.tsx`; Ionicons tem `medal`. |
| 07/11/2026 | **25a implementada** (`/dev 25`). Desvios pequenos: (1) `hasLoadAndReps` ficou em `records.ts` e não em `exerciseStats.ts`, para evitar importação circular (`exerciseStats` importa `records`); (2) `RecordBanner` não recebe `seq` (o pai usa `key={seq}`); (3) em Ajustes, religar "Mostrar medalhas" religa também o aviso (`normalizeRecordPrefs` guarda `alerts` já efetivo); (4) `useRecordBook` devolve as linhas de todo o histórico e a tela do exercício filtra com `exerciseRows`. Q1 a Q3 seguem como suposições. Sensores: `npm test` (197), `npm run test:import`, `npm run typecheck` e `npx expo lint` verdes; `ios.entitlements` continua `{}`. **Simulador iOS (iPhone 18 Pro)**: o app compila e abre; a linha "S" do single não tem medalha (CP9); a lista "Recordes pessoais" mostra "Maior peso", "Maior 1RM" ("estimado, sem RPE") e o texto da medalha; o agachamento só tem um treino, então sem medalha (CP7). **Não verificado** ainda: medalha, faixa, folha de detalhes, histórico com medalha e interruptores de Ajustes (precisam de um exercício com 2 ou mais treinos), vibração, VoiceOver e CP24 no aparelho. Obs.: no simulador, uma série marcada logo depois de digitar 200 foi gravada com 150 (a causa não foi investigada; o código do ✓ não foi alterado por esta feature). |
| 07/11/2026 | **Revisão (`/revisar 25`)**. Corrigido: (1) `useRecordNotices` zerava `expected` na transição `null → id` do treino (o primeiro ✓ cria o log), o que tirava a faixa do primeiro registro de cada treino; agora só zera ao trocar de um treino para outro e a faixa guarda o treino em que apareceu (sem `setState` em efeito); (2) `expectRecords` passou a ser chamado depois da gravação, logo antes do `bump()`, em `editSet`, `setRpe`, `chooseSetType` e `saveEditor`; (3) falha ao ler o histórico agora cai em lista vazia (sem "Carregando…" eterno). Registrado: o gráfico da tela do exercício usa `hasLoadAndReps` (mostra todas as séries com carga) enquanto os recordes usam `countsForRecords`, por desenho: o gráfico é progressão, o recorde é só o que conta. `records-prefs` vai no backup porque a tabela `settings` já vai; o CP23 ("nenhum dado novo") vale para as medalhas, que não são gravadas. Sugestões não aplicadas, à espera do usuário. |
| 07/11/2026 | **Verificação no simulador iOS (iPhone 18 Pro), depois da revisão.** Vistos: faixa "Novos recordes (4)" no primeiro ✓ de um treino não iniciado, medalha com o número 4 na série, descanso sem ser coberto (CP1, CP5, CP17 em parte); folha de detalhes com os 4 tipos, valor, "antes", "Recorde atual" e "Ver recordes do exercício" (CP16); legenda "RPE não informado: calculado como RPE 10" e, depois de informar RPE 8, "calculado com RPE 8" sem faixa nova e com o Maior 1RM inalterado (CP3, CP4b, CP4d). Valores conferidos à mão (210×4: 238 kg Epley, 235,4 e 250,9 kg RTS). **Pendentes de verificação**: aba Histórico com medalhas e sem faixa (CP14), linhas tocáveis de "Recordes pessoais" (CP18), interruptores de Ajustes (CP19), faixa sumindo em 5 s e dispensa por deslize (CP17), VoiceOver e texto grande (CP22), modo avião (CP23) e desempenho no iPhone (CP24). O simulador mostra a tela com atraso de 1 a 2 capturas. |
