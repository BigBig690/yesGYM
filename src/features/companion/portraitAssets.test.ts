import { describe, expect, it } from 'vitest';
import { COMPANION_CHARACTERS } from '../../domain/companionCatalog';
import { getBundledCompanionPortraitPath, resolveCompanionPortrait } from './portraitAssets';

describe('local companion portrait assets', () => {
  it('maps only real Vite-bundled local files to the matching character and leaves absent files unresolved', () => {
    expect(COMPANION_CHARACTERS).toHaveLength(9);
    expect(COMPANION_CHARACTERS.map((character) => character.id)).toEqual([
      'ichika-nakano', 'nino-nakano', 'miku-nakano', 'yotsuba-nakano', 'itsuki-nakano',
      'marin-kitagawa', 'wakana-gojo', 'kaoruko-waguri', 'rintaro-tsumugi',
    ]);
    const mappedPaths = new Set<string>();
    for (const character of COMPANION_CHARACTERS) {
      const asset = resolveCompanionPortrait(character.id);
      const path = getBundledCompanionPortraitPath(character.id);
      expect(asset).toBeTruthy();
      expect(path).toBe(`../../assets/companions/${character.id}.png`);
      mappedPaths.add(path!);
    }
    expect(mappedPaths.size).toBe(9);
  });

  it('resolves the legacy Miku id to the Miku asset slot', () => {
    expect(resolveCompanionPortrait('miku')).toBe(resolveCompanionPortrait('miku-nakano'));
    expect(getBundledCompanionPortraitPath('miku')).toBe(getBundledCompanionPortraitPath('miku-nakano'));
  });
});
