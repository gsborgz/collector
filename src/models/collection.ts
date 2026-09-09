export interface PokemonTarget {
  normal: number;
  fullArt: number;
}

export interface CollectionEntry {
  owned: boolean;
  fullArt: boolean;
  ownedCount?: number;
  fullArtCount?: number;
}

export type CollectionEntries = Record<string, CollectionEntry>;

export type CollectionType = 'pokedex' | 'custom';

export interface CollectionData {
  type: CollectionType;
  pokemonIds?: number[];
  defaultTarget: PokemonTarget;
  targetOverrides?: Record<string, PokemonTarget>;
  entries: CollectionEntries;
}

export type CollectionFilterOption = 'notOwned' | 'owned' | 'fullArt';
