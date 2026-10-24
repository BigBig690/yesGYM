import { describe, expect, it } from 'vitest';
import { getCompanionNarrative, getNarrative } from './narrative';

describe('getNarrative', () => {
  it('returns a line for every context and is stable within the day', () => {
    const date = new Date('2026-10-22T08:00:00.000Z');
    expect(getNarrative('opening', date)).toBe(getNarrative('opening', new Date('2026-10-22T22:00:00.000Z')));
    expect(getNarrative('workout-start', date)).not.toBe('');
  });

  it('changes tone deterministically without claiming unobserved events', () => {
    const date = new Date('2026-10-22T08:00:00.000Z');
    expect(getNarrative('opening', date, 'playful')).not.toBe(getNarrative('opening', date, 'calm'));
    expect(getNarrative('opening', date, 'calm')).not.toMatch(/recorde|conquista|treino concluído/i);
    expect(getNarrative('return', date, 'calm')).not.toMatch(/vitória desbloqueada|recorde superado/i);
  });

  it('varies companion lines by personality and real journey context consistently', () => {
    const date = new Date('2026-10-22T08:00:00.000Z');
    expect(getCompanionNarrative('enthusiast', date, 'recovery')).toMatch(/Pausa merecida|Recuperação/);
    expect(getCompanionNarrative('friendly-rival', date, 'return')).toMatch(/De volta|respeito/);
    expect(getCompanionNarrative('strategist', date, 'opening')).toBe(getCompanionNarrative('strategist', new Date('2026-10-22T22:00:00.000Z'), 'opening'));
  });
});
