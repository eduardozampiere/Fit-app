import { useEffect, useState } from 'react';
import { formatElapsed, formatNumber } from '../domain/format';
import type { SessionStats } from '../domain/logging';
import { StatRow } from './ui';

/** Tempo · Volume · Séries no topo do treino. O tempo corre enquanto o treino está aberto. */
export function WorkoutStats({ stats, plannedSets, running }: { stats: SessionStats; plannedSets: number; running: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running || !stats.startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [running, stats.startedAt]);

  const elapsed = stats.startedAt ? (now - Date.parse(stats.startedAt)) / 1000 : null;
  return (
    <StatRow
      items={[
        { label: 'Tempo', value: elapsed !== null ? formatElapsed(elapsed) : '—', accent: running && elapsed !== null },
        { label: 'Volume', value: `${formatNumber(stats.volumeKg, 0)} kg` },
        { label: 'Séries', value: `${stats.sets}/${plannedSets}` },
      ]}
    />
  );
}
