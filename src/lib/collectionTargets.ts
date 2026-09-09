import { CollectionData, CollectionEntry, PokemonTarget } from '@models/collection';

export const DEFAULT_TARGET: PokemonTarget = { normal: 1, fullArt: 1 };

export function isValidTarget(target: unknown): target is PokemonTarget {
  if (typeof target !== 'object' || target === null) return false;

  const { normal, fullArt } = target as Record<string, unknown>;

  return Number.isInteger(normal) && (normal as number) >= 0 && Number.isInteger(fullArt) && (fullArt as number) >= 0;
}

export function isValidTargetOverrides(overrides: unknown): overrides is Record<string, PokemonTarget> {
  return typeof overrides === 'object' && overrides !== null && Object.values(overrides).every(isValidTarget);
}

export function getEffectiveTarget(collection: Pick<CollectionData, 'defaultTarget' | 'targetOverrides'>, pokemonId: number | string): PokemonTarget {
  return collection.targetOverrides?.[pokemonId.toString()] ?? collection.defaultTarget;
}

export function getOwnedCount(entry: CollectionEntry | undefined): number {
  if (!entry) return 0;

  return entry.ownedCount ?? (entry.owned ? 1 : 0);
}

export function getFullArtCount(entry: CollectionEntry | undefined): number {
  if (!entry) return 0;

  return entry.fullArtCount ?? (entry.fullArt ? 1 : 0);
}
