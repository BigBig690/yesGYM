import { getCompanionCharacter } from '../../domain/companionCatalog';

/* Vite only returns URLs for files that actually exist in this local assets folder. */
const bundledPortraitFiles = import.meta.glob<string>('../../assets/companions/*.{avif,jpg,jpeg,png,svg,webp}', {
  eager: true,
  import: 'default',
  query: '?url',
});

const extensions = ['avif', 'webp', 'png', 'jpg', 'jpeg', 'svg'] as const;

/** A missing import resolves to null; a path string alone can never mark an asset as present. */
export function resolveCompanionPortrait(characterId: string): string | null {
  return findBundledPortrait(characterId)?.url ?? null;
}

/** Exposes the resolved local module path for diagnostics and tests; null means the file is absent. */
export function getBundledCompanionPortraitPath(characterId: string): string | null {
  return findBundledPortrait(characterId)?.path ?? null;
}

function findBundledPortrait(characterId: string): { path: string; url: string } | null {
  const canonicalId = getCompanionCharacter(characterId).id;
  for (const extension of extensions) {
    const path = `../../assets/companions/${canonicalId}.${extension}`;
    const bundledUrl = bundledPortraitFiles[path];
    if (typeof bundledUrl === 'string' && bundledUrl.length > 0) return { path, url: bundledUrl };
  }
  return null;
}
