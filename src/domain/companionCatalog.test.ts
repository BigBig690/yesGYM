import { describe, expect, it } from 'vitest';
import { COMPANION_CHARACTERS, getCompanionCharacter, getCompanionMessage, normalizeRemovedCompanionSelection } from './companionCatalog';

describe('companion context dialogue', () => {
  it('keeps exactly the nine confirmed romance-series characters and original lines for every context', () => {
    expect(COMPANION_CHARACTERS.map((character) => character.name)).toEqual([
      'Ichika Nakano', 'Nino Nakano', 'Miku Nakano', 'Yotsuba Nakano', 'Itsuki Nakano',
      'Marin Kitagawa', 'Wakana Gojo', 'Kaoruko Waguri', 'Rintaro Tsumugi',
    ]);
    for (const character of COMPANION_CHARACTERS) {
      for (const [context, lines] of Object.entries(character.messages)) {
        expect(lines, `${character.id} / ${context}`).toHaveLength(4);
        expect(lines.every((line) => line.trim().length > 0)).toBe(true);
      }
    }
  });

  it('keeps a context message stable for the same local day and uses canonical characters for legacy ids', () => {
    const date = new Date('2026-10-23T12:00:00');
    expect(getCompanionCharacter('miku').id).toBe('miku-nakano');
    expect(getCompanionMessage('miku', 'achievement', date)).toBe(getCompanionMessage('miku-nakano', 'achievement', date));
  });

  it('falls back to Yotsuba for removed action-character selections without losing other companion preferences', () => {
    for (const characterId of ['naruto-uzumaki', 'tanjiro-kamado', 'monkey-d-luffy']) {
      expect(getCompanionCharacter(characterId).id).toBe('yotsuba-nakano');
      expect(normalizeRemovedCompanionSelection({ characterId, displayName: 'Old selection', personality: 'strategist', personalityName: 'Quiet coach' }))
        .toEqual({ characterId: 'yotsuba-nakano', displayName: 'Yotsuba Nakano', personality: 'strategist', personalityName: 'Quiet coach' });
    }
    expect(normalizeRemovedCompanionSelection({ characterId: 'miku-nakano', displayName: 'Miku Nakano' }))
      .toEqual({ characterId: 'miku-nakano', displayName: 'Miku Nakano' });
  });
});
