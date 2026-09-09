'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CollectionData, CollectionEntries, CollectionEntry, CollectionType, PokemonTarget } from '@models/collection';
import { MAX_POKEMON_ID, MIN_POKEMON_ID } from '@hooks/useApi';
import { DEFAULT_TARGET, getEffectiveTarget, getFullArtCount, getOwnedCount } from '@lib/collectionTargets';

const EMPTY_ENTRY: CollectionEntry = { owned: false, fullArt: false };
const ACTIVE_COLLECTION_STORAGE_KEY = 'pokedex:activeCollectionId';

type CollectionStatus = 'loading' | 'needsSelection' | 'ready';

interface NewCollectionNotice {
  id: string;
  migrated: boolean;
}

interface CollectionContextValue {
  status: CollectionStatus;
  collectionId: string | null;
  collectionType: CollectionType | null;
  pokemonIds: number[] | null;
  defaultTarget: PokemonTarget;
  targetOverrides: Record<string, PokemonTarget>;
  newCollectionNotice: NewCollectionNotice | null;
  getEntry: (id: number | string) => CollectionEntry;
  getTarget: (id: number | string) => PokemonTarget;
  getOwnedQuantity: (id: number | string) => number;
  getFullArtQuantity: (id: number | string) => number;
  setOwnedQuantity: (id: number | string, quantity: number) => void;
  setFullArtQuantity: (id: number | string, quantity: number) => void;
  toggleOwned: (id: number | string) => void;
  ownedCount: number;
  fullArtCount: number;
  totalCount: number;
  createCollection: (type: CollectionType, pokemonIds?: number[]) => Promise<string>;
  loadCollection: (id: string) => Promise<void>;
  updateCustomList: (pokemonIds: number[], defaultTarget?: PokemonTarget, targetOverrides?: Record<string, PokemonTarget>) => Promise<void>;
  updateTargets: (defaultTarget?: PokemonTarget, targetOverrides?: Record<string, PokemonTarget>) => Promise<void>;
  switchCollection: () => void;
  acknowledgeNewCollectionNotice: () => void;
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<CollectionStatus>('loading');
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [collectionType, setCollectionType] = useState<CollectionType | null>(null);
  const [pokemonIds, setPokemonIds] = useState<number[] | null>(null);
  const [defaultTarget, setDefaultTarget] = useState<PokemonTarget>(DEFAULT_TARGET);
  const [targetOverrides, setTargetOverrides] = useState<Record<string, PokemonTarget>>({});
  const [entries, setEntries] = useState<CollectionEntries>({});
  const [newCollectionNotice, setNewCollectionNotice] = useState<NewCollectionNotice | null>(null);

  const activate = (data: CollectionData & { id: string }) => {
    setCollectionId(data.id);
    setCollectionType(data.type);
    setPokemonIds(data.pokemonIds ?? null);
    setDefaultTarget(data.defaultTarget ?? DEFAULT_TARGET);
    setTargetOverrides(data.targetOverrides ?? {});
    setEntries(data.entries);
    setStatus('ready');
  };

  useEffect(() => {
    const storedId = localStorage.getItem(ACTIVE_COLLECTION_STORAGE_KEY);

    const tryMigrateOrSelect = () => {
      fetch('/api/collections/migrate-legacy', { method: 'POST' })
        .then((response) => response.json())
        .then(({ id }: { id: string | null }) => {
          if (!id) {
            setStatus('needsSelection');
            return;
          }

          return fetch(`/api/collections/${id}`)
            .then((response) => response.json())
            .then((data: CollectionData & { id: string }) => {
              localStorage.setItem(ACTIVE_COLLECTION_STORAGE_KEY, id);
              activate(data);
              setNewCollectionNotice({ id, migrated: true });
            });
        })
        .catch(() => setStatus('needsSelection'));
    };

    if (!storedId) {
      tryMigrateOrSelect();
      return;
    }

    fetch(`/api/collections/${storedId}`)
      .then((response) => {
        if (!response.ok) throw new Error('Collection not found');
        return response.json();
      })
      .then((data: CollectionData & { id: string }) => activate(data))
      .catch(() => {
        localStorage.removeItem(ACTIVE_COLLECTION_STORAGE_KEY);
        tryMigrateOrSelect();
      });
  }, []);

  const updateEntry = (id: number | string, patch: Partial<CollectionEntry>) => {
    if (!collectionId) return;

    const key = id.toString();
    const current = entries[key] || EMPTY_ENTRY;
    const updated = { ...current, ...patch };

    setEntries((prev) => ({ ...prev, [key]: updated }));

    fetch(`/api/collections/${collectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pokemonId: key, ...patch }),
    }).catch(() => {
      setEntries((prev) => ({ ...prev, [key]: current }));
    });
  };

  const getEntry = (id: number | string): CollectionEntry => {
    return entries[id.toString()] || EMPTY_ENTRY;
  };

  const getTarget = (id: number | string): PokemonTarget => {
    return getEffectiveTarget({ defaultTarget, targetOverrides }, id);
  };

  const getOwnedQuantity = (id: number | string): number => getOwnedCount(getEntry(id));
  const getFullArtQuantity = (id: number | string): number => getFullArtCount(getEntry(id));

  const setOwnedQuantity = (id: number | string, quantity: number) => {
    updateEntry(id, { ownedCount: Math.max(0, quantity) });
  };

  const setFullArtQuantity = (id: number | string, quantity: number) => {
    updateEntry(id, { fullArtCount: Math.max(0, quantity) });
  };

  const toggleOwned = (id: number | string) => {
    updateEntry(id, { owned: !getEntry(id).owned });
  };

  const scopedPokemonIds = collectionType === 'custom' && pokemonIds
    ? pokemonIds
    : Array.from({ length: MAX_POKEMON_ID - MIN_POKEMON_ID + 1 }, (_, i) => i + MIN_POKEMON_ID);

  const ownedCount = scopedPokemonIds.filter((id) => {
    const target = getTarget(id);
    return target.normal > 0 && getOwnedQuantity(id) >= target.normal;
  }).length;

  const fullArtCount = scopedPokemonIds.filter((id) => {
    const target = getTarget(id);
    return target.fullArt > 0 && getFullArtQuantity(id) >= target.fullArt;
  }).length;

  const totalCount = scopedPokemonIds.length;

  const createCollection = async (type: CollectionType, ids?: number[]): Promise<string> => {
    const response = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, pokemonIds: ids }),
    });

    if (!response.ok) {
      throw new Error('Failed to create collection');
    }

    const data = (await response.json()) as CollectionData & { id: string };

    localStorage.setItem(ACTIVE_COLLECTION_STORAGE_KEY, data.id);
    activate(data);
    setNewCollectionNotice({ id: data.id, migrated: false });

    return data.id;
  };

  const loadCollection = async (id: string): Promise<void> => {
    const response = await fetch(`/api/collections/${id}`);

    if (!response.ok) {
      throw new Error('Collection not found');
    }

    const data = (await response.json()) as CollectionData & { id: string };

    localStorage.setItem(ACTIVE_COLLECTION_STORAGE_KEY, data.id);
    activate(data);
  };

  const updateCustomList = async (ids: number[], newDefaultTarget?: PokemonTarget, overrides?: Record<string, PokemonTarget>): Promise<void> => {
    if (!collectionId) return;

    const response = await fetch(`/api/collections/${collectionId}/pokemon`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pokemonIds: ids, defaultTarget: newDefaultTarget, targetOverrides: overrides }),
    });

    if (!response.ok) {
      throw new Error('Failed to update collection pokemon list');
    }

    const data = (await response.json()) as CollectionData & { id: string };

    setPokemonIds(data.pokemonIds ?? null);
    setDefaultTarget(data.defaultTarget ?? DEFAULT_TARGET);
    setTargetOverrides(data.targetOverrides ?? {});
  };

  const updateTargets = async (newDefaultTarget?: PokemonTarget, overrides?: Record<string, PokemonTarget>): Promise<void> => {
    if (!collectionId) return;

    const response = await fetch(`/api/collections/${collectionId}/targets`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultTarget: newDefaultTarget, targetOverrides: overrides }),
    });

    if (!response.ok) {
      throw new Error('Failed to update collection targets');
    }

    const data = (await response.json()) as CollectionData & { id: string };

    setDefaultTarget(data.defaultTarget ?? DEFAULT_TARGET);
    setTargetOverrides(data.targetOverrides ?? {});
  };

  const switchCollection = () => {
    localStorage.removeItem(ACTIVE_COLLECTION_STORAGE_KEY);
    setCollectionId(null);
    setCollectionType(null);
    setPokemonIds(null);
    setDefaultTarget(DEFAULT_TARGET);
    setTargetOverrides({});
    setEntries({});
    setStatus('needsSelection');
  };

  const acknowledgeNewCollectionNotice = () => {
    setNewCollectionNotice(null);
  };

  return (
    <CollectionContext.Provider
      value={{
        status,
        collectionId,
        collectionType,
        pokemonIds,
        defaultTarget,
        targetOverrides,
        newCollectionNotice,
        getEntry,
        getTarget,
        getOwnedQuantity,
        getFullArtQuantity,
        setOwnedQuantity,
        setFullArtQuantity,
        toggleOwned,
        ownedCount,
        fullArtCount,
        totalCount,
        createCollection,
        loadCollection,
        updateCustomList,
        updateTargets,
        switchCollection,
        acknowledgeNewCollectionNotice,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection(): CollectionContextValue {
  const context = useContext(CollectionContext);

  if (!context) {
    throw new Error('useCollection must be used within a CollectionProvider');
  }

  return context;
}
