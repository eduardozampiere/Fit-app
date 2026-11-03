import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getActiveCycle, getMaxes, getSetting, maxesKey, setSetting } from '../db/repo';
import { DEFAULT_BAR_KG, DEFAULT_PLATES_KG } from '../domain/plates';
import type { Cycle, Maxes } from '../domain/types';

export interface GymSettings {
  barKg: number;
  plates: number[];
}

const DEFAULT_GYM: GymSettings = { barKg: DEFAULT_BAR_KG, plates: DEFAULT_PLATES_KG };

interface AppDataValue {
  cycle: Cycle | null;
  maxes: Maxes | null;
  gym: GymSettings;
  /** Incrementa a cada gravação: telas usam como dependência para recarregar. */
  version: number;
  bump: () => void;
  setMaxes: (m: Maxes) => Promise<void>;
  setGym: (g: GymSettings) => Promise<void>;
}

const Ctx = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [maxes, setMaxesState] = useState<Maxes | null>(null);
  const [gym, setGymState] = useState<GymSettings>(DEFAULT_GYM);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    (async () => {
      const c = await getActiveCycle(db);
      setCycle(c);
      if (c) setMaxesState(await getMaxes(db, c));
      setGymState(await getSetting(db, 'gym', DEFAULT_GYM));
    })();
  }, [db]);

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

  return <Ctx.Provider value={{ cycle, maxes, gym, version, bump, setMaxes, setGym }}>{children}</Ctx.Provider>;
}

export function useAppData(): AppDataValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData fora do AppDataProvider');
  return v;
}
