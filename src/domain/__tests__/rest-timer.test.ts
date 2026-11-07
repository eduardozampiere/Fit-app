import { describe, expect, it } from 'vitest';
import { remainingSeconds, restoreTimer } from '../restTimer';

describe('timer de descanso', () => {
  it('segundos restantes arredondam para cima e não ficam negativos', () => {
    expect(remainingSeconds(10_000, 0)).toBe(10);
    expect(remainingSeconds(10_001, 0)).toBe(11);
    expect(remainingSeconds(5_000, 9_000)).toBe(0);
  });

  it('restaura só o que ainda não acabou', () => {
    expect(restoreTimer({ endAt: 100_000, totalSec: 180, label: 'Supino' }, 40_000)).toEqual({ endAt: 100_000, totalSec: 180, label: 'Supino' });
    expect(restoreTimer({ endAt: 100_000, totalSec: 180, label: 'Supino' }, 100_000)).toBeNull();
    expect(restoreTimer({ endAt: 100_000, totalSec: 180, label: 'Supino' }, 200_000)).toBeNull();
  });

  it('valor ausente ou mal formado vira null; total e rótulo ausentes ganham padrão', () => {
    expect(restoreTimer(null, 0)).toBeNull();
    expect(restoreTimer('x', 0)).toBeNull();
    expect(restoreTimer({ endAt: 'logo' }, 0)).toBeNull();
    expect(restoreTimer({ endAt: Number.NaN }, 0)).toBeNull();
    expect(restoreTimer({ endAt: 90_000 }, 30_000)).toEqual({ endAt: 90_000, totalSec: 60, label: null });
  });
});
