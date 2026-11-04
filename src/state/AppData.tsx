import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getActiveCycle, getMaxes, getSetting, maxesKey, saveCycleData, setSetting } from '../db/repo';
import { DEFAULT_BAR_KG, DEFAULT_BARS_KG, DEFAULT_PLATES_KG } from '../domain/plates';
import { DEFAULT_TARGETS, type NutritionTargets } from '../domain/nutrition';
import type { Cycle, Maxes } from '../domain/types';

export interface GymSettings {
  /** Barra padrão da calculadora. */
  barKg: number;
  /** Barras que a academia tem (a calculadora deixa escolher entre elas). */
  bars: number[];
  plates: number[];
}

const DEFAULT_GYM: GymSettings = { barKg: DEFAULT_BAR_KG, bars: DEFAULT_BARS_KG, plates: DEFAULT_PLATES_KG };

interface AppDataValue {
  cycle: Cycle | null;
  maxes: Maxes | null;
  gym: GymSettings;
  targets: NutritionTargets;
  setTargets: (t: NutritionTargets) => Promise<void>;
  /** Incrementa a cada gravação: telas usam como dependência para recarregar. */
  version: number;
  bump: () => void;
  setMaxes: (m: Maxes) => Promise<void>;
  setGym: (g: GymSettings) => Promise<void>;
  /** Grava uma versão editada do plano (ex.: sugestão aceita). */
  updateCycle: (c: Cycle) => Promise<void>;
  /** Relê tudo do banco (depois de restaurar backup ou trocar o ciclo ativo). */
  reload: () => void;
}

const Ctx = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [maxes, setMaxesState] = useState<Maxes | null>(null);
  const [gym, setGymState] = useState<GymSettings>(DEFAULT_GYM);
  const [version, setVersion] = useState(0);
  const [targets, setTargetsState] = useState<NutritionTargets>(DEFAULT_TARGETS);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      const c = await getActiveCycle(db);
      setCycle(c);
      if (c) setMaxesState(await getMaxes(db, c));
      // Ajustes gravados antes de existir a lista de barras não têm `bars`.
      setGymState({ ...DEFAULT_GYM, ...(await getSetting(db, 'gym', DEFAULT_GYM)) });
      setTargetsState({ ...DEFAULT_TARGETS, ...(await getSetting(db, 'nutritionTargets', DEFAULT_TARGETS)) });
    })();
  }, [db, reloadKey]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const setMaxes = useCallback(
    async (m: Maxes) => {
      if (!cycle) return;
      await setSetting(db, maxesKey(cycle.id), m);
      setMaxesState(m);
    },
    [db, cycle],
  );

  const setGym = useCallback(
    async (g: GymSettings) => {
      await setSetting(db, 'gym', g);
      setGymState(g);
    },
    [db],
  );

  const setTargets = useCallback(
    async (tg: NutritionTargets) => {
      await setSetting(db, 'nutritionTargets', tg);
      setTargetsState(tg);
    },
    [db],
  );

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
    setVersion((v) => v + 1);
  }, []);

  const updateCycle = useCallback(
    async (c: Cycle) => {
      await saveCycleData(db, c);
      setCycle(c);
      setVersion((v) => v + 1);
    },
    [db],
  );

  return (
    <Ctx.Provider value={{ cycle, maxes, gym, targets, setTargets, version, bump, setMaxes, setGym, updateCycle, reload }}>{children}</Ctx.Provider>
  );
}

export function useAppData(): AppDataValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData fora do AppDataProvider');
  return v;
}
