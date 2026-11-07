import { useEffect, useState } from 'react';
import { formatNumber, formatWorkoutTime } from '../domain/format';
import type { SessionStats } from '../domain/logging';
import { workoutDurationSec } from '../domain/workout';
import { StatRow } from './ui';

/** Duração · Volume · Séries. A duração corre (de segundo em segundo) enquanto o treino está aberto. */
export function WorkoutStats({
  stats,
  plannedSets,
  running,
  startedAt,
  endedAt,
}: {
  stats: SessionStats;
  plannedSets: number;
  running: boolean;
  /** início e fim do treino (do registro); sem início, a duração fica em "—" */
  startedAt: string | null;
  endedAt: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running || !startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running, startedAt]);

  const elapsed = workoutDurationSec({ startedAt, endedAt }, now);
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
