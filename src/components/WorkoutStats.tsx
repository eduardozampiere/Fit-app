import { useEffect, useState } from 'react';
import { formatNumber, formatWorkoutTime } from '../domain/format';
import type { SessionStats } from '../domain/logging';
import { StatRow } from './ui';

/** Duração · Volume · Séries. A duração corre (de segundo em segundo) enquanto o treino está aberto. */
export function WorkoutStats({ stats, plannedSets, running }: { stats: SessionStats; plannedSets: number; running: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running || !stats.startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running, stats.startedAt]);

  const elapsed = stats.startedAt ? (now - Date.parse(stats.startedAt)) / 1000 : null;
  return (
    <StatRow
      items={[
        { label: 'Duração', value: elapsed !== null ? formatWorkoutTime(elapsed) : '—', accent: running && elapsed !== null },
        { label: 'Volume', value: `${formatNumber(stats.volumeKg, 0)} kg` },
        { label: 'Séries', value: `${stats.sets}/${plannedSets}` },
      ]}
    />
  );
}
